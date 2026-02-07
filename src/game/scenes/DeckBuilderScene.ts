import Phaser from "phaser";
import attackCatalog from "../../data/cards.attack.json";
import defenseCatalog from "../../data/cards.defense.json";
import { ATTACK_DECK_CONSTRAINTS, DEFENSE_DECK_CONSTRAINTS } from "../../sim/cards/DeckConstraints";
import type { CardDef } from "../../sim/cards/types";
import { validateDeck } from "../../sim/cards/validators/DeckValidator";
import { updateDecks, loadProfile } from "../profile/ProfileStore";

function countByType(cards: CardDef[]) {
  const out: Record<string, number> = {};
  for (const c of cards) out[c.type] = (out[c.type] ?? 0) + 1;
  return out;
}

function cardsByType(cards: CardDef[]) {
  const out: Record<string, CardDef[]> = {};
  for (const c of cards) {
    if (!out[c.type]) out[c.type] = [];
    out[c.type].push(c);
  }
  return out;
}

export class DeckBuilderScene extends Phaser.Scene {
  private attackCounts: Record<string, number> = {};
  private defenseCounts: Record<string, number> = {};
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("DeckBuilderScene");
  }

  create() {
    const profile = loadProfile();
    const attackCards = attackCatalog.cards as CardDef[];
    const defenseCards = defenseCatalog.cards as CardDef[];
    const attackMap = new Map(attackCards.map((c) => [c.id, c]));
    const defenseMap = new Map(defenseCards.map((c) => [c.id, c]));

    this.attackCounts = countByType(profile.attackDeckIds.map((id) => attackMap.get(id)).filter(Boolean) as CardDef[]);
    this.defenseCounts = countByType(profile.defenseDeckIds.map((id) => defenseMap.get(id)).filter(Boolean) as CardDef[]);

    this.add.text(30, 24, "Deck Builder", { fontFamily: "monospace", fontSize: "28px", color: "#f0fff6" });

    this.drawSection("Attack Deck", 40, this.attackCounts, ATTACK_DECK_CONSTRAINTS.byType);
    this.drawSection("Defense Deck", 500, this.defenseCounts, DEFENSE_DECK_CONSTRAINTS.byType);

    const saveBtn = this.add.rectangle(320, 492, 200, 38, 0x1f5f45, 1).setStrokeStyle(2, 0xb7ffe3, 0.9).setInteractive({ useHandCursor: true });
    this.add.text(320, 492, "Save Decks", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);

    const backBtn = this.add.rectangle(600, 492, 200, 38, 0x25342d, 1).setStrokeStyle(2, 0xb7ffe3, 0.9).setInteractive({ useHandCursor: true });
    this.add.text(600, 492, "Back", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);

    this.message = this.add.text(30, 520, "", { fontFamily: "monospace", fontSize: "13px", color: "#ffd791" });

    saveBtn.on("pointerdown", () => {
      const attackDeck = this.materializeDeck(attackCards, this.attackCounts);
      const defenseDeck = this.materializeDeck(defenseCards, this.defenseCounts);

      const attackErrors = validateDeck(attackDeck, ATTACK_DECK_CONSTRAINTS);
      const defenseErrors = validateDeck(defenseDeck, DEFENSE_DECK_CONSTRAINTS);
      if (attackErrors.length || defenseErrors.length) {
        this.message.setText([attackErrors[0], defenseErrors[0]].filter(Boolean).join(" | "));
        return;
      }

      updateDecks({
        attackDeckIds: attackDeck.map((c) => c.id),
        defenseDeckIds: defenseDeck.map((c) => c.id),
      });
      this.message.setText("Decks saved.");
    });

    backBtn.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }

  private drawSection(
    title: string,
    x: number,
    counts: Record<string, number>,
    rules: Record<string, { min: number; max: number }>
  ) {
    this.add.text(x, 72, title, { fontFamily: "monospace", fontSize: "18px", color: "#eafff6" });

    const rows = Object.keys(rules);
    rows.forEach((type, idx) => {
      const y = 110 + idx * 36;
      const rule = rules[type];
      const value = counts[type] ?? 0;

      this.add.text(x, y, `${type} (${rule.min}-${rule.max})`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#cffff0",
      });

      const valueText = this.add.text(x + 190, y, `${value}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#f6fff9",
      });

      const minus = this.add.rectangle(x + 230, y + 9, 20, 18, 0x3a2a2a, 1).setStrokeStyle(1, 0xffc7b7, 0.8).setInteractive({ useHandCursor: true });
      const plus = this.add.rectangle(x + 256, y + 9, 20, 18, 0x2a3a30, 1).setStrokeStyle(1, 0xb7ffe3, 0.8).setInteractive({ useHandCursor: true });
      this.add.text(x + 230, y + 9, "-", { fontFamily: "monospace", fontSize: "12px", color: "#fff" }).setOrigin(0.5);
      this.add.text(x + 256, y + 9, "+", { fontFamily: "monospace", fontSize: "12px", color: "#fff" }).setOrigin(0.5);

      minus.on("pointerdown", () => {
        counts[type] = Math.max(rule.min, (counts[type] ?? 0) - 1);
        valueText.setText(`${counts[type]}`);
      });

      plus.on("pointerdown", () => {
        counts[type] = Math.min(rule.max, (counts[type] ?? 0) + 1);
        valueText.setText(`${counts[type]}`);
      });
    });
  }

  private materializeDeck(allCards: CardDef[], counts: Record<string, number>) {
    const grouped = cardsByType(allCards);
    const out: CardDef[] = [];
    for (const [type, n] of Object.entries(counts)) {
      out.push(...(grouped[type] ?? []).slice(0, n));
    }
    return out.slice(0, 15);
  }
}
