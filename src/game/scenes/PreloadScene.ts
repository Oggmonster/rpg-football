import Phaser from "phaser";
import { loadProfile } from "../profile/ProfileStore";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    // Placeholder for future external assets.
  }

  create() {
    // Ensure profile exists on first boot.
    loadProfile();
    this.scene.start("MainMenuScene");
  }
}
