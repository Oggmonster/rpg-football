import { CARD_LOCKOUT_MS } from "../config/MatchConfig";
import type { DeckKind, MatchState, TeamId } from "../state/MatchState";
import type { CardCatalog } from "./CardCatalog";
import type { CardDef } from "./types";

export interface CardInput {
  direction?: { x: number; y: number };
  targetPlayerId?: string;
}

export class CardResolver {
  private catalogAttack: CardCatalog;
  private catalogDefense: CardCatalog;

  constructor(catalogAttack: CardCatalog, catalogDefense: CardCatalog) {
    this.catalogAttack = catalogAttack;
    this.catalogDefense = catalogDefense;
  }

  tryPlay(match: MatchState, team: TeamId, cardId: string, expectedDeck: DeckKind): CardDef | null {
    const card = this.findCard(cardId);
    if (!card) return null;
    if (card.deck !== expectedDeck) return null;
    if (!this.canPlay(match, team, card)) return null;

    const t = match.teams[team];
    t.cooldowns[cardId] = card.cooldownMs;
    t.lockoutMs = CARD_LOCKOUT_MS;

    return card;
  }

  private canPlay(match: MatchState, team: TeamId, card: CardDef): boolean {
    const t = match.teams[team];
    const cd = t.cooldowns[card.id] ?? 0;
    if (cd > 0) return false;
    if (t.lockoutMs > 0) return false;

    const teamHasBall = match.possession.team === team;
    if (card.deck === "ATTACK") {
      if (!teamHasBall) return false;
      return this.validateAttackContext(card.type);
    }

    if (teamHasBall) return false;
    return this.validateDefenseContext(card.type);
  }

  private validateAttackContext(type: string): boolean {
    return ["PASS", "THROUGH_PASS", "LONG_BALL", "CROSS", "DRIBBLE", "RUSH", "SHOOT"].includes(type);
  }

  private validateDefenseContext(type: string): boolean {
    return ["TACKLE", "PRESS", "COVER", "INTERCEPT"].includes(type);
  }

  private findCard(cardId: string) {
    return this.catalogAttack.get(cardId) ?? this.catalogDefense.get(cardId);
  }
}
