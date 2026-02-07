import Phaser from "phaser";
import { loadProfile } from "../profile/ProfileStore";

function addButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
  const bg = scene.add.rectangle(x, y, 240, 44, 0x103225, 1).setStrokeStyle(2, 0xb7ffe3, 0.9);
  const text = scene.add
    .text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#eafff6",
    })
    .setOrigin(0.5, 0.5);

  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerdown", onClick);
  bg.on("pointerover", () => bg.setFillStyle(0x1a4a36, 1));
  bg.on("pointerout", () => bg.setFillStyle(0x103225, 1));

  return { bg, text };
}

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const profile = loadProfile();

    this.add.text(480, 92, "Pocket Gaffer", {
      fontFamily: "monospace",
      fontSize: "34px",
      color: "#f0fff6",
    }).setOrigin(0.5, 0.5);

    this.add.text(480, 126, `Squad: ${profile.squadIds.length}/7 | Decks: 15+15`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#d5ffea",
    }).setOrigin(0.5, 0.5);

    addButton(this, 480, 210, "Quick Match", () => this.scene.start("MatchScene"));
    addButton(this, 480, 270, "Deck Builder", () => this.scene.start("DeckBuilderScene"));
    addButton(this, 480, 330, "Player Collection", () => this.scene.start("CollectionScene"));
  }
}
