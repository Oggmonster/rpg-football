import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MatchScene } from "./scenes/MatchScene";
import { PreloadScene } from "./scenes/PreloadScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0b1a14",
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, PreloadScene, MatchScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
