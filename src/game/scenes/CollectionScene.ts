import Phaser from "phaser";
import { SQUAD_SIZE } from "../../sim/config/MatchConfig";
import { loadProfile, updateSquad } from "../profile/ProfileStore";

export class CollectionScene extends Phaser.Scene {
  private selected = new Set<string>();
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("CollectionScene");
  }

  create() {
    const profile = loadProfile();
    this.selected = new Set(profile.squadIds);

    this.add.text(24, 18, "Roster Room", { fontFamily: "Georgia", fontSize: "30px", color: "#f0fff6", fontStyle: "bold" });
    this.add.text(24, 48, "Your selected squad now drives the home offense/defense ratings in the turn-based football match.", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#b4efd6",
    });

    const cardsPerColumn = 5;
    const cardWidth = 214;
    const cardHeight = 74;
    const colGap = 12;

    profile.collection.forEach((p, i) => {
      const col = Math.floor(i / cardsPerColumn);
      const row = i % cardsPerColumn;
      const x = 24 + col * (cardWidth + colGap);
      const y = 76 + row * (cardHeight + 8);
      const selected = this.selected.has(p.id);

      const bg = this.add
        .rectangle(x, y, cardWidth, cardHeight, selected ? 0x1e4f3a : 0x1a2722, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, selected ? 0xc4ffe7 : 0x83b7a4, 0.72)
        .setInteractive({ useHandCursor: true });

      const title = this.add.text(x + 8, y + 6, `${p.name} [${p.role}] ${p.rarity} Lv${p.level}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ebfff5",
      });

      const arc = this.add.text(x + 8, y + 22, `${p.archetypeName} (${p.tacticalIdentity})`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#afe7ff",
      });

      const traits = this.add.text(x + 8, y + 36, `Traits: ${[...p.traits, ...p.bonusTraits].join(" | ")}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#c6ffe9",
      });

      const growth = this.add.text(x + 8, y + 50, `XP ${p.xp} | Caps PAS ${p.growthCaps.pas} DEF ${p.growthCaps.def} | Perks ${p.perkSlots.unlocked}/${p.perkSlots.total}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffdfb2",
      });

      bg.on("pointerdown", () => {
        if (this.selected.has(p.id)) {
          this.selected.delete(p.id);
        } else if (this.selected.size < SQUAD_SIZE) {
          this.selected.add(p.id);
        }

        const nowSelected = this.selected.has(p.id);
        bg.setFillStyle(nowSelected ? 0x1e4f3a : 0x1a2722, 1);
        bg.setStrokeStyle(2, nowSelected ? 0xc4ffe7 : 0x83b7a4, 0.72);
        this.status.setText(`Selected ${this.selected.size}/${SQUAD_SIZE}`);
      });

      this.add.existing(title);
      this.add.existing(arc);
      this.add.existing(traits);
      this.add.existing(growth);
    });

    const saveBtn = this.add
      .rectangle(310, 502, 230, 38, 0x1f5f45, 1)
      .setStrokeStyle(2, 0xb7ffe3, 0.9)
      .setInteractive({ useHandCursor: true });
    const backBtn = this.add
      .rectangle(610, 502, 230, 38, 0x25342d, 1)
      .setStrokeStyle(2, 0xb7ffe3, 0.9)
      .setInteractive({ useHandCursor: true });

    this.add.text(310, 502, "Save Squad", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);
    this.add.text(610, 502, "Back", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);

    this.status = this.add.text(24, 528, `Selected ${this.selected.size}/${SQUAD_SIZE}`, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffd791",
    });

    saveBtn.on("pointerdown", () => {
      if (this.selected.size !== SQUAD_SIZE) {
        this.status.setText(`Select exactly ${SQUAD_SIZE} players.`);
        return;
      }
      updateSquad([...this.selected]);
      this.status.setText("Squad saved.");
    });

    backBtn.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }
}
