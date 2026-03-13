import Phaser from "phaser";

function addButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
  const bg = scene.add.rectangle(x, y, 280, 54, 0x153144, 1).setStrokeStyle(2, 0x7ed7d4, 0.9).setInteractive({ useHandCursor: true });
  const text = scene.add.text(x, y, label, {
    fontFamily: "Georgia",
    fontSize: "24px",
    color: "#f7f3e8",
    fontStyle: "bold",
  }).setOrigin(0.5);
  bg.on("pointerover", () => bg.setFillStyle(0x1b425c, 1));
  bg.on("pointerout", () => bg.setFillStyle(0x153144, 1));
  bg.on("pointerdown", onClick);
  return { bg, text };
}

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#081017");
    this.add.rectangle(640, 360, 1280, 720, 0x081017, 1);
    this.add.circle(180, 120, 180, 0x4ed6cf, 0.08);
    this.add.circle(1090, 540, 220, 0xff9a63, 0.08);
    this.add.rectangle(640, 360, 920, 520, 0x0d1822, 0.94).setStrokeStyle(2, 0x35586f, 0.84);

    this.add.text(640, 150, "Card Football Prototype", {
      fontFamily: "Georgia",
      fontSize: "48px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(640, 210, "Player vs CPU. Attack and defense decks. Five attack rounds each per half.", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#d4e4ef",
    }).setOrigin(0.5);

    this.add.text(640, 258, "Pass to teammates, click dribble destinations, time shots with SPACE, and change tactics at halftime.", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#ffe7a0",
      wordWrap: { width: 760 },
      align: "center",
    }).setOrigin(0.5);

    addButton(this, 640, 354, "Start Match", () => this.scene.start("MatchScene"));

    this.add.text(640, 468, "Controls: left click to play, right drag to pan camera, mouse wheel to zoom.", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#bfd8e5",
    }).setOrigin(0.5);
  }
}
