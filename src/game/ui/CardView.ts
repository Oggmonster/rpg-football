import Phaser from "phaser";

export class CardView extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private cooldownLabel: Phaser.GameObjects.Text;
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

    this.cooldownLabel = scene.add
      .text(w - 8, h - 8, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffd280",
      })
      .setOrigin(1, 1);

    this.add([this.bg, this.label, this.cooldownLabel]);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerdown", () => {
      if (!this.cardId) return;
      onClick(this.cardId);
    });
  }

  setCard(cardId: string, opts?: { disabled?: boolean; cooldownMs?: number }) {
    const disabled = opts?.disabled ?? false;
    const cooldownMs = opts?.cooldownMs ?? 0;

    this.cardId = cardId;
    this.label.setText(cardId || "-");

    const show = Boolean(cardId);
    const baseAlpha = show ? 1 : 0.35;
    const disabledAlpha = disabled ? 0.55 : 1;

    this.bg.setAlpha(baseAlpha * disabledAlpha);
    this.label.setAlpha(baseAlpha * disabledAlpha);

    if (cooldownMs > 0) {
      this.cooldownLabel.setText(`${(cooldownMs / 1000).toFixed(1)}s`);
      this.cooldownLabel.setAlpha(1);
      this.bg.setFillStyle(0x2d2a22, 1);
      this.bg.setStrokeStyle(2, 0xffc67a, 0.9);
    } else {
      this.cooldownLabel.setText("");
      this.cooldownLabel.setAlpha(0);
      this.bg.setFillStyle(disabled ? 0x1d2521 : 0x0f2a20, 1);
      this.bg.setStrokeStyle(2, disabled ? 0x8ea39a : 0xb7ffe3, 0.9);
    }
  }

  pulseInvalid() {
    this.scene.tweens.add({
      targets: this.bg,
      duration: 90,
      fillColor: 0x7a2323,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.bg.setFillStyle(0x0f2a20, 1);
      },
    });
  }

  pulsePlayed() {
    this.scene.tweens.add({
      targets: this.bg,
      duration: 110,
      fillColor: 0x1f6c4e,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.bg.setFillStyle(0x0f2a20, 1);
      },
    });
  }
}
