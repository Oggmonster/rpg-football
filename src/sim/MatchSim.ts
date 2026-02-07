import { CardCatalog } from "./cards/CardCatalog";
import { CardResolver, type CardInput } from "./cards/CardResolver";
import { ATTACK_DECK_CONSTRAINTS, DEFENSE_DECK_CONSTRAINTS } from "./cards/DeckConstraints";
import type { CardDef } from "./cards/types";
import { validateDeck } from "./cards/validators/DeckValidator";
import { DECK_SIZE, HAND_SIZE } from "./config/MatchConfig";
import type { SimEvent } from "./events/SimEvent";
import { RNG } from "./math/RNG";
import { shuffleInPlace } from "./math/shuffle";
import { createInitialMatchState } from "./state/createInitialMatchState";
import { serializeMatchState } from "./state/serializeMatchState";
import type { DeckKind, DeckState, HandState, IntentState, MatchState, TeamId, Vec2 } from "./state/MatchState";
import { AISystem } from "./systems/AISystem";
import { BallSystem } from "./systems/BallSystem";
import { InterceptSystem } from "./systems/InterceptSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { PassSystem } from "./systems/PassSystem";
import { TackleSystem } from "./systems/TackleSystem";

type CatalogJson = { cards: CardDef[] };

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

  constructor(state: MatchState, attackCatalog: CardCatalog, defenseCatalog: CardCatalog) {
    this.state = state;
    this.resolver = new CardResolver(attackCatalog, defenseCatalog);
    this.ballSystem = new BallSystem(state.rngSeed);
    this.aiSystem = new AISystem();
    this.passSystem = new PassSystem();
    this.interceptSystem = new InterceptSystem();
    this.movementSystem = new MovementSystem();
    this.tackleSystem = new TackleSystem(state.rngSeed);
  }

  static createFromCatalogs(args: {
    attackCatalog: CatalogJson;
    defenseCatalog: CatalogJson;
    rngSeed: number;
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

    const state = createInitialMatchState({
      rngSeed: args.rngSeed,
      homeDecks: { attack: attackDeckIds, defense: defenseDeckIds },
      awayDecks: { attack: attackDeckIds, defense: defenseDeckIds },
    });

    const sim = new MatchSim(state, attack, defense);

    sim.drawUpTo(state.teams.HOME.deckAttack, state.teams.HOME.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.HOME.deckDefense, state.teams.HOME.handDefense, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckAttack, state.teams.AWAY.handAttack, HAND_SIZE);
    sim.drawUpTo(state.teams.AWAY.deckDefense, state.teams.AWAY.handDefense, HAND_SIZE);

    return sim;
  }

  step(dtMs: number) {
    const prevPossession = this.state.possession.team;

    this.state.timeMs = Math.min(this.state.timeMs + dtMs, this.state.durationMs);
    if (this.state.phase === "KICKOFF" && this.state.timeMs > 0) {
      this.state.phase = "LIVE";
    }
    if (this.state.timeMs >= this.state.durationMs) {
      this.state.phase = "ENDED";
    }

    for (const team of Object.values(this.state.teams)) {
      team.lockoutMs = Math.max(0, team.lockoutMs - dtMs);
      for (const [id, cd] of Object.entries(team.cooldowns)) {
        team.cooldowns[id] = Math.max(0, cd - dtMs);
      }
    }

    this.expireIntents();

    this.aiSystem.step(this.state, this.ballSystem, this.passSystem);
    this.interceptSystem.step(this.state);
    this.movementSystem.step(this.state, dtMs);
    this.tackleSystem.step(this.state, dtMs, this.ballSystem);

    const transitions = this.ballSystem.step(this.state, dtMs);
    for (const t of transitions) {
      this.eventQueue.push({
        type: "ball_transition",
        atMs: this.state.timeMs,
        from: t.from,
        to: t.to,
        reason: t.reason,
      });
      if (t.to === "GOAL") {
        this.eventQueue.push({
          type: "goal_scored",
          atMs: this.state.timeMs,
          team: this.state.ball.lastTouchTeam,
          home: this.state.score.HOME,
          away: this.state.score.AWAY,
        });
      }
    }

    if (prevPossession !== this.state.possession.team && this.state.possession.team !== "NEUTRAL") {
      this.eventQueue.push({
        type: "possession_changed",
        atMs: this.state.timeMs,
        team: this.state.possession.team,
        deck: this.getActiveDeckKind(),
      });
    }
  }

  togglePossession() {
    const next = this.state.possession.lastTouchTeam === "HOME" ? "AWAY" : "HOME";
    const ids = this.state.teams[next].playerIds;
    const carrierId = ids.find((id) => this.state.players[id].role !== "GK") ?? ids[0];
    this.state.ball.carrierId = carrierId;
    this.state.ball.state = "CARRIED";
    this.state.ball.vel = { x: 0, y: 0 };
    this.state.ball.targetPos = null;
    this.state.ball.lastTouchTeam = next;
    this.state.possession.team = next;
    this.state.possession.lastTouchTeam = next;
    this.eventQueue.push({
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
    if (this.state.possession.team === this.playerTeam) return "ATTACK";
    if (this.state.possession.team === "NEUTRAL") {
      return this.state.possession.lastTouchTeam === this.playerTeam ? "ATTACK" : "DEFENSE";
    }
    return "DEFENSE";
  }

  getActiveHandCardIds(): string[] {
    const team = this.state.teams[this.playerTeam];
    return this.getActiveDeckKind() === "ATTACK" ? team.handAttack.cards : team.handDefense.cards;
  }

  playCard(cardId: string, input: CardInput): boolean {
    const team = this.playerTeam;
    const activeDeck = this.getActiveDeckKind();
    const teamState = this.state.teams[team];
    const hand = activeDeck === "ATTACK" ? teamState.handAttack : teamState.handDefense;
    const deck = activeDeck === "ATTACK" ? teamState.deckAttack : teamState.deckDefense;

    const idx = hand.cards.indexOf(cardId);
    if (idx < 0) return false;

    const card = this.resolver.tryPlay(this.state, team, cardId, activeDeck);
    if (!card) return false;

    this.applyCardEffect(team, card, input);

    hand.cards.splice(idx, 1);
    deck.draw.push(cardId);
    this.drawUpTo(deck, hand, HAND_SIZE);

    this.eventQueue.push({
      type: "card_played",
      atMs: this.state.timeMs,
      team,
      cardId,
      deck: activeDeck,
    });

    return true;
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

  private drawUpTo(deck: DeckState, hand: HandState, target: number) {
    while (hand.cards.length < target && deck.draw.length > 0) {
      const top = deck.draw.shift();
      if (!top) break;
      hand.cards.push(top);
    }
  }

  private applyCardEffect(team: TeamId, card: CardDef, input: CardInput) {
    switch (card.type) {
      case "PASS":
        this.assignCarrierIntent(team, {
          type: "PASS_TO_DIRECTION",
          direction: input.direction,
          expiresAtMs: this.state.timeMs + 800,
          priority: 100,
        });
        this.ballSystem.passTo(this.state, this.getCardTarget(team, input.direction, 180));
        break;
      case "THROUGH_PASS":
        this.assignCarrierIntent(team, {
          type: "THROUGH_TO_DIRECTION",
          direction: input.direction,
          expiresAtMs: this.state.timeMs + 900,
          priority: 100,
        });
        this.ballSystem.passTo(this.state, this.getCardTarget(team, input.direction, 240));
        break;
      case "DRIBBLE":
        this.assignCarrierIntent(team, {
          type: "DRIBBLE_TO_DIRECTION",
          direction: input.direction,
          expiresAtMs: this.state.timeMs + 600,
          priority: 100,
        });
        break;
      case "RUSH":
        this.assignCarrierIntent(team, {
          type: "CARRY_BURST",
          direction: input.direction,
          expiresAtMs: this.state.timeMs + 900,
          priority: 100,
        });
        break;
      case "SHOOT":
        this.assignCarrierIntent(team, {
          type: "SHOOT_TO_DIRECTION",
          direction: input.direction,
          expiresAtMs: this.state.timeMs + 500,
          priority: 100,
        });
        this.ballSystem.shootTo(this.state, this.getShotTarget(team));
        break;
      case "TACKLE":
        this.assignNearestDefenderIntent(team, {
          type: "TACKLE_TARGET",
          expiresAtMs: this.state.timeMs + 600,
          priority: 100,
        });
        this.tackleSystem.step(this.state, 100, this.ballSystem);
        break;
      case "PRESS":
        this.assignNearestDefenderIntent(team, {
          type: "PRESS_ZONE",
          expiresAtMs: this.state.timeMs + 1200,
          priority: 90,
        });
        break;
      case "COVER":
        this.assignNearestDefenderIntent(team, {
          type: "COVER_ZONE",
          expiresAtMs: this.state.timeMs + 1500,
          priority: 90,
        });
        break;
      case "INTERCEPT":
        this.assignNearestDefenderIntent(team, {
          type: "INTERCEPT_LANE",
          expiresAtMs: this.state.timeMs + 1200,
          priority: 95,
        });
        this.interceptSystem.step(this.state);
        break;
    }
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

  private getCardTarget(team: TeamId, direction: Vec2 | undefined, distance: number): Vec2 {
    const fallback = team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 };
    const dir = direction ?? fallback;
    return {
      x: this.state.ball.pos.x + dir.x * distance,
      y: this.state.ball.pos.y + dir.y * distance,
    };
  }

  private getShotTarget(team: TeamId): Vec2 {
    return team === "HOME" ? { x: 960, y: 270 } : { x: 0, y: 270 };
  }

  private expireIntents() {
    for (const p of Object.values(this.state.players)) {
      if (p.intent && p.intent.expiresAtMs <= this.state.timeMs) {
        p.intent = null;
      }
    }
  }
}
