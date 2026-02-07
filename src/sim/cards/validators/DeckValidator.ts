import type { CardDef } from "../types";

export interface DeckConstraints {
  total: number;
  byType: Record<string, { min: number; max: number }>;
}

export function validateDeck(deck: CardDef[], constraints: DeckConstraints): string[] {
  const errors: string[] = [];

  if (deck.length !== constraints.total) {
    errors.push(`Deck must be exactly ${constraints.total} cards (got ${deck.length}).`);
  }

  const counts: Record<string, number> = {};
  for (const c of deck) {
    counts[c.type] = (counts[c.type] ?? 0) + 1;
  }

  for (const [type, rule] of Object.entries(constraints.byType)) {
    const n = counts[type] ?? 0;
    if (n < rule.min) errors.push(`Need at least ${rule.min} of ${type} (got ${n}).`);
    if (n > rule.max) errors.push(`Need at most ${rule.max} of ${type} (got ${n}).`);
  }

  return errors;
}
