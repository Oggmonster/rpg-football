import type { CardDef } from "./types";

export class CardCatalog {
  private map = new Map<string, CardDef>();

  constructor(cards: CardDef[]) {
    for (const c of cards) {
      this.map.set(c.id, c);
    }
  }

  get(id: string): CardDef | undefined {
    return this.map.get(id);
  }

  ids(): string[] {
    return [...this.map.keys()];
  }
}
