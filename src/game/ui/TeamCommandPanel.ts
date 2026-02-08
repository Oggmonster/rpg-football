import Phaser from "phaser";
import type { TeamCommandType } from "../../sim/state/MatchState";

interface TeamCommandUiRow {
  type: TeamCommandType;
  label: string;
  used: boolean;
  active: boolean;
  remainingMs: number;
}

export class TeamCommandPanel extends Phaser.GameObjects.Container {
  private title: Phaser.GameObjects.Text;
  private rows: Array<{
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    type: TeamCommandType | null;
  }> = [];
  private onActivate: (type: TeamCommandType) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onActivate: (type: TeamCommandType) => void) {
    super(scene, x, y);
    scene.add.existing(this);
    this.onActivate = onActivate;

    this.title = scene.add.text(0, 0, "Team Commands", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#eafff6",
    });
    this.add(this.title);

    for (let i = 0; i < 5; i++) {
      const rowY = 26 + i * 32;
      const container = scene.add.container(0, rowY);
      const bg = scene.add.rectangle(0, 0, 210, 28, 0x22342d, 1).setOrigin(0, 0).setStrokeStyle(1, 0xb7ffe3, 0.75);
      const label = scene.add.text(8, 6, "-", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e7fff3",
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        const type = this.rows[i].type;
        if (!type) return;
        this.onActivate(type);
      });

      container.add([bg, label]);
      this.rows.push({ container, bg, label, type: null });
      this.add(container);
    }
  }

  setCommands(commands: TeamCommandUiRow[]) {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const cmd = commands[i];
      if (!cmd) {
        row.type = null;
        row.label.setText("-");
        row.bg.setFillStyle(0x22342d, 1);
        row.bg.setStrokeStyle(1, 0xb7ffe3, 0.3);
        continue;
      }

      row.type = cmd.type;
      const remaining = cmd.active ? ` ${Math.ceil(cmd.remainingMs / 1000)}s` : "";
      row.label.setText(`${cmd.label}${remaining}`);

      if (cmd.active) {
        row.bg.setFillStyle(0x2a5b49, 1);
        row.bg.setStrokeStyle(2, 0xf9ffba, 1);
      } else if (cmd.used) {
        row.bg.setFillStyle(0x2e2d2b, 1);
        row.bg.setStrokeStyle(1, 0xa6a39b, 0.7);
      } else {
        row.bg.setFillStyle(0x22342d, 1);
        row.bg.setStrokeStyle(1, 0xb7ffe3, 0.75);
      }
    }
  }
}
