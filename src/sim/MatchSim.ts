import { CardCatalog } from "./cards/CardCatalog";
import { CardResolver, type CardInput } from "./cards/CardResolver";
import type { CardDef } from "./cards/types";
import { DECK_SIZE, HAND_SIZE } from "./config/MatchConfig";
import type { SimEvent } from "./events/SimEvent";
import { RNG } from "./math/RNG";
import { shuffleInPlace } from "./math/shuffle";
import { createInitialMatchState } from "./state/createInitialMatchState";
import { serializeMatchState } from "./state/serializeMatchState";
import type { DeckKind, DeckState, HandState, MatchState, TeamId } from "./state/MatchState";

type CatalogJson = { cards: CardDef[] };

export class MatchSim {
  private state: MatchState;
  private resolver: CardResolver;
  private eventQueue: SimEvent[] = [];

  constructor(state: MatchState, attackCatalog: CardCatalog, defenseCatalog: CardCatalog) {
    this.state = state;
    this.resolver = new CardResolver(attackCatalog, defenseCatalog);
  }

  static createFromCatalogs(args: {
    attackCatalog: CatalogJson;
    defenseCatalog: CatalogJson;
    rngSeed: number;
  }): MatchSim {
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
    this.state.timeMs = Math.min(this.state.timeMs + dtMs, this.state.durationMs);
    if (this.state.phase === "KICKOFF" && this.state.timeMs > 0) {
      this.state.phase = "LIVE";
    }
    if (this.state.timeMs >= this.state.durationMs) {
      this.state.phase = "ENDED";
    }

    for (const team of Object.values(this.state.teams)) {
      for (const [id, cd] of Object.entries(team.cooldowns)) {
        team.cooldowns[id] = Math.max(0, cd - dtMs);
      }
    }
  }

  togglePossession() {
    const next = this.getActiveTeam() === "HOME" ? "AWAY" : "HOME";
    this.state.possession.team = next;
    this.state.possession.lastTouchTeam = next;
    this.state.ball.lastTouchTeam = next;
    this.eventQueue.push({
      type: "possession_changed",
      atMs: this.state.timeMs,
      team: next,
      deck: this.getActiveDeckKind(),
    });
  }

  getActiveTeam(): TeamId {
    return this.state.possession.team === "NEUTRAL" ? this.state.possession.lastTouchTeam : this.state.possession.team;
  }

  getActiveDeckKind(): DeckKind {
    return "ATTACK";
  }

  getActiveHandCardIds(): string[] {
    const t = this.state.teams[this.getActiveTeam()];
    return t.handAttack.cards;
  }

  playCard(cardId: string, input: CardInput): boolean {
    const team = this.getActiveTeam();
    const t = this.state.teams[team];

    const hand = t.handAttack;
    const idx = hand.cards.indexOf(cardId);
    if (idx < 0) return false;

    if (!this.resolver.play(this.state, team, cardId, input)) return false;

    hand.cards.splice(idx, 1);
    t.deckAttack.draw.push(cardId);
    this.drawUpTo(t.deckAttack, hand, HAND_SIZE);
    this.eventQueue.push({
      type: "card_played",
      atMs: this.state.timeMs,
      team,
      cardId,
      deck: "ATTACK",
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
}
