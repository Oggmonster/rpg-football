import Phaser from "phaser";

export class CardView extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private cardId = "";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: (cardId: string) => void
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.bg = scene.add.rectangle(0, 0, w, h, 0x0f2a20, 1).setOrigin(0, 0);
    this.bg.setStrokeStyle(2, 0xb7ffe3, 0.9);

    this.label = scene.add.text(8, 8, "-", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#eafff6",
      wordWrap: { width: w - 16 },
    });

    this.add([this.bg, this.label]);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerdown", () => {
      if (!this.cardId) return;
      onClick(this.cardId);
    });
  }

  setCard(cardId: string) {
    this.cardId = cardId;
    this.label.setText(cardId || "-");
    this.bg.setAlpha(cardId ? 1 : 0.35);
    this.label.setAlpha(cardId ? 1 : 0.35);
  }
}
