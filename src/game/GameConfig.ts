import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { CollectionScene } from "./scenes/CollectionScene";
import { DeckBuilderScene } from "./scenes/DeckBuilderScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
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
  scene: [BootScene, PreloadScene, MainMenuScene, MatchScene, DeckBuilderScene, CollectionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
