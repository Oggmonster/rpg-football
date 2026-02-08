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
  private stateLabel: Phaser.GameObjects.Text;
  private showAiDebug = false;

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

    this.stateLabel = scene.add
      .text(player.pos.x, player.pos.y + 14, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#bdf0ff",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.applyTeamStyle(player);
  }

  destroy() {
    this.shadow.destroy();
    this.body.destroy();
    this.label.destroy();
    this.stateLabel.destroy();
  }

  update(player: PlayerState, alpha: number, isBallCarrier = false) {
    const x = player.pos.x;
    const y = player.pos.y;

    this.shadow.setPosition(x, y + 5);
    this.body.setPosition(x, y);
    this.label.setPosition(x, y - 11);
    this.stateLabel.setPosition(x, y + 14);

    const speed = Math.hypot(player.vel.x, player.vel.y);
    if (speed > 8) {
      const pulse = 1 + Math.sin((this.scene.time.now + alpha * 16) * 0.018) * 0.08;
      this.body.setScale(pulse, 1 / pulse);
    } else {
      this.body.setScale(1, 1);
    }

    this.applyTeamStyle(player);

    const intentType = player.intent?.type;
    if (!isBallCarrier && intentType && hasKickIntent(intentType)) {
      this.body.setScale(1.16, 0.9);
      this.body.setStrokeStyle(1, 0xb4fff0, 0.95);
    } else if (!isBallCarrier && intentType && hasDefensiveIntent(intentType)) {
      this.body.setScale(0.92, 1.12);
      this.body.setStrokeStyle(1, 0xff8f7f, 0.95);
    }

    if (this.showAiDebug) {
      this.stateLabel.setVisible(true);
      this.stateLabel.setText(player.aiState.replace("_", " "));
    } else {
      this.stateLabel.setVisible(false);
    }
  }

  setAiDebugVisible(visible: boolean) {
    this.showAiDebug = visible;
    this.stateLabel.setVisible(visible);
  }

  private applyTeamStyle(player: PlayerState) {
    if (player.role === "GK") {
      this.body.setFillStyle(player.teamId === "HOME" ? 0x2449a6 : 0xd2a600, 1);
      this.body.setStrokeStyle(1, 0x0f1311, 0.8);
      return;
    }
    this.body.setFillStyle(player.teamId === "HOME" ? 0x2f6bff : 0xffd347, 1);
    this.body.setStrokeStyle(1, 0x0f1311, 0.8);
  }
}
