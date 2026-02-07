import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    // Placeholder for future external assets.
  }

  create() {
    this.scene.start("MatchScene");
  }
}
