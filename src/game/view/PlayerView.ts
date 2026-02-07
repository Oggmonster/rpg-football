import Phaser from "phaser";
import type { PlayerState } from "../../sim/state/MatchState";

function hasKickIntent(value: string): boolean {
  return ["SHOOT_TO_DIRECTION", "PASS_TO_DIRECTION", "THROUGH_TO_DIRECTION"].includes(value);
}

function hasDefensiveIntent(value: string): boolean {
  return ["TACKLE_TARGET", "PRESS_ZONE", "COVER_ZONE", "INTERCEPT_LANE"].includes(value);
}

export class PlayerView {
  readonly id: string;
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Ellipse;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.scene = scene;
    this.id = player.id;

    this.shadow = scene.add.ellipse(player.pos.x, player.pos.y + 5, 12, 4, 0x000000, 0.3);
    this.body = scene.add.rectangle(player.pos.x, player.pos.y, 10, 10, 0xffffff, 1);
    this.body.setStrokeStyle(1, 0x0f1311, 0.8);

    this.label = scene.add
      .text(player.pos.x, player.pos.y - 11, `${player.shirtNumber}`, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.95);

    this.applyTeamStyle(player);
  }

  destroy() {
    this.shadow.destroy();
    this.body.destroy();
    this.label.destroy();
  }

  update(player: PlayerState, alpha: number) {
    const x = player.pos.x;
    const y = player.pos.y;

    this.shadow.setPosition(x, y + 5);
    this.body.setPosition(x, y);
    this.label.setPosition(x, y - 11);

    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed > 8) {
      const pulse = 1 + Math.sin((this.scene.time.now + alpha * 16) * 0.018) * 0.08;
      this.body.setScale(pulse, 1 / pulse);
    } else {
      this.body.setScale(1, 1);
    }

    this.applyTeamStyle(player);

    const intentType = player.intent?.type;
    if (intentType && hasKickIntent(intentType)) {
      this.body.setScale(1.16, 0.9);
      this.body.setFillStyle(0x9ef2c7, 1);
    } else if (intentType && hasDefensiveIntent(intentType)) {
      this.body.setScale(0.92, 1.12);
      this.body.setFillStyle(0xff6c5c, 1);
    }
  }

  private applyTeamStyle(player: PlayerState) {
    if (player.role === "GK") {
      this.body.setFillStyle(player.teamId === "HOME" ? 0x2d5ca8 : 0xa88b2d, 1);
      return;
    }
    this.body.setFillStyle(player.teamId === "HOME" ? 0x2dd4bf : 0xff9b3f, 1);
  }
}
