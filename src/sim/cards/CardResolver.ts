import type { DeckKind, MatchState, TeamId } from "../state/MatchState";
import type { CardCatalog } from "./CardCatalog";

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

  canPlay(match: MatchState, team: TeamId, cardId: string): boolean {
    const t = match.teams[team];
    const cd = t.cooldowns[cardId] ?? 0;
    return cd <= 0;
  }

  play(match: MatchState, team: TeamId, cardId: string, _input: CardInput): boolean {
    const card = this.findCard(cardId);
    if (!card) return false;
    if (!this.canPlay(match, team, cardId)) return false;

    match.teams[team].cooldowns[cardId] = card.cooldownMs;
    return true;
  }

  getDeckKind(cardId: string): DeckKind | null {
    const card = this.findCard(cardId);
    return card?.deck ?? null;
  }

  private findCard(cardId: string) {
    return this.catalogAttack.get(cardId) ?? this.catalogDefense.get(cardId);
  }
}
