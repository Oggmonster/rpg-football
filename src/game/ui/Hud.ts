import Phaser from "phaser";
import type { MatchState } from "../../sim/state/MatchState";

function formatMs(totalMs: number): string {
  const clamped = Math.max(0, Math.floor(totalMs));
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

export class Hud extends Phaser.GameObjects.Container {
  private timerText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private possessionText: Phaser.GameObjects.Text;
  private momentumLabelText: Phaser.GameObjects.Text;
  private momentumTrack: Phaser.GameObjects.Rectangle;
  private momentumFill: Phaser.GameObjects.Rectangle;
  private commandText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.timerText = scene.add.text(0, 0, "00:00", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1fff8",
    });

    this.scoreText = scene.add.text(94, 0, "HOME 0 - 0 AWAY", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#f1fff8",
    });

    this.possessionText = scene.add.text(304, 0, "POS: HOME", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#d8ffe8",
    });

    this.momentumLabelText = scene.add.text(304, 18, "MOM 0%", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d8ffe8",
    });

    this.momentumTrack = scene.add.rectangle(374, 35, 180, 8, 0x2d3a33, 1).setOrigin(0.5, 0.5).setStrokeStyle(1, 0x8fb09f, 0.8);
    this.momentumFill = scene.add.rectangle(374, 35, 2, 6, 0x8fb09f, 1).setOrigin(0.5, 0.5);

    this.commandText = scene.add.text(470, 0, "CMD: -", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#c7f7ff",
    });

    this.statusText = scene.add.text(620, 0, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd791",
    });

    this.add([
      this.timerText,
      this.scoreText,
      this.possessionText,
      this.momentumLabelText,
      this.momentumTrack,
      this.momentumFill,
      this.commandText,
      this.statusText,
    ]);
  }

  updateFromState(state: MatchState) {
    const remaining = state.durationMs - state.timeMs;
    this.timerText.setText(formatMs(remaining));
    this.scoreText.setText(`HOME ${state.score.HOME} - ${state.score.AWAY} AWAY`);

    const poss = state.possession.team === "NEUTRAL" ? `NEUTRAL (${state.possession.lastTouchTeam})` : state.possession.team;
    this.possessionText.setText(`POS: ${poss}`);
    this.updateMomentum(state.momentum);

    const activeHome = state.teams.HOME.activeCommand;
    const activeAway = state.teams.AWAY.activeCommand;
    const cmdLabel = activeHome
      ? `HOME ${activeHome.type} ${Math.ceil(activeHome.remainingMs / 1000)}s`
      : activeAway
      ? `AWAY ${activeAway.type} ${Math.ceil(activeAway.remainingMs / 1000)}s`
      : "-";
    this.commandText.setText(`CMD: ${cmdLabel}`);

    if (state.phase === "ENDED") {
      this.statusText.setText("FULL TIME");
      return;
    }

    if (state.flow.goalResetMsRemaining > 0) {
      this.statusText.setText(`RESET ${Math.ceil(state.flow.goalResetMsRemaining / 1000)}s`);
      return;
    }

    this.statusText.setText("");
  }

  private updateMomentum(momentum: number) {
    const clamped = Phaser.Math.Clamp(momentum, -1, 1);
    const pct = Math.round(clamped * 100);
    this.momentumLabelText.setText(`MOM ${pct}%`);

    const width = Math.max(2, Math.abs(clamped) * 88);
    this.momentumFill.setSize(width, 6);
    this.momentumFill.setPosition(374 + (clamped >= 0 ? width / 2 : -width / 2), 35);
    this.momentumFill.setFillStyle(clamped >= 0 ? 0x5dd8ff : 0xffc173, 1);
  }
}
