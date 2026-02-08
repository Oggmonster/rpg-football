import Phaser from "phaser";
import type { PlayerState } from "../../sim/state/MatchState";

function hasKickIntent(value: string): boolean {
  return ["SHOOT_TO_DIRECTION", "PASS_TO_DIRECTION", "THROUGH_TO_DIRECTION"].includes(value);
}

function hasDefensiveIntent(value: string): boolean {
  return ["TACKLE_TARGET", "PRESS_ZONE", "COVER_ZONE", "INTERCEPT_LANE"].includes(value);
}

type AnimState = "idle" | "run" | "kick" | "tackle" | "save";

export class PlayerView {
  readonly id: string;
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private focusRing: Phaser.GameObjects.Ellipse;
  private label: Phaser.GameObjects.Text;
  private stateLabel: Phaser.GameObjects.Text;
  private showAiDebug = false;
  private lastAnimState: AnimState = "idle";

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.scene = scene;
    this.id = player.id;

    this.shadow = scene.add.ellipse(player.pos.x, player.pos.y + 7, 14, 5, 0x000000, 0.28);
    this.focusRing = scene.add.ellipse(player.pos.x, player.pos.y, 22, 22, 0xffffff, 0).setStrokeStyle(1, 0x93ffe1, 0.85).setVisible(false);
    this.sprite = scene.add.sprite(player.pos.x, player.pos.y, this.textureKey(player, "idle"));
    this.sprite.setOrigin(0.5, 0.5);

    this.label = scene.add
      .text(player.pos.x, player.pos.y - 12, `${player.shirtNumber}`, {
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
  }

  destroy() {
    this.shadow.destroy();
    this.focusRing.destroy();
    this.sprite.destroy();
    this.label.destroy();
    this.stateLabel.destroy();
  }

  update(player: PlayerState, alpha: number, isBallCarrier = false, isActive = false) {
    const x = player.pos.x;
    const y = player.pos.y;

    this.shadow.setPosition(x, y + 7);
    this.focusRing.setPosition(x, y);
    this.sprite.setPosition(x, y);
    this.label.setPosition(x, y - 12);
    this.stateLabel.setPosition(x, y + 14);

    const speed = Math.hypot(player.vel.x, player.vel.y);
    const intentType = player.intent?.type;
    const isKicker = Boolean(intentType && hasKickIntent(intentType));
    const isDefender = Boolean(intentType && hasDefensiveIntent(intentType));
    const animState: AnimState = this.resolveAnimState(player, speed, isBallCarrier, isKicker, isDefender);

    this.applySpriteFrame(player, animState);
    this.applyBodyMotion(speed, alpha, isKicker, isDefender);

    this.focusRing.setVisible(isActive);
    if (isActive) {
      const pulse = 1 + Math.sin((this.scene.time.now + alpha * 20) * 0.02) * 0.07;
      this.focusRing.setScale(pulse, pulse);
      this.focusRing.setStrokeStyle(1, isBallCarrier ? 0xfff4a1 : 0x93ffe1, 0.92);
    }

    if (this.showAiDebug) {
      this.stateLabel.setVisible(true);
      this.stateLabel.setText(player.aiState.replace("_", " "));
    } else {
      this.stateLabel.setVisible(false);
    }

    if (animState !== this.lastAnimState && ["kick", "tackle", "save"].includes(animState)) {
      this.spawnActionPulse(x, y, animState === "kick" ? 0xb5f6ff : animState === "save" ? 0x9fd3ff : 0xff9f82);
    }
    this.lastAnimState = animState;
  }

  setAiDebugVisible(visible: boolean) {
    this.showAiDebug = visible;
    this.stateLabel.setVisible(visible);
  }

  private resolveAnimState(
    player: PlayerState,
    speed: number,
    isBallCarrier: boolean,
    isKicker: boolean,
    isDefender: boolean
  ): AnimState {
    if (player.role === "GK" && !isBallCarrier && (speed > 20 || player.aiState === "PRESS")) {
      return "save";
    }
    if (isBallCarrier && isKicker) {
      return "kick";
    }
    if (!isBallCarrier && isDefender) {
      return "tackle";
    }
    if (speed > 9) {
      return "run";
    }
    return "idle";
  }

  private applySpriteFrame(player: PlayerState, animState: AnimState) {
    const prefix =
      player.role === "GK" ? (player.teamId === "HOME" ? "player_gk_home" : "player_gk_away") : player.teamId === "HOME" ? "player_home" : "player_away";
    const key =
      animState === "run"
        ? `${prefix}_${Math.floor(this.scene.time.now / 120) % 2 === 0 ? "run_a" : "run_b"}`
        : `${prefix}_${animState}`;
    if (this.sprite.texture.key !== key) {
      this.sprite.setTexture(key);
    }
  }

  private applyBodyMotion(speed: number, alpha: number, isKicker: boolean, isDefender: boolean) {
    if (speed > 8) {
      const pulse = 1 + Math.sin((this.scene.time.now + alpha * 14) * 0.02) * 0.05;
      this.sprite.setScale(pulse, 1 / pulse);
      return;
    }

    if (isKicker) {
      this.sprite.setScale(1.09, 0.92);
      return;
    }

    if (isDefender) {
      this.sprite.setScale(0.94, 1.08);
      return;
    }

    this.sprite.setScale(1, 1);
  }

  private spawnActionPulse(x: number, y: number, color: number) {
    const ring = this.scene.add.ellipse(x, y, 8, 8, color, 0.08).setStrokeStyle(1, color, 0.95);
    this.scene.tweens.add({
      targets: ring,
      duration: 170,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private textureKey(player: PlayerState, state: AnimState) {
    const prefix =
      player.role === "GK" ? (player.teamId === "HOME" ? "player_gk_home" : "player_gk_away") : player.teamId === "HOME" ? "player_home" : "player_away";
    return `${prefix}_${state}`;
  }
}
