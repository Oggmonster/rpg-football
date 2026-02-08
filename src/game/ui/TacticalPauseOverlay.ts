import Phaser from "phaser";

export class TacticalPauseOverlay extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    const bg = scene.add.rectangle(0, 0, 330, 184, 0x0b1b16, 0.94).setOrigin(0, 0).setStrokeStyle(2, 0x8cdcc0, 0.9);
    const title = scene.add.text(12, 10, "TACTICAL PAUSE", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e8fff5",
    });
    const tabRow = scene.add.text(12, 34, "[Formation] [Subs] [Overlays]", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#9fe8cc",
    });
    const body = scene.add.text(
      12,
      58,
      "Formation: 4-3-3 (placeholder)\nSubs: none queued\nCaptain: unchanged\nTeam cards: halftime swaps only",
      {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d7fbe9",
        lineSpacing: 4,
      }
    );
    const footer = scene.add.text(12, 160, "Press T to resume", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#ffe3a1",
    });

    this.add([bg, title, tabRow, body, footer]);
    this.setVisible(false);
  }
}
