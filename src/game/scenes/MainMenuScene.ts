import Phaser from "phaser";
import { SQUAD_SIZE } from "../../sim/config/MatchConfig";
import { eventById } from "../events/EventCatalog";
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
    const xpNeed = 120 + profile.manager.level * 60;
    const activeEvent = eventById(profile.manager.activeEventId);

    this.add
      .text(480, 92, "Pocket Gaffer", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#f0fff6",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(480, 126, `Squad: ${profile.squadIds.length}/${SQUAD_SIZE} | Decks: 15+15`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d5ffea",
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(
        480,
        146,
        `Manager Lv ${profile.manager.level} | XP ${profile.manager.xp}/${xpNeed} | Coins ${profile.manager.coins} | W-D-L ${profile.manager.wins}-${profile.manager.draws}-${profile.manager.losses}`,
        {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#ffe2a8",
        }
      )
      .setOrigin(0.5, 0.5);

    this.add
      .text(
        480,
        166,
        `Season ${profile.manager.season} | Division ${profile.manager.division} | Season Pts ${profile.manager.seasonPoints} | Event: ${activeEvent.label}`,
        {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#b7e9ff",
        }
      )
      .setOrigin(0.5, 0.5);

    addButton(this, 480, 210, "Quick Match", () => this.scene.start("MatchScene"));
    addButton(this, 480, 270, "Deck Builder", () => this.scene.start("DeckBuilderScene"));
    addButton(this, 480, 330, "Player Collection", () => this.scene.start("CollectionScene"));
  }
}
