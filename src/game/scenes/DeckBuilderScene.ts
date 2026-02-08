import Phaser from "phaser";
import attackCatalog from "../../data/cards.attack.json";
import defenseCatalog from "../../data/cards.defense.json";
import { ATTACK_DECK_CONSTRAINTS, DEFENSE_DECK_CONSTRAINTS } from "../../sim/cards/DeckConstraints";
import type { CardDef } from "../../sim/cards/types";
import { validateDeck } from "../../sim/cards/validators/DeckValidator";
import { applyStarterPreset, getStarterPresets, loadProfile, updateDecks } from "../profile/ProfileStore";

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
    this.add.text(30, 56, "Use starter presets for tactical identity and tweak card type ratios.", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b5efd6",
    });

    this.drawSection("Attack Deck", 40, this.attackCounts, ATTACK_DECK_CONSTRAINTS.byType);
    this.drawSection("Defense Deck", 380, this.defenseCounts, DEFENSE_DECK_CONSTRAINTS.byType);

    this.drawTeamCommandLoadout(710, 96, profile.teamCommandDeckIds);

    const presets = getStarterPresets();
    presets.forEach((preset, i) => {
      const y = 288 + i * 58;
      const btn = this.add
        .rectangle(710, y, 230, 48, 0x223a31, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0xb7ffe3, 0.7)
        .setInteractive({ useHandCursor: true });
      this.add.text(720, y + 6, preset.label, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e7fff3",
      });
      this.add.text(720, y + 22, preset.description, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#b2dfcc",
        wordWrap: { width: 210 },
      });

      btn.on("pointerdown", () => {
        applyStarterPreset(preset.id);
        this.scene.restart();
      });
    });

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
        teamCommandDeckIds: profile.teamCommandDeckIds,
      });
      this.message.setText("Decks and command loadout saved.");
    });

    backBtn.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }

  private drawSection(
    title: string,
    x: number,
    counts: Record<string, number>,
    rules: Record<string, { min: number; max: number }>
  ) {
    this.add.text(x, 88, title, { fontFamily: "monospace", fontSize: "18px", color: "#eafff6" });

    const rows = Object.keys(rules);
    rows.forEach((type, idx) => {
      const y = 126 + idx * 34;
      const rule = rules[type];
      const value = counts[type] ?? 0;

      this.add.text(x, y, `${type} (${rule.min}-${rule.max})`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cffff0",
      });

      const valueText = this.add.text(x + 176, y, `${value}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f6fff9",
      });

      const minus = this.add.rectangle(x + 210, y + 8, 20, 18, 0x3a2a2a, 1).setStrokeStyle(1, 0xffc7b7, 0.8).setInteractive({ useHandCursor: true });
      const plus = this.add.rectangle(x + 236, y + 8, 20, 18, 0x2a3a30, 1).setStrokeStyle(1, 0xb7ffe3, 0.8).setInteractive({ useHandCursor: true });
      this.add.text(x + 210, y + 8, "-", { fontFamily: "monospace", fontSize: "12px", color: "#fff" }).setOrigin(0.5);
      this.add.text(x + 236, y + 8, "+", { fontFamily: "monospace", fontSize: "12px", color: "#fff" }).setOrigin(0.5);

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

  private drawTeamCommandLoadout(x: number, y: number, commandIds: string[]) {
    this.add.text(x, y, "Team Command Loadout", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#eafff6",
    });
    for (let i = 0; i < 5; i++) {
      const cmd = commandIds[i] ?? "-";
      this.add
        .rectangle(x, y + 24 + i * 30, 230, 24, 0x1f2f29, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x9cd9c1, 0.7);
      this.add.text(x + 8, y + 30 + i * 30, cmd.replaceAll("_", " "), {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#dffcf0",
      });
    }
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
