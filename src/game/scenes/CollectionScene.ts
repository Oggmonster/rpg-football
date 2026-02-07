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

    this.add.text(24, 20, "Player Collection", { fontFamily: "monospace", fontSize: "28px", color: "#f0fff6" });

    profile.collection.forEach((p, i) => {
      const col = Math.floor(i / 6);
      const row = i % 6;
      const x = 34 + col * 452;
      const y = 70 + row * 66;

      const bg = this.add
        .rectangle(x, y, 430, 56, this.selected.has(p.id) ? 0x1e4f3a : 0x1c2a24, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xb7ffe3, 0.65)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(x + 10, y + 8, `${p.name} [${p.role}] ${p.rarity} | PAC ${p.stats.pac} SHO ${p.stats.sho} PAS ${p.stats.pas} DRI ${p.stats.dri} DEF ${p.stats.def} PHY ${p.stats.phy}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ebfff5",
      });

      bg.on("pointerdown", () => {
        if (this.selected.has(p.id)) {
          this.selected.delete(p.id);
        } else if (this.selected.size < SQUAD_SIZE) {
          this.selected.add(p.id);
        }
        bg.setFillStyle(this.selected.has(p.id) ? 0x1e4f3a : 0x1c2a24, 1);
        this.status.setText(`Selected ${this.selected.size}/${SQUAD_SIZE}`);
      });

      this.add.existing(txt);
    });

    const saveBtn = this.add.rectangle(300, 490, 220, 38, 0x1f5f45, 1).setStrokeStyle(2, 0xb7ffe3, 0.9).setInteractive({ useHandCursor: true });
    const backBtn = this.add.rectangle(560, 490, 220, 38, 0x25342d, 1).setStrokeStyle(2, 0xb7ffe3, 0.9).setInteractive({ useHandCursor: true });

    this.add.text(300, 490, "Save Squad", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);
    this.add.text(560, 490, "Back", { fontFamily: "monospace", fontSize: "15px", color: "#eafff6" }).setOrigin(0.5);

    this.status = this.add.text(24, 520, `Selected ${this.selected.size}/${SQUAD_SIZE}`, { fontFamily: "monospace", fontSize: "13px", color: "#ffd791" });

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
