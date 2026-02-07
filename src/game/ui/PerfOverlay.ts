import Phaser from "phaser";

export class PerfOverlay extends Phaser.GameObjects.Container {
  private panel: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.panel = scene.add.rectangle(0, 0, 210, 88, 0x0b1511, 0.8).setOrigin(0, 0).setStrokeStyle(1, 0x87ffd7, 0.65);
    this.text = scene.add.text(8, 6, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#dcfff0",
      lineSpacing: 3,
    });

    this.add([this.panel, this.text]);
    this.setVisible(false);
  }

  setMetrics(metrics: { fps: number; frameMs: number; simSteps: number; events: number }) {
    this.text.setText([
      `FPS: ${metrics.fps.toFixed(1)}`,
      `Frame: ${metrics.frameMs.toFixed(2)}ms`,
      `Sim steps: ${metrics.simSteps}`,
      `Events: ${metrics.events}`,
    ]);
  }
}
