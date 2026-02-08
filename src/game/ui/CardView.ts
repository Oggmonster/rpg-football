import Phaser from "phaser";

export type CardVisualStatus = "READY" | "COOLDOWN" | "LOCKOUT" | "CONTEXT" | "PHASE" | "RESTART";

export class CardView extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private flashRect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private stateLabel: Phaser.GameObjects.Text;
  private cooldownLabel: Phaser.GameObjects.Text;
  private cardId = "";
  private activeStatus: CardVisualStatus = "READY";
  private activeSelected = false;

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
    this.bg.setScrollFactor(0);

    this.flashRect = scene.add.rectangle(0, 0, w, h, 0xffffff, 0).setOrigin(0, 0);
    this.flashRect.setScrollFactor(0);

    this.label = scene.add.text(8, 8, "-", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#eafff6",
      wordWrap: { width: w - 16 },
    });
    this.label.setScrollFactor(0);

    this.cooldownLabel = scene.add
      .text(w - 8, h - 8, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffd280",
      })
      .setOrigin(1, 1);
    this.cooldownLabel.setScrollFactor(0);

    this.stateLabel = scene.add
      .text(8, h - 8, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffd280",
      })
      .setOrigin(0, 1)
      .setAlpha(0);
    this.stateLabel.setScrollFactor(0);

    this.add([this.bg, this.flashRect, this.label, this.cooldownLabel, this.stateLabel]);
    this.setScrollFactor(0);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => {
      if (!this.cardId || this.activeSelected) return;
      this.scene.tweens.add({
        targets: this,
        duration: 90,
        y: -2,
        ease: "Quad.easeOut",
      });
    });
    this.bg.on("pointerout", () => {
      if (!this.cardId || this.activeSelected) return;
      this.scene.tweens.add({
        targets: this,
        duration: 90,
        y: 0,
        ease: "Quad.easeOut",
      });
    });
    this.bg.on("pointerdown", () => {
      if (!this.cardId) return;
      onClick(this.cardId);
    });
  }

  setCard(cardId: string, opts?: { status?: CardVisualStatus; cooldownMs?: number; selected?: boolean; hint?: string }) {
    const prevId = this.cardId;
    const prevStatus = this.activeStatus;
    const status = opts?.status ?? "READY";
    const cooldownMs = opts?.cooldownMs ?? 0;
    const selected = opts?.selected ?? false;
    const hint = opts?.hint ?? "";

    this.cardId = cardId;
    this.activeStatus = status;
    this.activeSelected = selected;
    this.label.setText(cardId || "-");

    const show = Boolean(cardId);
    const baseAlpha = show ? 1 : 0.35;
    const disabledAlpha = status === "READY" ? 1 : 0.72;

    this.bg.setAlpha(baseAlpha * disabledAlpha);
    this.label.setAlpha(baseAlpha * disabledAlpha);

    if (status === "COOLDOWN" && cooldownMs > 0) {
      this.cooldownLabel.setText(`${(cooldownMs / 1000).toFixed(1)}s`);
      this.cooldownLabel.setAlpha(1);
    } else {
      this.cooldownLabel.setText("");
      this.cooldownLabel.setAlpha(0);
    }

    this.stateLabel.setText(hint);
    this.stateLabel.setAlpha(hint ? 0.95 : 0);
    this.applyBaseStyle();

    if (cardId && cardId !== prevId) {
      this.pulseDraw();
    } else if (prevStatus === "COOLDOWN" && status === "READY") {
      this.pulseReady();
    }

  }

  pulseInvalid() {
    if (!this.cardId) return;
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.killTweensOf(this);
    this.flashRect.setFillStyle(0xaa2e2e, 1).setAlpha(0.05);
    this.scene.tweens.add({
      targets: this.flashRect,
      duration: 80,
      alpha: 0.44,
      yoyo: true,
      repeat: 1,
    });
    this.scene.tweens.add({
      targets: this,
      duration: 55,
      x: this.x - 2,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.setX(Math.round(this.x)),
    });
  }

  pulsePlayed() {
    if (!this.cardId) return;
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.setFillStyle(0x2aa46d, 1).setAlpha(0.04);
    this.scene.tweens.add({
      targets: this.flashRect,
      duration: 110,
      alpha: 0.38,
      yoyo: true,
      repeat: 1,
    });
    this.scene.tweens.add({
      targets: this,
      duration: 120,
      scaleX: 1.03,
      scaleY: 1.03,
      yoyo: true,
      onComplete: () => this.setScale(1, 1),
    });
  }

  private pulseDraw() {
    this.scene.tweens.killTweensOf(this);
    this.setY(-2);
    this.setAlpha(0.78);
    this.scene.tweens.add({
      targets: this,
      duration: 150,
      y: this.activeSelected ? -4 : 0,
      alpha: 1,
      ease: "Quad.easeOut",
    });
  }

  private pulseReady() {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.setFillStyle(0x94ffdd, 1).setAlpha(0.08);
    this.scene.tweens.add({
      targets: this.flashRect,
      duration: 150,
      alpha: 0.34,
      yoyo: true,
      repeat: 0,
    });
  }

  private applyBaseStyle() {
    switch (this.activeStatus) {
      case "COOLDOWN":
        this.bg.setFillStyle(0x2d2a22, 1);
        this.bg.setStrokeStyle(2, 0xffc67a, 0.9);
        break;
      case "LOCKOUT":
        this.bg.setFillStyle(0x212633, 1);
        this.bg.setStrokeStyle(2, 0xa8bbff, 0.9);
        break;
      case "CONTEXT":
        this.bg.setFillStyle(0x2b2421, 1);
        this.bg.setStrokeStyle(2, 0xffaf7d, 0.9);
        break;
      case "PHASE":
      case "RESTART":
        this.bg.setFillStyle(0x222222, 1);
        this.bg.setStrokeStyle(2, 0xb3b3b3, 0.85);
        break;
      default:
        this.bg.setFillStyle(0x0f2a20, 1);
        this.bg.setStrokeStyle(2, 0xb7ffe3, 0.9);
        break;
    }

    this.setY(this.activeSelected ? -4 : 0);
    this.setScale(this.activeSelected ? 1.03 : 1, this.activeSelected ? 1.03 : 1);
    if (this.activeSelected) {
      this.bg.setStrokeStyle(2, 0xfaffbf, 1);
    }
  }
}
