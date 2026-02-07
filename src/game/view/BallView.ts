import Phaser from "phaser";
import type { BallState } from "../../sim/state/MatchState";

export class BallView {
  private ball: Phaser.GameObjects.Ellipse;
  private ring: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.ring = scene.add.ellipse(x, y, 12, 12, 0xffffff, 0).setStrokeStyle(1, 0xffffff, 0.25);
    this.ball = scene.add.ellipse(x, y, 7, 7, 0xffffff, 1).setStrokeStyle(1, 0x122018, 0.8);
  }

  destroy() {
    this.ball.destroy();
    this.ring.destroy();
  }

  update(ball: BallState) {
    this.ball.setPosition(ball.pos.x, ball.pos.y);
    this.ring.setPosition(ball.pos.x, ball.pos.y);

    switch (ball.state) {
      case "SHOT":
        this.ball.setFillStyle(0xffefe3, 1);
        this.ring.setVisible(true).setScale(1.45).setStrokeStyle(1, 0xff7f4d, 0.6);
        break;
      case "IN_FLIGHT":
        this.ball.setFillStyle(0xf5fffd, 1);
        this.ring.setVisible(true).setScale(1.25).setStrokeStyle(1, 0x87ffd7, 0.45);
        break;
      case "LOOSE":
      case "CONTROL_CONTEST":
        this.ball.setFillStyle(0xfff7d1, 1);
        this.ring.setVisible(true).setScale(1.35).setStrokeStyle(1, 0xffcc66, 0.5);
        break;
      default:
        this.ball.setFillStyle(0xffffff, 1);
        this.ring.setVisible(false);
    }
  }
}
