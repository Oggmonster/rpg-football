import { CardCatalog } from "./cards/CardCatalog";
import { CardResolver, type CardInput } from "./cards/CardResolver";
import { ATTACK_DECK_CONSTRAINTS, DEFENSE_DECK_CONSTRAINTS } from "./cards/DeckConstraints";
import type { CardDef } from "./cards/types";
import { validateDeck } from "./cards/validators/DeckValidator";
import { DECK_SIZE, HAND_SIZE, SQUAD_SIZE } from "./config/MatchConfig";
import {
  GOAL_LINE_LEFT_X,
  GOAL_LINE_RIGHT_X,
  PENALTY_BOX_BOTTOM,
  PENALTY_BOX_TOP,
  PITCH_CENTER_Y,
  PITCH_BOTTOM,
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
} from "./config/PitchConfig";
import { compactStateFrame, type SimDebugFrame, type SimDebugLog } from "./debug/SimDebugLog";
import type { SimEvent } from "./events/SimEvent";
import { RNG } from "./math/RNG";
import { shuffleInPlace } from "./math/shuffle";
import { createInitialMatchState } from "./state/createInitialMatchState";
import { serializeMatchState } from "./state/serializeMatchState";
import type {
  DeckKind,
  DeckState,
  HandState,
  IntentState,
  MatchState,
  PlayerRole,
  PlayerStats,
  TeamCommandType,
  TeamId,
  Vec2,
} from "./state/MatchState";
import { AISystem } from "./systems/AISystem";
import { BallSystem } from "./systems/BallSystem";
import { InterceptSystem } from "./systems/InterceptSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { PassSystem } from "./systems/PassSystem";
import { TackleSystem } from "./systems/TackleSystem";
import { getTeamCommandDef } from "./teamCommands/TeamCommandCatalog";

type CatalogJson = { cards: CardDef[] };

export interface SquadPlayerConfig {
  id: string;
  role: PlayerRole;
  stats: PlayerStats;
}

export type CardUiStatus = "READY" | "COOLDOWN" | "LOCKOUT" | "CONTEXT" | "PHASE" | "RESTART";

export interface CardUiMeta {
  status: CardUiStatus;
  playable: boolean;
  cooldownMs: number;
  reason: string;
}

export interface MatchEventModifiers {
  cooldownMultiplier: number;
  momentumMultiplier: number;
  passBonus: number;
  shotBonus: number;
  dribbleBonus: number;
}

export class MatchSim {
  private state: MatchState;
  private resolver: CardResolver;
  private ballSystem: BallSystem;
  private aiSystem: AISystem;
  private passSystem: PassSystem;
  private interceptSystem: InterceptSystem;
  private movementSystem: MovementSystem;
  private tackleSystem: TackleSystem;
  private eventQueue: SimEvent[] = [];
  private playerTeam: TeamId = "HOME";
  private rng: RNG;
  private attackCatalogIds: string[];
  private defenseCatalogIds: string[];
  private eventModifiers: MatchEventModifiers;

  private debugFrames: SimDebugFrame[] = [];
  private tickCount = 0;
  private maxDebugFrames = 5000;
  private lastActionMessage = "";
  private lastCardDebugLine = "card: - -> - -> idle";

  constructor(state: MatchState, attackCatalog: CardCatalog, defenseCatalog: CardCatalog, eventModifiers?: MatchEventModifiers) {
    this.state = state;
    this.resolver = new CardResolver(attackCatalog, defenseCatalog);
    this.rng = new RNG(state.rngSeed ^ 0x73f3);
    this.ballSystem = new BallSystem(state.rngSeed);
    this.aiSystem = new AISystem();
    this.passSystem = new PassSystem();
    this.interceptSystem = new InterceptSystem();
    this.movementSystem = new MovementSystem();
    this.tackleSystem = new TackleSystem(state.rngSeed);
    this.attackCatalogIds = attackCatalog.ids().slice(0, DECK_SIZE);
    this.defenseCatalogIds = defenseCatalog.ids().slice(0, DECK_SIZE);
    this.eventModifiers = eventModifiers ?? {
      cooldownMultiplier: 1,
      momentumMultiplier: 1,
      passBonus: 0,
      shotBonus: 0,
      dribbleBonus: 0,
    };
  }

  static createFromCatalogs(args: {
    attackCatalog: CatalogJson;
    defenseCatalog: CatalogJson;
    rngSeed: number;
    homeSquad?: SquadPlayerConfig[];
    homeTeamCommands?: TeamCommandType[];
    awayTeamCommands?: TeamCommandType[];
    eventModifiers?: MatchEventModifiers;
  }): MatchSim {
    const attackErrors = validateDeck(args.attackCatalog.cards, ATTACK_DECK_CONSTRAINTS);
    if (attackErrors.length > 0) {
      throw new Error(`Invalid attack deck: ${attackErrors.join(" ")}`);
    }

    const defenseErrors = validateDeck(args.defenseCatalog.cards, DEFENSE_DECK_CONSTRAINTS);
    if (defenseErrors.length > 0) {
      throw new Error(`Invalid defense deck: ${defenseErrors.join(" ")}`);
    }

    const attack = new CardCatalog(args.attackCatalog.cards);
    const defense = new CardCatalog(args.defenseCatalog.cards);

    const attackDeckIds = attack.ids().slice(0, DECK_SIZE);
    const defenseDeckIds = defense.ids().slice(0, DECK_SIZE);

    const rng = new RNG(args.rngSeed);
    shuffleInPlace(attackDeckIds, rng);
    shuffleInPlace(defenseDeckIds, rng);

    const teamSize = args.homeSquad?.length === SQUAD_SIZE ? SQUAD_SIZE : undefined;

    const state = createInitialMatchState({
      rngSeed: args.rngSeed,
      teamSize,
      homeDecks: { attack: attackDeckIds, defense: defenseDeckIds },
      awayDecks: { attack: attackDeckIds, defense: defenseDeckIds },
      homeTeamCommands: args.homeTeamCommands,
      awayTeamCommands: args.awayTeamCommands,
    });

    if (args.homeSquad && args.homeSquad.length === state.teamSize) {
      MatchSim.applyHomeSquad(state, args.homeSquad);
    }

    const sim = new MatchSim(state, attack, defense, args.eventModifiers);

    sim.drawUpTo(state.teams.HOME.deckAttack, state.teams.HOME.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.HOME.deckDefense, state.teams.HOME.handDefense, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckAttack, state.teams.AWAY.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckDefense, state.teams.AWAY.handDefense, HAND_SIZE);

    return sim;
  }

  step(dtMs: number) {
    const stepEvents: SimEvent[] = [];
    const prevPossession = this.state.possession.team;
    const halftimeAtMs = Math.floor(this.state.durationMs / 2);

    this.state.timeMs = Math.min(this.state.timeMs + dtMs, this.state.durationMs);
    if (this.state.phase === "KICKOFF" && this.state.timeMs > 0) {
      this.state.phase = "LIVE";
    }
    if (
      this.state.phase === "LIVE" &&
      !this.state.flow.halftimeTaken &&
      this.state.timeMs >= halftimeAtMs &&
      this.state.timeMs < this.state.durationMs
    ) {
      this.state.phase = "HALFTIME";
      this.state.flow.halftimeTaken = true;
      this.state.flow.halftimeMsRemaining = 2000;
      this.recoverStaminaAtHalf();
      this.clearAllIntents();
      this.recordDebugFrame(stepEvents);
      return;
    }
    if (this.state.timeMs >= this.state.durationMs) {
      this.state.phase = "ENDED";
    }

    if (this.state.phase === "ENDED") {
      this.recordDebugFrame(stepEvents);
      return;
    }

    if (this.state.phase === "HALFTIME") {
      this.state.flow.halftimeMsRemaining = Math.max(0, this.state.flow.halftimeMsRemaining - dtMs);
      if (this.state.flow.halftimeMsRemaining === 0) {
        this.forceKickoff("AWAY");
        this.state.phase = "LIVE";
      }
      this.recordDebugFrame(stepEvents);
      return;
    }

    if (this.state.flow.goalResetMsRemaining > 0) {
      this.state.flow.goalResetMsRemaining = Math.max(0, this.state.flow.goalResetMsRemaining - dtMs);
      if (this.state.flow.goalResetMsRemaining === 0 && this.state.flow.restartTeam) {
        this.ballSystem.resetForKickoff(this.state, this.state.flow.restartTeam);
        this.state.possession.team = this.state.flow.restartTeam;
        this.state.possession.lastTouchTeam = this.state.flow.restartTeam;
        this.state.flow.restartTeam = null;
      }
      this.recordDebugFrame(stepEvents);
      return;
    }

    for (const team of Object.values(this.state.teams)) {
      team.lockoutMs = Math.max(0, team.lockoutMs - dtMs);
      for (const [id, cd] of Object.entries(team.cooldowns)) {
        team.cooldowns[id] = Math.max(0, cd - dtMs);
      }
      if (team.activeCommand) {
        team.activeCommand.remainingMs = Math.max(0, team.activeCommand.remainingMs - dtMs);
        if (team.activeCommand.remainingMs === 0) {
          this.emit(
            {
              type: "team_command_expired",
              atMs: this.state.timeMs,
              team: team.id,
              command: team.activeCommand.type,
            },
            stepEvents
          );
          team.activeCommand = null;
        }
      }
    }
    for (const p of Object.values(this.state.players)) {
      p.runCooldownMs = Math.max(0, p.runCooldownMs - dtMs);
    }

    this.expireIntents();

    this.aiSystem.step(this.state, this.ballSystem, this.passSystem, this.playerTeam);
    this.interceptSystem.step(this.state);
    this.movementSystem.step(this.state, dtMs);
    this.tackleSystem.step(this.state, dtMs, this.ballSystem);

    const transitions = this.ballSystem.step(this.state, dtMs);
    for (const t of transitions) {
      this.emit(
        {
          type: "ball_transition",
          atMs: this.state.timeMs,
          from: t.from,
          to: t.to,
          reason: t.reason,
        },
        stepEvents
      );

      if (t.to === "GOAL") {
        const scoringTeam = this.state.ball.lastTouchTeam;
        this.state.flow.goalResetMsRemaining = 1500;
        this.state.flow.restartTeam = scoringTeam === "HOME" ? "AWAY" : "HOME";
        this.adjustMomentum(scoringTeam, 0.22, "goal_scored", stepEvents);
        this.emit(
          {
            type: "goal_scored",
            atMs: this.state.timeMs,
            team: scoringTeam,
            home: this.state.score.HOME,
            away: this.state.score.AWAY,
          },
          stepEvents
        );
      }

      if (t.to === "CARRIED" && t.reason === "receiver_control" && this.state.ball.carrierId) {
        const receiver = this.state.players[this.state.ball.carrierId];
        if (this.isInOppPenaltyArea(receiver.pos, receiver.teamId) && receiver.stats.sho >= 52) {
          const team = receiver.teamId;
          this.assignCarrierIntent(team, {
            type: "SHOOT_TO_DIRECTION",
            targetPos: this.getShotTarget(team),
            expiresAtMs: this.state.timeMs + 350,
            priority: 97,
          });
          this.ballSystem.shootTo(this.state, this.getShotTarget(team));
        }
      }
    }

    if (prevPossession !== this.state.possession.team && this.state.possession.team !== "NEUTRAL") {
      const winner = this.state.possession.team;
      const active = this.state.teams[winner].activeCommand;
      if (active?.type === "FAST_COUNTER" && this.state.ball.state === "CARRIED") {
        this.adjustMomentum(winner, 0.02, "fast_counter_trigger", stepEvents);
        this.ballSystem.grantCarrierProtection(this.state, 320);
      }
      this.adjustMomentum(this.state.possession.team, 0.025, "possession_won", stepEvents);
      this.emit(
        {
          type: "possession_changed",
          atMs: this.state.timeMs,
          team: this.state.possession.team,
          deck: this.getActiveDeckKind(),
        },
        stepEvents
      );
    }

    this.recordDebugFrame(stepEvents);
  }

  forceGoal(team: TeamId) {
    this.state.score[team] += 1;
    this.state.ball.state = "GOAL";
    this.state.ball.carrierId = null;
    this.state.ball.targetPos = null;
    this.state.ball.vel = { x: 0, y: 0 };
    this.state.ball.carrierProtectedUntilMs = 0;
    this.state.ball.lastTouchTeam = team;
    this.state.flow.goalResetMsRemaining = 1500;
    this.state.flow.restartTeam = team === "HOME" ? "AWAY" : "HOME";
    this.emit({
      type: "goal_scored",
      atMs: this.state.timeMs,
      team,
      home: this.state.score.HOME,
      away: this.state.score.AWAY,
    });
    this.adjustMomentum(team, 0.22, "goal_scored");
  }

  resetMatch(nextSeed?: number) {
    const seed = nextSeed ?? this.state.rngSeed + 1;
    const attackDeckIds = [...this.attackCatalogIds];
    const defenseDeckIds = [...this.defenseCatalogIds];
    const rng = new RNG(seed);
    shuffleInPlace(attackDeckIds, rng);
    shuffleInPlace(defenseDeckIds, rng);

    this.state = createInitialMatchState({
      rngSeed: seed,
      homeDecks: { attack: attackDeckIds, defense: defenseDeckIds },
      awayDecks: { attack: attackDeckIds, defense: defenseDeckIds },
    });

    this.ballSystem = new BallSystem(seed);
    this.tackleSystem = new TackleSystem(seed);
    this.rng = new RNG(seed ^ 0x73f3);

    this.drawUpTo(this.state.teams.HOME.deckAttack, this.state.teams.HOME.handAttack, HAND_SIZE);
    this.drawUpTo(this.state.teams.HOME.deckDefense, this.state.teams.HOME.handDefense, HAND_SIZE);
    this.drawUpTo(this.state.teams.AWAY.deckAttack, this.state.teams.AWAY.handAttack, HAND_SIZE);
    this.drawUpTo(this.state.teams.AWAY.deckDefense, this.state.teams.AWAY.handDefense, HAND_SIZE);

    this.eventQueue.length = 0;
    this.debugFrames.length = 0;
    this.tickCount = 0;
  }

  togglePossession() {
    const next = this.state.possession.lastTouchTeam === "HOME" ? "AWAY" : "HOME";
    const ids = this.state.teams[next].playerIds;
    const carrierId = ids.find((id) => this.state.players[id].role !== "GK") ?? ids[0];
    this.state.ball.carrierId = carrierId;
    this.state.ball.state = "CARRIED";
    this.state.ball.vel = { x: 0, y: 0 };
    this.state.ball.targetPos = null;
    this.state.ball.carrierProtectedUntilMs = this.state.timeMs + 600;
    this.state.ball.lastTouchTeam = next;
    this.state.possession.team = next;
    this.state.possession.lastTouchTeam = next;
    this.emit({
      type: "possession_changed",
      atMs: this.state.timeMs,
      team: next,
      deck: this.getActiveDeckKind(),
    });
  }

  getActiveTeam(): TeamId {
    return this.playerTeam;
  }

  getActiveDeckKind(): DeckKind {
    const carrierId = this.state.ball.carrierId;
    if (carrierId && this.state.players[carrierId] && this.state.players[carrierId].teamId === this.playerTeam) {
      return "ATTACK";
    }
    return "DEFENSE";
  }

  getActiveHandCardIds(): string[] {
    const team = this.state.teams[this.playerTeam];
    return this.getActiveDeckKind() === "ATTACK" ? team.handAttack.cards : team.handDefense.cards;
  }

  getActiveHandCardUi(): Record<string, CardUiMeta> {
    const teamState = this.state.teams[this.playerTeam];
    const activeDeck = this.getActiveDeckKind();
    const hand = activeDeck === "ATTACK" ? teamState.handAttack.cards : teamState.handDefense.cards;
    const carrierId = this.state.ball.carrierId;
    const controlsBall = Boolean(carrierId && this.state.players[carrierId]?.teamId === this.playerTeam);

    const result: Record<string, CardUiMeta> = {};
    for (const cardId of hand) {
      const cooldownMs = teamState.cooldowns[cardId] ?? 0;
      let meta: CardUiMeta = { status: "READY", playable: true, cooldownMs, reason: "" };

      if (this.state.phase === "ENDED") {
        meta = { status: "PHASE", playable: false, cooldownMs, reason: "Full Time" };
      } else if (this.state.phase === "HALFTIME") {
        meta = { status: "PHASE", playable: false, cooldownMs, reason: "Halftime" };
      } else if (this.state.flow.goalResetMsRemaining > 0) {
        meta = { status: "RESTART", playable: false, cooldownMs, reason: "Restart" };
      } else if (cooldownMs > 0) {
        meta = { status: "COOLDOWN", playable: false, cooldownMs, reason: "Cooldown" };
      } else if (teamState.lockoutMs > 0) {
        meta = { status: "LOCKOUT", playable: false, cooldownMs, reason: "Lockout" };
      } else if (activeDeck === "ATTACK" && !controlsBall) {
        meta = { status: "CONTEXT", playable: false, cooldownMs, reason: "Need ball" };
      } else if (activeDeck === "DEFENSE" && controlsBall) {
        meta = { status: "CONTEXT", playable: false, cooldownMs, reason: "Out of poss" };
      }

      result[cardId] = meta;
    }

    return result;
  }

  getMomentum(): number {
    return this.state.momentum;
  }

  getTeamCommandsForUi(team: TeamId = this.playerTeam) {
    const active = this.state.teams[team].activeCommand;
    return this.state.teams[team].teamCommands.map((slot) => {
      const def = getTeamCommandDef(slot.type);
      return {
        type: slot.type,
        label: def.label,
        used: slot.used,
        active: active?.type === slot.type,
        remainingMs: active?.type === slot.type ? active.remainingMs : 0,
      };
    });
  }

  playTeamCommand(type: TeamCommandType): boolean {
    const team = this.playerTeam;
    const teamState = this.state.teams[team];
    if (this.state.phase === "ENDED") {
      this.lastActionMessage = "Match ended";
      return false;
    }
    if (this.state.phase === "HALFTIME") {
      this.lastActionMessage = "Halftime adjustments";
      return false;
    }
    if (this.state.flow.goalResetMsRemaining > 0) {
      this.lastActionMessage = "Restart in progress";
      return false;
    }
    const slot = teamState.teamCommands.find((s) => s.type === type);
    if (!slot) {
      this.lastActionMessage = "Command not equipped";
      return false;
    }
    if (slot.used) {
      this.lastActionMessage = "Command already used";
      return false;
    }
    if (teamState.activeCommand) {
      this.lastActionMessage = "Another command is active";
      return false;
    }

    const def = getTeamCommandDef(type);
    teamState.activeCommand = {
      type,
      durationMs: def.durationMs,
      remainingMs: def.durationMs,
      modifiers: { ...def.modifiers },
    };
    slot.used = true;
    this.adjustMomentum(team, 0.04, `team_command_${type.toLowerCase()}`);
    this.emit({
      type: "team_command_activated",
      atMs: this.state.timeMs,
      team,
      command: type,
      durationMs: def.durationMs,
    });
    this.lastActionMessage = `${def.label} activated`;
    return true;
  }

  getActivePlayerForUi() {
    const carrierId = this.state.ball.carrierId;
    if (carrierId && this.state.players[carrierId]?.teamId === this.playerTeam) {
      return this.state.players[carrierId];
    }

    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const id of this.state.teams[this.playerTeam].playerIds) {
      const p = this.state.players[id];
      if (!p || p.role === "GK") continue;
      const d = Math.hypot(p.pos.x - this.state.ball.pos.x, p.pos.y - this.state.ball.pos.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId ? this.state.players[bestId] : null;
  }

  playCard(cardId: string, input: CardInput): boolean {
    this.lastActionMessage = "";
    const team = this.playerTeam;
    const cardMeta = this.resolver.getCard(cardId);
    if (this.state.phase === "ENDED") {
      this.lastActionMessage = "Match ended";
      this.lastCardDebugLine = `${cardId} -> N/A -> blocked: match ended`;
      this.emitCardResult(team, cardId, cardMeta?.type, false, "match ended");
      return false;
    }
    if (this.state.phase === "HALFTIME") {
      this.lastActionMessage = "Halftime adjustments";
      this.lastCardDebugLine = `${cardId} -> N/A -> blocked: halftime`;
      this.emitCardResult(team, cardId, cardMeta?.type, false, "halftime");
      return false;
    }
    if (this.state.flow.goalResetMsRemaining > 0) {
      this.lastActionMessage = "Restart in progress";
      this.lastCardDebugLine = `${cardId} -> N/A -> blocked: restart`;
      this.emitCardResult(team, cardId, cardMeta?.type, false, "restart in progress");
      return false;
    }

    const activeDeck = this.getActiveDeckKind();
    const teamState = this.state.teams[team];
    const hand = activeDeck === "ATTACK" ? teamState.handAttack : teamState.handDefense;
    const deck = activeDeck === "ATTACK" ? teamState.deckAttack : teamState.deckDefense;

    const idx = hand.cards.indexOf(cardId);
    if (idx < 0) {
      this.lastActionMessage = "Card not in active hand";
      this.lastCardDebugLine = `${cardId} -> N/A -> rejected: not_in_hand`;
      this.emitCardResult(team, cardId, cardMeta?.type, false, "card not in active hand");
      return false;
    }

    if (activeDeck === "ATTACK") {
      const carrierId = this.state.ball.carrierId;
      if (!carrierId || this.state.players[carrierId].teamId !== team) {
        this.lastActionMessage = "No carrier under control";
        this.lastCardDebugLine = `${cardId} -> N/A -> rejected: no_carrier`;
        this.emitCardResult(team, cardId, cardMeta?.type, false, "no carrier under control");
        return false;
      }
    }

    const prevCooldown = teamState.cooldowns[cardId] ?? 0;
    const prevLockout = teamState.lockoutMs;
    const card = this.resolver.tryPlay(this.state, team, cardId, activeDeck);
    if (!card) {
      this.lastActionMessage = "Card unavailable (cooldown/lockout/context)";
      this.lastCardDebugLine = `${cardId} -> N/A -> rejected: cooldown_lockout_context`;
      this.emitCardResult(team, cardId, cardMeta?.type, false, "cooldown/lockout/context");
      this.adjustMomentum(team, -0.01, "card_rejected_cooldown");
      return false;
    }

    const applied = this.applyCardEffect(team, card, input);
    if (!applied) {
      teamState.cooldowns[cardId] = prevCooldown;
      teamState.lockoutMs = prevLockout;
      this.lastActionMessage = "Card had no valid target";
      this.lastCardDebugLine = `${cardId} -> ${card.type} -> rejected: invalid_target`;
      this.emitCardResult(team, cardId, card.type, false, "no valid target");
      this.adjustMomentum(team, -0.015, "card_invalid_target");
      return false;
    }

    const cooldownAfterPlay = teamState.cooldowns[cardId] ?? 0;
    teamState.cooldowns[cardId] = this.applyCooldownModifiers(team, cooldownAfterPlay);

    hand.cards.splice(idx, 1);
    deck.draw.push(cardId);
    this.drawUpTo(deck, hand, HAND_SIZE);

    this.emit({
      type: "card_played",
      atMs: this.state.timeMs,
      team,
      cardId,
      deck: activeDeck,
    });
    this.emitCardResult(team, cardId, card.type, true, "executed");
    this.adjustMomentum(team, this.getCardMomentumDelta(card.type), `card_${card.type.toLowerCase()}`);

    this.lastActionMessage = "";
    this.lastCardDebugLine = `${cardId} -> ${card.type} -> played`;
    return true;
  }

  getLastActionMessage() {
    return this.lastActionMessage;
  }

  getLastCardDebugLine() {
    return this.lastCardDebugLine;
  }

  drainEvents(): SimEvent[] {
    if (this.eventQueue.length === 0) return [];
    const events = [...this.eventQueue];
    this.eventQueue.length = 0;
    return events;
  }

  getStateSnapshot(): string {
    return serializeMatchState(this.state);
  }

  getRenderState(): MatchState {
    return this.state;
  }

  getDebugLog(limit = 800): SimDebugLog {
    const frames = this.debugFrames.slice(Math.max(0, this.debugFrames.length - limit));
    return {
      seed: this.state.rngSeed,
      frames,
    };
  }

  getDebugLogJson(limit = 800): string {
    return JSON.stringify(this.getDebugLog(limit));
  }

  private emit(event: SimEvent, stepEvents?: SimEvent[]) {
    this.eventQueue.push(event);
    if (stepEvents) {
      stepEvents.push(event);
    }
  }

  private emitCardResult(team: TeamId, cardId: string, cardType: string | undefined, success: boolean, reason: string) {
    this.emit({
      type: "card_result",
      atMs: this.state.timeMs,
      team,
      cardId,
      cardType,
      success,
      reason,
    });
  }

  private getMomentumAdvantage(team: TeamId): number {
    return team === "HOME" ? this.state.momentum : -this.state.momentum;
  }

  private getTeamCommandModifiers(team: TeamId) {
    return this.state.teams[team].activeCommand?.modifiers ?? null;
  }

  private getCardMomentumDelta(cardType: CardDef["type"]): number {
    switch (cardType) {
      case "PASS":
      case "THROUGH_PASS":
      case "LONG_BALL":
      case "CROSS":
        return 0.012;
      case "DRIBBLE":
      case "RUSH":
        return 0.01;
      case "SHOOT":
        return 0.02;
      case "TACKLE":
      case "PRESS":
      case "INTERCEPT":
      case "COVER":
        return 0.015;
      default:
        return 0.008;
    }
  }

  private applyCooldownModifiers(team: TeamId, cooldownMs: number): number {
    const momentumAdv = this.getMomentumAdvantage(team);
    const momentumFactor = Math.max(0.75, Math.min(1.2, 1 - momentumAdv * 0.15));
    const commandFactor = this.getTeamCommandModifiers(team)?.cooldownMultiplier ?? 1;
    return Math.max(180, cooldownMs * momentumFactor * commandFactor * this.eventModifiers.cooldownMultiplier);
  }

  private adjustMomentum(team: TeamId, delta: number, reason: string, stepEvents?: SimEvent[]) {
    const signedDelta = (team === "HOME" ? delta : -delta) * this.eventModifiers.momentumMultiplier;
    const prev = this.state.momentum;
    const next = Math.max(-1, Math.min(1, prev + signedDelta));
    if (Math.abs(next - prev) < 0.0001) return;
    this.state.momentum = next;
    this.emit(
      {
        type: "momentum_changed",
        atMs: this.state.timeMs,
        momentum: next,
        byTeam: team,
        reason,
      },
      stepEvents
    );
  }

  private getActionSuccessChance(team: TeamId, carrierStats: PlayerStats, kind: "PASS" | "SHOT" | "DRIBBLE"): number {
    const adv = this.getMomentumAdvantage(team);
    const cmd = this.getTeamCommandModifiers(team);
    const passBonus = cmd?.passBonus ?? 0;
    const shotBonus = cmd?.shotBonus ?? 0;
    switch (kind) {
      case "PASS": {
        const base = 0.78 + (carrierStats.pas + carrierStats.dri) / 360;
        return Math.max(0.45, Math.min(0.98, base + adv * 0.08 + passBonus + this.eventModifiers.passBonus));
      }
      case "SHOT": {
        const base = 0.4 + carrierStats.sho / 170;
        return Math.max(0.18, Math.min(0.92, base + adv * 0.11 + shotBonus + this.eventModifiers.shotBonus));
      }
      case "DRIBBLE": {
        const base = 0.62 + (carrierStats.dri + carrierStats.pac) / 420;
        return Math.max(0.28, Math.min(0.96, base + adv * 0.08 + this.eventModifiers.dribbleBonus));
      }
    }
  }

  private estimateShotLaneRisk(team: TeamId, from: Vec2, to: Vec2): number {
    const opp: TeamId = team === "HOME" ? "AWAY" : "HOME";
    const shot = { x: to.x - from.x, y: to.y - from.y };
    const shotLen = Math.max(1, Math.hypot(shot.x, shot.y));
    const dir = { x: shot.x / shotLen, y: shot.y / shotLen };
    const coneCos = Math.cos(Math.PI / 7.5);
    let risk = 0;
    for (const id of this.state.teams[opp].playerIds) {
      const p = this.state.players[id];
      const toOpp = { x: p.pos.x - from.x, y: p.pos.y - from.y };
      const d = Math.hypot(toOpp.x, toOpp.y);
      if (d > shotLen + 20) continue;
      const n = d < 0.0001 ? { x: 0, y: 0 } : { x: toOpp.x / d, y: toOpp.y / d };
      const alignment = n.x * dir.x + n.y * dir.y;
      if (alignment < coneCos) continue;
      const lane = this.segmentDistanceToShot(p.pos, from, to);
      if (lane > 28) continue;
      risk += (1 - lane / 28) * 0.45;
    }
    return Math.max(0, Math.min(1, risk));
  }

  private segmentDistanceToShot(point: Vec2, a: Vec2, b: Vec2): number {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ap = { x: point.x - a.x, y: point.y - a.y };
    const abLenSq = ab.x * ab.x + ab.y * ab.y;
    if (abLenSq < 0.0001) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLenSq));
    const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    return Math.hypot(point.x - proj.x, point.y - proj.y);
  }

  private recordDebugFrame(stepEvents: SimEvent[]) {
    this.tickCount += 1;
    this.debugFrames.push(compactStateFrame(this.state, this.tickCount, stepEvents));
    if (this.debugFrames.length > this.maxDebugFrames) {
      this.debugFrames.shift();
    }
  }

  private drawUpTo(deck: DeckState, hand: HandState, target: number) {
    while (hand.cards.length < target && deck.draw.length > 0) {
      const top = deck.draw.shift();
      if (!top) break;
      hand.cards.push(top);
    }
  }

  private resolveInputDirection(team: TeamId, direction?: Vec2): Vec2 {
    if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
      return team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 };
    }
    const mag = Math.hypot(direction.x, direction.y);
    if (!Number.isFinite(mag) || mag < 0.0001) {
      return team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 };
    }
    return { x: direction.x / mag, y: direction.y / mag };
  }

  private clampToPitch(pos: Vec2): Vec2 {
    const fallbackX = (PITCH_LEFT + PITCH_RIGHT) / 2;
    const fallbackY = PITCH_CENTER_Y;
    const x = Number.isFinite(pos.x) ? pos.x : fallbackX;
    const y = Number.isFinite(pos.y) ? pos.y : fallbackY;
    return {
      x: Math.max(PITCH_LEFT + 6, Math.min(PITCH_RIGHT - 6, x)),
      y: Math.max(PITCH_TOP + 6, Math.min(PITCH_BOTTOM - 6, y)),
    };
  }

  private resolveAimTarget(from: Vec2, team: TeamId, input: CardInput, distance: number): Vec2 {
    if (input.targetPos && Number.isFinite(input.targetPos.x) && Number.isFinite(input.targetPos.y)) {
      return this.clampToPitch(input.targetPos);
    }
    const safeFrom = this.clampToPitch(from);
    const dir = this.resolveInputDirection(team, input.direction);
    return this.clampToPitch({ x: safeFrom.x + dir.x * distance, y: safeFrom.y + dir.y * distance });
  }

  private jitterTarget(target: Vec2, radiusPx: number): Vec2 {
    const angle = this.rng.next() * Math.PI * 2;
    const mag = this.rng.next() * radiusPx;
    return this.clampToPitch({
      x: target.x + Math.cos(angle) * mag,
      y: target.y + Math.sin(angle) * mag,
    });
  }

  private applyCardEffect(team: TeamId, card: CardDef, _input: CardInput) {
    switch (card.type) {
      case "PASS":
        return this.playShortPass(team, _input);
      case "THROUGH_PASS":
      case "LONG_BALL":
        return this.playLongPass(team, _input);
      case "CROSS":
        return this.playCross(team, _input);
      case "DRIBBLE":
        return this.playDribble(team, _input);
      case "RUSH":
        return this.playRush(team, _input);
      case "SHOOT":
        return this.playShoot(team, _input);
      case "TACKLE":
        return this.playTackle(team, card.id.includes("SLIDE") ? "SLIDING" : "STANDING", _input);
      case "PRESS":
        return this.playPress(team, _input);
      case "COVER":
        this.assignNearestDefenderIntent(team, {
          type: "COVER_ZONE",
          expiresAtMs: this.state.timeMs + 1500,
          priority: 90,
        });
        return true;
      case "INTERCEPT":
        this.assignNearestDefenderIntent(team, {
          type: "INTERCEPT_LANE",
          expiresAtMs: this.state.timeMs + 1200,
          priority: 95,
        });
        this.interceptSystem.step(this.state);
        return true;
      default:
        return false;
    }
  }

  private pickTeammateByDirection(team: TeamId, fromId: string, direction: Vec2 | undefined, minDist: number, maxDist: number) {
    const from = this.state.players[fromId];
    const dir = this.resolveInputDirection(team, direction);
    let bestId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const id of this.state.teams[team].playerIds) {
      if (id === fromId) continue;
      const p = this.state.players[id];
      const to = { x: p.pos.x - from.pos.x, y: p.pos.y - from.pos.y };
      const d = Math.hypot(to.x, to.y);
      if (d < minDist || d > maxDist) continue;
      const n = d < 0.0001 ? { x: 0, y: 0 } : { x: to.x / d, y: to.y / d };
      const alignment = n.x * dir.x + n.y * dir.y;
      if (alignment < 0.25) continue;

      const forward = team === "HOME" ? to.x : -to.x;
      const score = alignment * 140 + forward * 0.4 + (p.stats.pas + p.stats.dri) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestId ? this.state.players[bestId] : null;
  }

  private pickOpponentByDirection(team: TeamId, direction: Vec2 | undefined) {
    const from = this.state.ball.pos;
    const dir = this.resolveInputDirection(team, direction);
    const oppTeam: TeamId = team === "HOME" ? "AWAY" : "HOME";
    let bestId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const id of this.state.teams[oppTeam].playerIds) {
      const p = this.state.players[id];
      if (!p || p.role === "GK") continue;
      const to = { x: p.pos.x - from.x, y: p.pos.y - from.y };
      const d = Math.hypot(to.x, to.y);
      if (d > 220) continue;
      const n = d < 0.0001 ? { x: 0, y: 0 } : { x: to.x / d, y: to.y / d };
      const alignment = n.x * dir.x + n.y * dir.y;
      if (alignment < -0.2) continue;
      const score = alignment * 120 - d * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestId ? this.state.players[bestId] : null;
  }

  private playShortPass(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const targetedMate =
      (input.targetPlayerId && this.state.players[input.targetPlayerId]?.teamId === team && input.targetPlayerId !== carrier.id
        ? this.state.players[input.targetPlayerId]
        : null) ?? this.pickTeammateByDirection(team, carrier.id, input.direction, 12, 360);
    const targetPos = targetedMate?.pos ?? this.resolveAimTarget(carrier.pos, team, input, 170);

    const laneRisk = this.passSystem.estimateInterceptionRisk(this.state, team, carrier.pos, targetPos, "SHORT");
    const passChance = Math.max(0.12, this.getActionSuccessChance(team, carrier.stats, "PASS") - laneRisk * 0.35);
    const passSuccess = this.rng.next() <= passChance;
    const resolvedTarget = passSuccess ? targetPos : this.jitterTarget(targetPos, 140);

    carrier.intent = {
      type: "PASS_TO_DIRECTION",
      targetPlayerId: targetedMate?.id,
      targetPos: { x: resolvedTarget.x, y: resolvedTarget.y },
      expiresAtMs: this.state.timeMs + 700,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, resolvedTarget);
    if (!ok) return false;
    this.adjustMomentum(team, passSuccess ? 0.01 : -0.018, passSuccess ? "pass_complete" : "pass_mishit");
    this.ballSystem.grantCarrierProtection(this.state, 260);
    return true;
  }

  private playLongPass(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const targetedMate =
      (input.targetPlayerId && this.state.players[input.targetPlayerId]?.teamId === team && input.targetPlayerId !== carrier.id
        ? this.state.players[input.targetPlayerId]
        : null) ?? this.pickTeammateByDirection(team, carrier.id, input.direction, 60, 760);
    const targetPos = targetedMate?.pos ?? this.resolveAimTarget(carrier.pos, team, input, 290);

    const laneRisk = this.passSystem.estimateInterceptionRisk(this.state, team, carrier.pos, targetPos, "THROUGH");
    const passChance = Math.max(0.08, this.getActionSuccessChance(team, carrier.stats, "PASS") - 0.1 - laneRisk * 0.42);
    const passSuccess = this.rng.next() <= passChance;
    const resolvedTarget = passSuccess ? targetPos : this.jitterTarget(targetPos, 190);

    carrier.intent = {
      type: "THROUGH_TO_DIRECTION",
      targetPlayerId: targetedMate?.id,
      targetPos: { x: resolvedTarget.x, y: resolvedTarget.y },
      expiresAtMs: this.state.timeMs + 850,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, resolvedTarget);
    if (!ok) return false;
    this.adjustMomentum(team, passSuccess ? 0.012 : -0.022, passSuccess ? "through_complete" : "through_mishit");
    return true;
  }

  private playCross(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;

    const inOwnHalf = team === "HOME" ? carrier.pos.x < 480 : carrier.pos.x > 480;
    const targetedMate = this.pickTeammateByDirection(team, carrier.id, input.direction, 60, 500);
    const boxCenterX = team === "HOME" ? GOAL_LINE_RIGHT_X - 110 : GOAL_LINE_LEFT_X + 110;
    const fallback = inOwnHalf
      ? this.resolveAimTarget(carrier.pos, team, input, 260)
      : { x: boxCenterX, y: this.resolveAimTarget(carrier.pos, team, input, 220).y };
    const target = targetedMate ? { x: targetedMate.pos.x, y: targetedMate.pos.y } : fallback;

    const laneRisk = this.passSystem.estimateInterceptionRisk(this.state, team, carrier.pos, target, "LONG");
    const passChance = Math.max(0.1, this.getActionSuccessChance(team, carrier.stats, "PASS") - 0.06 - laneRisk * 0.34);
    const passSuccess = this.rng.next() <= passChance;
    const resolvedTarget = passSuccess ? target : this.jitterTarget(target, 170);

    carrier.intent = {
      type: "THROUGH_TO_DIRECTION",
      targetPos: resolvedTarget,
      expiresAtMs: this.state.timeMs + 900,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, resolvedTarget);
    if (!ok) return false;
    this.adjustMomentum(team, passSuccess ? 0.012 : -0.02, passSuccess ? "cross_complete" : "cross_mishit");
    return true;
  }

  private playRush(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const hasAimInput = Boolean(input.direction || input.targetPos);
    const target = hasAimInput
      ? this.resolveAimTarget(carrier.pos, team, input, 250)
      : this.findOpenRunTarget(carrier.pos, team, 260);
    const progress = team === "HOME" ? target.x - carrier.pos.x : carrier.pos.x - target.x;
    if (progress < 60) {
      target.x = team === "HOME" ? Math.min(PITCH_RIGHT - 12, carrier.pos.x + 90) : Math.max(PITCH_LEFT + 12, carrier.pos.x - 90);
    }
    carrier.intent = {
      type: "CARRY_BURST",
      targetPos: target,
      expiresAtMs: this.state.timeMs + 950,
      priority: 100,
    };
    this.ballSystem.grantCarrierProtection(this.state, 850);
    return true;
  }

  private playDribble(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const target =
      input.direction || input.targetPos
        ? this.resolveAimTarget(carrier.pos, team, input, 150)
        : this.findOpenRunTarget(carrier.pos, team, 140);
    const success = this.rng.next() <= this.getActionSuccessChance(team, carrier.stats, "DRIBBLE");
    const resolvedTarget = success ? target : this.jitterTarget(target, 110);
    carrier.intent = {
      type: "DRIBBLE_TO_DIRECTION",
      targetPos: resolvedTarget,
      expiresAtMs: this.state.timeMs + 800,
      priority: 100,
    };
    this.adjustMomentum(team, success ? 0.009 : -0.014, success ? "dribble_success" : "dribble_heavy_touch");
    this.ballSystem.grantCarrierProtection(this.state, 700);
    return true;
  }

  private playShoot(team: TeamId, input: CardInput) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const aimedShot = Boolean(input.direction || input.targetPos);
    const goal = aimedShot ? this.resolveAimTarget(carrier.pos, team, input, 340) : this.getShotTarget(team);
    const dist = Math.hypot(goal.x - carrier.pos.x, goal.y - carrier.pos.y);
    const inGoodLane = this.isInOppPenaltyArea(carrier.pos, team) || dist < 250;
    if (aimedShot || inGoodLane) {
      const shotLaneRisk = this.estimateShotLaneRisk(team, carrier.pos, goal);
      const shotChance = Math.max(0.08, this.getActionSuccessChance(team, carrier.stats, "SHOT") - shotLaneRisk * 0.4);
      const shotOnTarget = this.rng.next() <= shotChance;
      const shotTarget = shotOnTarget ? goal : this.jitterTarget(goal, 160);
      carrier.intent = {
        type: "SHOOT_TO_DIRECTION",
        targetPos: shotTarget,
        expiresAtMs: this.state.timeMs + 500,
        priority: 100,
      };
      const fired = this.ballSystem.shootTo(this.state, shotTarget);
      if (fired) {
        this.adjustMomentum(team, shotOnTarget ? 0.02 : -0.02, shotOnTarget ? "shot_on_target" : "shot_off_target");
      }
      return fired;
    }

    const betterX = team === "HOME" ? Math.min(PITCH_RIGHT - 90, carrier.pos.x + 90) : Math.max(PITCH_LEFT + 90, carrier.pos.x - 90);
    carrier.intent = {
      type: "CARRY_BURST",
      targetPos: { x: betterX, y: PITCH_CENTER_Y + (carrier.pos.y - PITCH_CENTER_Y) * 0.45 },
      expiresAtMs: this.state.timeMs + 800,
      priority: 100,
    };
    this.ballSystem.grantCarrierProtection(this.state, 500);
    return true;
  }

  private playTackle(team: TeamId, mode: "STANDING" | "SLIDING", input: CardInput) {
    const preferredTarget = this.pickOpponentByDirection(team, input.direction);
    this.assignNearestDefenderIntent(team, {
      type: "TACKLE_TARGET",
      expiresAtMs: this.state.timeMs + (mode === "SLIDING" ? 820 : 620),
      priority: 100,
    });
    const result = this.tackleSystem.tryCardTackle(this.state, team, this.ballSystem, mode, preferredTarget?.id);
    this.lastActionMessage = result === "MISS" ? "Tackle: closing down" : `Tackle ${result.toLowerCase()}`;
    if (result === "FOUL") {
      this.emit({
        type: "ball_transition",
        atMs: this.state.timeMs,
        from: "CARRIED",
        to: "CARRIED",
        reason: "free_kick",
      });
    }
    const deltaByResult: Record<typeof result, number> = {
      WIN: 0.022,
      LOOSE: 0.008,
      FOUL: -0.03,
      MISS: -0.012,
    };
    this.adjustMomentum(team, deltaByResult[result], `tackle_${result.toLowerCase()}`);
    return true;
  }

  private playPress(team: TeamId, input: CardInput) {
    const carrierId = this.state.ball.carrierId;
    if (!carrierId) return false;
    const carrier = this.state.players[carrierId];
    const nearest = this.getNearestOutfieldPlayer(team);
    if (!nearest) return false;
    const dir = this.resolveInputDirection(team, input.direction);
    nearest.intent = {
      type: "PRESS_ZONE",
      targetPlayerId: carrier.id,
      targetPos: { x: carrier.pos.x + dir.x * 18, y: carrier.pos.y + dir.y * 18 },
      expiresAtMs: this.state.timeMs + 1200,
      priority: 95,
    };
    this.adjustMomentum(team, 0.006, "press_triggered");
    return true;
  }

  private assignCarrierIntent(team: TeamId, intent: IntentState) {
    const carrierId = this.state.ball.carrierId;
    if (!carrierId) return;
    const carrier = this.state.players[carrierId];
    if (carrier.teamId !== team) return;
    carrier.intent = intent;
  }

  private assignNearestDefenderIntent(team: TeamId, intent: IntentState) {
    const target = this.getNearestOutfieldPlayer(team);
    if (!target) return;
    target.intent = intent;
  }

  private getNearestOutfieldPlayer(team: TeamId) {
    let bestId: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const id of this.state.teams[team].playerIds) {
      const p = this.state.players[id];
      if (p.role === "GK") continue;
      const dx = p.pos.x - this.state.ball.pos.x;
      const dy = p.pos.y - this.state.ball.pos.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    return bestId ? this.state.players[bestId] : null;
  }

  private getShotTarget(team: TeamId): Vec2 {
    return team === "HOME" ? { x: GOAL_LINE_RIGHT_X, y: PITCH_CENTER_Y } : { x: GOAL_LINE_LEFT_X, y: PITCH_CENTER_Y };
  }

  private getCarrierForTeam(team: TeamId) {
    if (!this.state.ball.carrierId) return null;
    const carrier = this.state.players[this.state.ball.carrierId];
    if (!carrier || carrier.teamId !== team) return null;
    return carrier;
  }

  private findOpenRunTarget(from: Vec2, team: TeamId, distance: number): Vec2 {
    const baseDir = team === "HOME" ? 0 : Math.PI;
    const angles = [0, -0.35, 0.35, -0.6, 0.6];

    let best = { x: from.x + Math.cos(baseDir) * distance, y: from.y };
    let bestScore = Number.NEGATIVE_INFINITY;

    const oppTeam: TeamId = team === "HOME" ? "AWAY" : "HOME";
    for (const a of angles) {
      const dir = baseDir + a;
      const target = {
        x: Math.max(PITCH_LEFT + 16, Math.min(PITCH_RIGHT - 16, from.x + Math.cos(dir) * distance)),
        y: Math.max(PENALTY_BOX_TOP - 70, Math.min(PENALTY_BOX_BOTTOM + 70, from.y + Math.sin(dir) * distance)),
      };

      let minOppDist = Number.POSITIVE_INFINITY;
      for (const id of this.state.teams[oppTeam].playerIds) {
        const p = this.state.players[id];
        const d = Math.hypot(p.pos.x - target.x, p.pos.y - target.y);
        if (d < minOppDist) minOppDist = d;
      }

      const progress = team === "HOME" ? target.x - from.x : from.x - target.x;
      const score = minOppDist * 1.4 + progress;
      if (score > bestScore) {
        bestScore = score;
        best = target;
      }
    }

    return best;
  }

  private isInOppPenaltyArea(pos: Vec2, team: TeamId) {
    if (pos.y < PENALTY_BOX_TOP || pos.y > PENALTY_BOX_BOTTOM) return false;
    if (team === "HOME") return pos.x >= PITCH_RIGHT - 230;
    return pos.x <= PITCH_LEFT + 230;
  }

  private expireIntents() {
    for (const p of Object.values(this.state.players)) {
      if (p.intent && p.intent.expiresAtMs <= this.state.timeMs) {
        p.intent = null;
      }
    }
  }

  private clearAllIntents() {
    for (const p of Object.values(this.state.players)) {
      p.intent = null;
    }
  }

  private recoverStaminaAtHalf() {
    for (const p of Object.values(this.state.players)) {
      p.stamina = Math.min(100, p.stamina + 26);
    }
  }

  private forceKickoff(team: TeamId) {
    const ids = this.state.teams[team].playerIds;
    const carrierId = ids.find((id) => this.state.players[id].role !== "GK") ?? ids[0];
    const carrier = this.state.players[carrierId];
    this.state.ball.state = "KICKOFF";
    this.state.ball.carrierId = carrierId;
    this.state.ball.pos = { x: carrier.pos.x, y: carrier.pos.y };
    this.state.ball.vel = { x: 0, y: 0 };
    this.state.ball.targetPos = null;
    this.state.ball.lastTouchTeam = team;
    this.state.ball.carrierProtectedUntilMs = this.state.timeMs + 600;
    this.state.possession.team = team;
    this.state.possession.lastTouchTeam = team;
  }

  private static applyHomeSquad(state: MatchState, squad: SquadPlayerConfig[]) {
    const homeIds = state.teams.HOME.playerIds;
    for (let i = 0; i < homeIds.length; i++) {
      const player = state.players[homeIds[i]];
      const chosen = squad[i];
      if (!chosen) continue;
      player.role = chosen.role;
      player.stats = { ...chosen.stats };
    }

    const kickoffCarrierId = homeIds.find((id) => state.players[id].role !== "GK") ?? homeIds[0];
    const carrier = state.players[kickoffCarrierId];
    state.ball.carrierId = kickoffCarrierId;
    state.ball.pos = { x: carrier.pos.x, y: carrier.pos.y };
    state.ball.lastTouchTeam = "HOME";
  }
}
