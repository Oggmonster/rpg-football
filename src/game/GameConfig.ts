import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { CardPrototypeMatchScene } from "./scenes/CardPrototypeMatchScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { PreloadScene } from "./scenes/PreloadScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#0b1a14",
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, PreloadScene, MainMenuScene, CardPrototypeMatchScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
