import Phaser from "phaser";
import type { PlayerState } from "../../sim/state/MatchState";

export class ActivePlayerPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private roleText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.bg = scene.add.rectangle(0, 0, 230, 98, 0x0f2a20, 1).setOrigin(0, 0).setStrokeStyle(2, 0xb7ffe3, 0.9);
    this.title = scene.add.text(8, 6, "Active Player", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d5ffea",
    });
    this.nameText = scene.add.text(8, 24, "-", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#f1fff8",
    });
    this.roleText = scene.add.text(8, 42, "-", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7ffe3",
    });
    this.statsText = scene.add.text(8, 58, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#d9fff1",
      wordWrap: { width: 214 },
    });

    this.add([this.bg, this.title, this.nameText, this.roleText, this.statsText]);
  }

  updatePlayer(player: PlayerState | null) {
    if (!player) {
      this.nameText.setText("-");
      this.roleText.setText("-");
      this.statsText.setText("");
      return;
    }

    this.nameText.setText(`${player.id} #${player.shirtNumber}`);
    this.roleText.setText(`${player.teamId} ${player.role} | ${player.aiState} | STA ${Math.round(player.stamina)}`);
    this.statsText.setText(
      `PAC ${player.stats.pac} SHO ${player.stats.sho} PAS ${player.stats.pas} DRI ${player.stats.dri} DEF ${player.stats.def} PHY ${player.stats.phy}`
    );
  }
}
