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

    this.statusText = scene.add.text(414, 0, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd791",
    });

    this.add([this.timerText, this.scoreText, this.possessionText, this.statusText]);
  }

  updateFromState(state: MatchState) {
    const remaining = state.durationMs - state.timeMs;
    this.timerText.setText(formatMs(remaining));
    this.scoreText.setText(`HOME ${state.score.HOME} - ${state.score.AWAY} AWAY`);

    const poss = state.possession.team === "NEUTRAL" ? `NEUTRAL (${state.possession.lastTouchTeam})` : state.possession.team;
    this.possessionText.setText(`POS: ${poss}`);

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
}
