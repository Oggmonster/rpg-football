import Phaser from "phaser";
import { loadProfile } from "../profile/ProfileStore";

type PixelTextureDef = {
  key: string;
  data: string[];
  palette: Phaser.Types.Create.Palette;
  pixelWidth?: number;
};

const PIXELLAB_TEXTURE_KEYS = [
  "pitch_main",
  "goal_left",
  "goal_right",
  "player_home_idle",
  "player_home_run_a",
  "player_home_run_b",
  "player_home_kick",
  "player_home_tackle",
  "player_away_idle",
  "player_away_run_a",
  "player_away_run_b",
  "player_away_kick",
  "player_away_tackle",
  "player_gk_home_idle",
  "player_gk_home_run_a",
  "player_gk_home_run_b",
  "player_gk_home_kick",
  "player_gk_home_tackle",
  "player_gk_home_save",
  "player_gk_away_idle",
  "player_gk_away_run_a",
  "player_gk_away_run_b",
  "player_gk_away_kick",
  "player_gk_away_tackle",
  "player_gk_away_save",
  "ball_idle",
  "ball_flight",
  "ball_shot",
] as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.queueExternalTextures();
  }

  create() {
    // Fill any missing textures with procedural fallbacks.
    this.generateRuntimeTextures();
    // Ensure profile exists on first boot.
    loadProfile();
    this.scene.start("MainMenuScene");
  }

  private queueExternalTextures() {
    for (const key of PIXELLAB_TEXTURE_KEYS) {
      this.load.image(key, `assets/pixellab/${key}.png`);
    }
  }

  private generateRuntimeTextures() {
    const defs: PixelTextureDef[] = [
      this.playerDef("player_home_idle", "#2f6bff", "#1f47ba", "idle"),
      this.playerDef("player_home_run_a", "#2f6bff", "#1f47ba", "run_a"),
      this.playerDef("player_home_run_b", "#2f6bff", "#1f47ba", "run_b"),
      this.playerDef("player_home_kick", "#2f6bff", "#1f47ba", "kick"),
      this.playerDef("player_home_tackle", "#2f6bff", "#1f47ba", "tackle"),
      this.playerDef("player_away_idle", "#ffd347", "#c79e24", "idle"),
      this.playerDef("player_away_run_a", "#ffd347", "#c79e24", "run_a"),
      this.playerDef("player_away_run_b", "#ffd347", "#c79e24", "run_b"),
      this.playerDef("player_away_kick", "#ffd347", "#c79e24", "kick"),
      this.playerDef("player_away_tackle", "#ffd347", "#c79e24", "tackle"),
      this.playerDef("player_gk_home_idle", "#2449a6", "#152f72", "idle"),
      this.playerDef("player_gk_home_run_a", "#2449a6", "#152f72", "run_a"),
      this.playerDef("player_gk_home_run_b", "#2449a6", "#152f72", "run_b"),
      this.playerDef("player_gk_home_kick", "#2449a6", "#152f72", "kick"),
      this.playerDef("player_gk_home_tackle", "#2449a6", "#152f72", "tackle"),
      this.playerDef("player_gk_home_save", "#2449a6", "#152f72", "save"),
      this.playerDef("player_gk_away_idle", "#d2a600", "#8d6e00", "idle"),
      this.playerDef("player_gk_away_run_a", "#d2a600", "#8d6e00", "run_a"),
      this.playerDef("player_gk_away_run_b", "#d2a600", "#8d6e00", "run_b"),
      this.playerDef("player_gk_away_kick", "#d2a600", "#8d6e00", "kick"),
      this.playerDef("player_gk_away_tackle", "#d2a600", "#8d6e00", "tackle"),
      this.playerDef("player_gk_away_save", "#d2a600", "#8d6e00", "save"),
      {
        key: "ball_idle",
        pixelWidth: 2,
        palette: this.makePalette("#ffffff", "#dce6e0", "#0f1311"),
        data: ["........", "..1111..", ".122221.", ".122221.", ".122221.", ".122221.", "..1111..", "........"],
      },
      {
        key: "ball_flight",
        pixelWidth: 2,
        palette: this.makePalette("#e7fffc", "#9debd7", "#0f1311"),
        data: ["........", "..1111..", ".122221.", ".122221.", ".122221.", ".122221.", "..1111..", "........"],
      },
      {
        key: "ball_shot",
        pixelWidth: 2,
        palette: this.makePalette("#fff0d7", "#ffb26d", "#4d2a17"),
        data: ["........", "..1111..", ".122221.", ".122221.", ".122221.", ".122221.", "..1111..", "........"],
      },
    ];

    for (const def of defs) {
      if (this.textures.exists(def.key)) continue;
      this.textures.generate(def.key, {
        data: def.data.map((row) => row.replaceAll(".", "0")),
        palette: def.palette,
        pixelWidth: def.pixelWidth ?? 2,
      });
    }
  }

  private playerDef(key: string, body: string, shade: string, state: "idle" | "run_a" | "run_b" | "kick" | "tackle" | "save") {
    const mapByState: Record<typeof state, string[]> = {
      idle: ["........", "..3333..", ".322223.", ".322223.", "..1111..", "..1..1..", ".1....1.", "........"],
      run_a: ["........", "..3333..", ".322223.", ".322223.", "..1111..", ".1..1...", "...1..1.", "........"],
      run_b: ["........", "..3333..", ".322223.", ".322223.", "..1111..", "...1..1.", ".1..1...", "........"],
      kick: ["........", "..3333..", ".322223.", ".322223.", "..1111..", "..1..1..", "....1.1.", "........"],
      tackle: ["........", "...333..", ".322223.", ".322223.", ".1111...", "1..1....", "..1.....", "........"],
      save: ["........", "....333.", "..322223", ".322223.", "1111....", "..1.1...", "...1....", "........"],
    };

    return {
      key,
      pixelWidth: 2,
      palette: this.makePalette(body, shade, "#f0f8ff"),
      data: mapByState[state],
    };
  }

  private makePalette(c1: string, c2: string, c3: string): Phaser.Types.Create.Palette {
    return {
      "0": "#00000000",
      "1": c1,
      "2": c2,
      "3": c3,
      "4": "#00000000",
      "5": "#00000000",
      "6": "#00000000",
      "7": "#00000000",
      "8": "#00000000",
      "9": "#00000000",
      A: "#00000000",
      B: "#00000000",
      C: "#00000000",
      D: "#00000000",
      E: "#00000000",
      F: "#00000000",
    };
  }
}
