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
      this.playerDef("player_gk_home_idle", "#4ea3ff", "#2f6fc4", "idle"),
      this.playerDef("player_gk_home_run_a", "#4ea3ff", "#2f6fc4", "run_a"),
      this.playerDef("player_gk_home_run_b", "#4ea3ff", "#2f6fc4", "run_b"),
      this.playerDef("player_gk_home_kick", "#4ea3ff", "#2f6fc4", "kick"),
      this.playerDef("player_gk_home_tackle", "#4ea3ff", "#2f6fc4", "tackle"),
      this.playerDef("player_gk_home_save", "#4ea3ff", "#2f6fc4", "save"),
      this.playerDef("player_gk_away_idle", "#ff8b52", "#c65a2f", "idle"),
      this.playerDef("player_gk_away_run_a", "#ff8b52", "#c65a2f", "run_a"),
      this.playerDef("player_gk_away_run_b", "#ff8b52", "#c65a2f", "run_b"),
      this.playerDef("player_gk_away_kick", "#ff8b52", "#c65a2f", "kick"),
      this.playerDef("player_gk_away_tackle", "#ff8b52", "#c65a2f", "tackle"),
      this.playerDef("player_gk_away_save", "#ff8b52", "#c65a2f", "save"),
      {
        key: "ball_idle",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#ffffff", "#dce6e0", "#0f1311"),
        data: ["........", "..1111..", ".122221.", ".122221.", ".122221.", ".122221.", "..1111..", "........"],
      },
      {
        key: "ball_flight",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#e7fffc", "#9debd7", "#0f1311"),
        data: ["........", "..1111..", ".122221.", ".122221.", ".122221.", ".122221.", "..1111..", "........"],
      },
      {
        key: "ball_shot",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#fff0d7", "#ffb26d", "#4d2a17"),
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
      idle: [
        "............",
        "....1111....",
        "...122221...",
        "...129921...",
        "..14444441..",
        "..14555541..",
        "..14555541..",
        "...166661...",
        "...16..61...",
        "..16....61..",
        "............",
        "............",
      ],
      run_a: [
        "............",
        "....1111....",
        "...122221...",
        "...129921...",
        "..14444441..",
        "..14555541..",
        "..14555541..",
        "...166661...",
        "..16..61....",
        "...6....6...",
        "............",
        "............",
      ],
      run_b: [
        "............",
        "....1111....",
        "...122221...",
        "...129921...",
        "..14444441..",
        "..14555541..",
        "..14555541..",
        "...166661...",
        "...16..61...",
        "..6....6....",
        "............",
        "............",
      ],
      kick: [
        "............",
        "....1111....",
        "...122221...",
        "...129921...",
        "..14444441..",
        "..14555541..",
        "..14555541..",
        "...166661...",
        "..16..61....",
        ".....6....66",
        "............",
        "............",
      ],
      tackle: [
        "............",
        ".....1111...",
        "....122221..",
        "...1299921..",
        "..14444441..",
        ".14555541...",
        "1666661.....",
        "..16.61.....",
        "...6..6.....",
        "............",
        "............",
        "............",
      ],
      save: [
        "............",
        "...1111.....",
        "..122221....",
        ".12999921...",
        "144888441...",
        ".45555541...",
        "..1666661...",
        "...16..61...",
        "..6....6....",
        "............",
        "............",
        "............",
      ],
    };

    const isGoalkeeper = key.includes("player_gk_");
    return {
      key,
      pixelWidth: 2,
      palette: this.makePalette({
        body,
        shade,
        outline: "#0c130f",
        skin: "#e8b889",
        hair: "#5f3f21",
        trim: "#f4f6ff",
        accent: isGoalkeeper ? "#d5f4ff" : "#f4f6ff",
        boots: "#1a2131",
      }),
      data: mapByState[state],
    };
  }

  private makePalette(colors: {
    body: string;
    shade: string;
    outline: string;
    skin: string;
    hair: string;
    trim: string;
    accent: string;
    boots: string;
  }): Phaser.Types.Create.Palette {
    return {
      "0": "#00000000",
      "1": colors.outline,
      "2": colors.skin,
      "3": colors.hair,
      "4": colors.body,
      "5": colors.shade,
      "6": colors.boots,
      "7": colors.trim,
      "8": colors.accent,
      "9": "#f8ffff",
      A: colors.outline,
      B: "#00000000",
      C: "#00000000",
      D: "#00000000",
      E: "#00000000",
      F: "#00000000",
    };
  }

  private makeSimplePalette(c1: string, c2: string, c3: string): Phaser.Types.Create.Palette {
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
