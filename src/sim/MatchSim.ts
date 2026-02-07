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
  PITCH_LEFT,
  PITCH_RIGHT,
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
  TeamId,
  Vec2,
} from "./state/MatchState";
import { AISystem } from "./systems/AISystem";
import { BallSystem } from "./systems/BallSystem";
import { InterceptSystem } from "./systems/InterceptSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { PassSystem } from "./systems/PassSystem";
import { TackleSystem } from "./systems/TackleSystem";

type CatalogJson = { cards: CardDef[] };

export interface SquadPlayerConfig {
  id: string;
  role: PlayerRole;
  stats: PlayerStats;
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
  private attackCatalogIds: string[];
  private defenseCatalogIds: string[];

  private debugFrames: SimDebugFrame[] = [];
  private tickCount = 0;
  private maxDebugFrames = 5000;
  private lastActionMessage = "";
  private lastCardDebugLine = "card: - -> - -> idle";

  constructor(state: MatchState, attackCatalog: CardCatalog, defenseCatalog: CardCatalog) {
    this.state = state;
    this.resolver = new CardResolver(attackCatalog, defenseCatalog);
    this.ballSystem = new BallSystem(state.rngSeed);
    this.aiSystem = new AISystem();
    this.passSystem = new PassSystem();
    this.interceptSystem = new InterceptSystem();
    this.movementSystem = new MovementSystem();
    this.tackleSystem = new TackleSystem(state.rngSeed);
    this.attackCatalogIds = attackCatalog.ids().slice(0, DECK_SIZE);
    this.defenseCatalogIds = defenseCatalog.ids().slice(0, DECK_SIZE);
  }

  static createFromCatalogs(args: {
    attackCatalog: CatalogJson;
    defenseCatalog: CatalogJson;
    rngSeed: number;
    homeSquad?: SquadPlayerConfig[];
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
    });

    if (args.homeSquad && args.homeSquad.length === state.teamSize) {
      MatchSim.applyHomeSquad(state, args.homeSquad);
    }

    const sim = new MatchSim(state, attack, defense);

    sim.drawUpTo(state.teams.HOME.deckAttack, state.teams.HOME.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.HOME.deckDefense, state.teams.HOME.handDefense, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckAttack, state.teams.AWAY.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckDefense, state.teams.AWAY.handDefense, HAND_SIZE);

    return sim;
  }

  step(dtMs: number) {
    const stepEvents: SimEvent[] = [];
    const prevPossession = this.state.possession.team;

    this.state.timeMs = Math.min(this.state.timeMs + dtMs, this.state.durationMs);
    if (this.state.phase === "KICKOFF" && this.state.timeMs > 0) {
      this.state.phase = "LIVE";
    }
    if (this.state.timeMs >= this.state.durationMs) {
      this.state.phase = "ENDED";
    }

    if (this.state.phase === "ENDED") {
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
    if (this.state.phase === "ENDED") {
      this.lastActionMessage = "Match ended";
      this.lastCardDebugLine = `${cardId} -> N/A -> blocked: match ended`;
      return false;
    }
    if (this.state.flow.goalResetMsRemaining > 0) {
      this.lastActionMessage = "Restart in progress";
      this.lastCardDebugLine = `${cardId} -> N/A -> blocked: restart`;
      return false;
    }

    const team = this.playerTeam;
    const activeDeck = this.getActiveDeckKind();
    const teamState = this.state.teams[team];
    const hand = activeDeck === "ATTACK" ? teamState.handAttack : teamState.handDefense;
    const deck = activeDeck === "ATTACK" ? teamState.deckAttack : teamState.deckDefense;

    const idx = hand.cards.indexOf(cardId);
    if (idx < 0) {
      this.lastActionMessage = "Card not in active hand";
      this.lastCardDebugLine = `${cardId} -> N/A -> rejected: not_in_hand`;
      return false;
    }

    if (activeDeck === "ATTACK") {
      const carrierId = this.state.ball.carrierId;
      if (!carrierId || this.state.players[carrierId].teamId !== team) {
        this.lastActionMessage = "No carrier under control";
        this.lastCardDebugLine = `${cardId} -> N/A -> rejected: no_carrier`;
        return false;
      }
    }

    const prevCooldown = teamState.cooldowns[cardId] ?? 0;
    const prevLockout = teamState.lockoutMs;
    const card = this.resolver.tryPlay(this.state, team, cardId, activeDeck);
    if (!card) {
      this.lastActionMessage = "Card unavailable (cooldown/lockout/context)";
      this.lastCardDebugLine = `${cardId} -> N/A -> rejected: cooldown_lockout_context`;
      return false;
    }

    const applied = this.applyCardEffect(team, card, input);
    if (!applied) {
      teamState.cooldowns[cardId] = prevCooldown;
      teamState.lockoutMs = prevLockout;
      this.lastActionMessage = "Card had no valid target";
      this.lastCardDebugLine = `${cardId} -> ${card.type} -> rejected: invalid_target`;
      return false;
    }

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

  private applyCardEffect(team: TeamId, card: CardDef, _input: CardInput) {
    switch (card.type) {
      case "PASS":
        return this.playShortPass(team);
      case "THROUGH_PASS":
      case "LONG_BALL":
        return this.playLongPass(team);
      case "CROSS":
        return this.playCross(team);
      case "DRIBBLE":
        return this.playDribble(team);
      case "RUSH":
        return this.playRush(team);
      case "SHOOT":
        return this.playShoot(team);
      case "TACKLE":
        return this.playTackle(team, card.id.includes("SLIDE") ? "SLIDING" : "STANDING");
      case "PRESS":
        return this.playPress(team);
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

  private playShortPass(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const target =
      this.pickBestTeammate(team, carrier.id, 16, 300, false) ??
      this.pickBestTeammate(team, carrier.id, 8, 520, false) ??
      this.getNearestTeammate(team, carrier.id);
    if (!target) return false;

    carrier.intent = {
      type: "PASS_TO_DIRECTION",
      targetPlayerId: target.id,
      targetPos: { x: target.pos.x, y: target.pos.y },
      expiresAtMs: this.state.timeMs + 700,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, target.pos);
    if (!ok) return false;
    this.ballSystem.grantCarrierProtection(this.state, 260);
    return true;
  }

  private playLongPass(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const target =
      this.pickBestTeammate(team, carrier.id, 80, 650, true) ??
      this.pickBestTeammate(team, carrier.id, 30, 760, true);
    if (!target) return false;

    carrier.intent = {
      type: "THROUGH_TO_DIRECTION",
      targetPlayerId: target.id,
      targetPos: { x: target.pos.x, y: target.pos.y },
      expiresAtMs: this.state.timeMs + 850,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, target.pos);
    if (!ok) return false;
    return true;
  }

  private playCross(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;

    const inOwnHalf = team === "HOME" ? carrier.pos.x < 480 : carrier.pos.x > 480;
    let target: Vec2 | null = null;

    if (inOwnHalf) {
      const oppSide = this.pickBestTeammate(team, carrier.id, 80, 420, false, true);
      if (oppSide) target = { x: oppSide.pos.x, y: oppSide.pos.y };
    } else {
      const boxCenterX = team === "HOME" ? GOAL_LINE_RIGHT_X - 110 : GOAL_LINE_LEFT_X + 110;
      const boxMate = this.pickBestTeammate(team, carrier.id, 80, 380, true, false, true);
      target = boxMate ? { x: boxMate.pos.x, y: boxMate.pos.y } : { x: boxCenterX, y: PITCH_CENTER_Y };
    }

    if (!target) return false;
    carrier.intent = {
      type: "THROUGH_TO_DIRECTION",
      targetPos: target,
      expiresAtMs: this.state.timeMs + 900,
      priority: 100,
    };
    const ok = this.ballSystem.passTo(this.state, target);
    if (!ok) return false;
    return true;
  }

  private playRush(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const target = this.findOpenRunTarget(carrier.pos, team, 260);
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

  private playDribble(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const target = this.findOpenRunTarget(carrier.pos, team, 140);
    carrier.intent = {
      type: "DRIBBLE_TO_DIRECTION",
      targetPos: target,
      expiresAtMs: this.state.timeMs + 800,
      priority: 100,
    };
    this.ballSystem.grantCarrierProtection(this.state, 700);
    return true;
  }

  private playShoot(team: TeamId) {
    const carrier = this.getCarrierForTeam(team);
    if (!carrier) return false;
    const goal = this.getShotTarget(team);
    const dist = Math.hypot(goal.x - carrier.pos.x, goal.y - carrier.pos.y);
    const inGoodLane = this.isInOppPenaltyArea(carrier.pos, team) || dist < 250;
    if (inGoodLane) {
      carrier.intent = {
        type: "SHOOT_TO_DIRECTION",
        targetPos: goal,
        expiresAtMs: this.state.timeMs + 500,
        priority: 100,
      };
      return this.ballSystem.shootTo(this.state, goal);
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

  private playTackle(team: TeamId, mode: "STANDING" | "SLIDING") {
    this.assignNearestDefenderIntent(team, {
      type: "TACKLE_TARGET",
      expiresAtMs: this.state.timeMs + (mode === "SLIDING" ? 820 : 620),
      priority: 100,
    });
    const result = this.tackleSystem.tryCardTackle(this.state, team, this.ballSystem, mode);
    this.lastActionMessage = result === "MISS" ? "Tackle: closing down" : `Tackle ${result.toLowerCase()}`;
    return true;
  }

  private playPress(team: TeamId) {
    const carrierId = this.state.ball.carrierId;
    if (!carrierId) return false;
    const carrier = this.state.players[carrierId];
    const nearest = this.getNearestOutfieldPlayer(team);
    if (!nearest) return false;
    nearest.intent = {
      type: "PRESS_ZONE",
      targetPlayerId: carrier.id,
      targetPos: { x: carrier.pos.x + (team === "HOME" ? -12 : 12), y: carrier.pos.y },
      expiresAtMs: this.state.timeMs + 1200,
      priority: 95,
    };
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

  private pickBestTeammate(
    team: TeamId,
    fromId: string,
    minDist: number,
    maxDist: number,
    preferForward: boolean,
    preferWide = false,
    preferBox = false
  ) {
    const from = this.state.players[fromId];
    const ids = this.state.teams[team].playerIds.filter((id) => id !== fromId);

    let bestId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const id of ids) {
      const p = this.state.players[id];
      const d = Math.hypot(p.pos.x - from.pos.x, p.pos.y - from.pos.y);
      if (d < minDist || d > maxDist) continue;

      const forward = team === "HOME" ? p.pos.x - from.pos.x : from.pos.x - p.pos.x;
      const lane = 1 - Math.min(1, Math.abs(p.pos.y - PITCH_CENTER_Y) / 280);
      const wide = Math.min(1, Math.abs(p.pos.y - PITCH_CENTER_Y) / 280);
      const boxBonus = preferBox && this.isInOppPenaltyArea(p.pos, team) ? 0.7 : 0;
      const score =
        forward * (preferForward ? 1.2 : 0.55) +
        (preferWide ? wide : lane) * 40 +
        boxBonus * 100 +
        (p.stats.pas + p.stats.sho + p.stats.dri) * 0.25;

      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestId ? this.state.players[bestId] : null;
  }

  private getNearestTeammate(team: TeamId, fromId: string) {
    const from = this.state.players[fromId];
    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const id of this.state.teams[team].playerIds) {
      if (id === fromId) continue;
      const p = this.state.players[id];
      const d = Math.hypot(p.pos.x - from.pos.x, p.pos.y - from.pos.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId ? this.state.players[bestId] : null;
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
