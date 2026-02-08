import Phaser from "phaser";
import type { BallState } from "../../sim/state/MatchState";

export class BallView {
  private scene: Phaser.Scene;
  private ball: Phaser.GameObjects.Sprite;
  private baseScale = 0.5;
  private ring: Phaser.GameObjects.Ellipse;
  private lastState: BallState["state"];
  private lastTrailAtMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ring = scene.add.ellipse(x, y, 12, 12, 0xffffff, 0).setStrokeStyle(1, 0xffffff, 0.25);
    this.ball = scene.add.sprite(x, y, "ball_idle");
    this.syncBaseScale();
    this.lastState = "KICKOFF";
  }

  destroy() {
    this.ball.destroy();
    this.ring.destroy();
  }

  update(ball: BallState) {
    this.ball.setPosition(ball.pos.x, ball.pos.y);
    this.ring.setPosition(ball.pos.x, ball.pos.y);

    const speed = Math.hypot(ball.vel.x, ball.vel.y);
    const state = ball.state;
    this.applyStateStyle(state, speed);

    if (state !== this.lastState) {
      if (state === "SHOT") {
        this.spawnBurst(ball.pos.x, ball.pos.y, 0xffa56b, 7);
      } else if (state === "LOOSE" && this.lastState === "SHOT") {
        this.spawnBurst(ball.pos.x, ball.pos.y, 0xffd594, 5);
      }
    }

    if ((state === "IN_FLIGHT" || state === "SHOT") && speed > 120 && this.scene.time.now - this.lastTrailAtMs > 30) {
      this.lastTrailAtMs = this.scene.time.now;
      this.spawnTrailDot(ball.pos.x, ball.pos.y, state === "SHOT" ? 0xffb38a : 0xa7ffe9);
    }

    this.lastState = state;
  }

  private applyStateStyle(state: BallState["state"], speed: number) {
    switch (state) {
      case "SHOT":
        this.setBallTexture("ball_shot");
        this.ring.setVisible(true).setScale(1.45).setStrokeStyle(1, 0xff7f4d, 0.6);
        this.ball.setRotation(Math.min(0.9, speed / 700));
        break;
      case "IN_FLIGHT":
        this.setBallTexture("ball_flight");
        this.ring.setVisible(true).setScale(1.25).setStrokeStyle(1, 0x87ffd7, 0.45);
        this.ball.setRotation(Math.min(0.6, speed / 900));
        break;
      case "LOOSE":
      case "CONTROL_CONTEST":
        this.setBallTexture("ball_idle");
        this.ring.setVisible(true).setScale(1.35).setStrokeStyle(1, 0xffcc66, 0.5);
        this.ball.setRotation(0);
        break;
      default:
        this.setBallTexture("ball_idle");
        this.ring.setVisible(false);
        this.ball.setRotation(0);
        break;
    }
  }

  private setBallTexture(textureKey: string) {
    if (this.ball.texture.key === textureKey) {
      return;
    }
    this.ball.setTexture(textureKey);
    this.syncBaseScale();
  }

  private syncBaseScale() {
    const source = this.ball.texture.getSourceImage() as { width?: number; height?: number } | undefined;
    const sourceSize = Math.max(source?.width ?? 16, source?.height ?? 16, 1);
    this.baseScale = Phaser.Math.Clamp(8 / sourceSize, 0.08, 1.5);
    this.ball.setScale(this.baseScale, this.baseScale);
  }

  private spawnTrailDot(x: number, y: number, color: number) {
    const dot = this.scene.add.circle(x, y, 2, color, 0.65);
    this.scene.tweens.add({
      targets: dot,
      duration: 120,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      ease: "Quad.easeOut",
      onComplete: () => dot.destroy(),
    });
  }

  private spawnBurst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.25, 0.25);
      const speed = Phaser.Math.FloatBetween(18, 54);
      const piece = this.scene.add.rectangle(x, y, 2, 2, color, 0.9);
      this.scene.tweens.add({
        targets: piece,
        duration: 150,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        ease: "Quad.easeOut",
        onComplete: () => piece.destroy(),
      });
    }
  }
}
