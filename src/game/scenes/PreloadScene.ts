import Phaser from "phaser";

type PixelTextureDef = {
  key: string;
  data: string[];
  palette: Phaser.Types.Create.Palette;
  pixelWidth?: number;
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {}

  create() {
    // Fill any missing textures with procedural fallbacks.
    this.generateRuntimeTextures();
    this.scene.start("MainMenuScene");
  }

  private generateRuntimeTextures() {
    const defs: PixelTextureDef[] = [
      this.playerDef("player_home_idle", "idle"),
      this.playerDef("player_home_run_a", "run_a"),
      this.playerDef("player_home_run_b", "run_b"),
      this.playerDef("player_home_kick", "kick"),
      this.playerDef("player_home_tackle", "tackle"),
      this.playerDef("player_away_idle", "idle"),
      this.playerDef("player_away_run_a", "run_a"),
      this.playerDef("player_away_run_b", "run_b"),
      this.playerDef("player_away_kick", "kick"),
      this.playerDef("player_away_tackle", "tackle"),
      this.playerDef("player_gk_home_idle", "idle"),
      this.playerDef("player_gk_home_run_a", "run_a"),
      this.playerDef("player_gk_home_run_b", "run_b"),
      this.playerDef("player_gk_home_kick", "kick"),
      this.playerDef("player_gk_home_tackle", "tackle"),
      this.playerDef("player_gk_home_save", "save"),
      this.playerDef("player_gk_away_idle", "idle"),
      this.playerDef("player_gk_away_run_a", "run_a"),
      this.playerDef("player_gk_away_run_b", "run_b"),
      this.playerDef("player_gk_away_kick", "kick"),
      this.playerDef("player_gk_away_tackle", "tackle"),
      this.playerDef("player_gk_away_save", "save"),
      {
        key: "ball_idle",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#fdfdf6", "#cfd7d8", "#12161a"),
        data: ["..........", "...1111...", "..122221..", ".12322321.", ".12211221.", ".12322321.", "..122221..", "...1111...", "..........", ".........."],
      },
      {
        key: "ball_flight",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#fdfdf6", "#97f2eb", "#12161a"),
        data: ["..........", "...1111...", "..122221..", ".12322321.", ".12211221.", ".12322321.", "..122221..", "...1111...", "..........", ".........."],
      },
      {
        key: "ball_shot",
        pixelWidth: 2,
        palette: this.makeSimplePalette("#fff6df", "#ffb26d", "#3f2418"),
        data: ["..........", "...1111...", "..122221..", ".12322321.", ".12211221.", ".12322321.", "..122221..", "...1111...", "..........", ".........."],
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

  private playerDef(key: string, state: "idle" | "run_a" | "run_b" | "kick" | "tackle" | "save") {
    const mapByState: Record<typeof state, string[]> = {
      idle: [
        "................",
        ".....1111.......",
        "....1222221.....",
        "....1233321.....",
        "...123444321....",
        "...155566551....",
        "..15666666651...",
        "..15667776651...",
        "..15677777651...",
        "...1677777761...",
        "...1889999881...",
        "..18899999981...",
        "..18AAA11AAA81..",
        "..1AAB....BAA1..",
        "...BB....BB.....",
        "..1D......D1....",
        "...D......D.....",
        "................",
      ],
      run_a: [
        "................",
        "......1111......",
        ".....1222221....",
        ".....1233321....",
        "....123444321...",
        "...1555665551...",
        "...15666666651..",
        "..156677776651..",
        "..156777777651..",
        "...1677777761...",
        "..1889999881....",
        "..18899999881...",
        "...8AAA11AAA81..",
        "..1AAB..B.BA1...",
        "...BB....BB.D...",
        "..1D......D.....",
        "................",
        "................",
      ],
      run_b: [
        "................",
        "......1111......",
        "....1222221.....",
        "....1233321.....",
        "...123444321....",
        "...1555566551...",
        "..15666666651...",
        "..156677776651..",
        "..156777777651..",
        "...1677777761...",
        "....1889999881..",
        "...18899999881..",
        "..18AAA11AAA8...",
        "..1AAB.B..BAA1..",
        "...D.BB....BB...",
        ".....D......D1..",
        "................",
        "................",
      ],
      kick: [
        "................",
        ".....1111.......",
        "....1222221.....",
        "....1233321.....",
        "...123444321....",
        "...155566551....",
        "..15666666651...",
        "..15667777651...",
        "..15677777651...",
        "...1677777761...",
        "...188999981....",
        "..1889999981....",
        "..18AAA11AA81...",
        "..1AAB....BAA1..",
        "...BB......BBBD.",
        "..1D.........D..",
        "................",
        "................",
      ],
      tackle: [
        "................",
        ".......1111.....",
        "......1222221...",
        ".....12333321...",
        "....123444321...",
        "...1555665551...",
        "..15666666651...",
        ".156677777651...",
        ".156777777651...",
        "..16777777761...",
        "...18899999881..",
        "....18999999881.",
        ".....8AAA11AAA1.",
        ".....BAAB...BAA1",
        "....BB.......BB.",
        "...1D.........D.",
        "................",
        "................",
      ],
      save: [
        "................",
        "....111111......",
        "..122222221.....",
        ".1233333321.....",
        "123444444321....",
        "1555666666551...",
        "15666666666651..",
        "1666777776661...",
        ".16777777761....",
        "..1889999881....",
        ".18899999981....",
        "18AAAA11AAAA81..",
        "1AAB......BAA1..",
        ".BB........BB...",
        "1D..........D1..",
        ".D..........D...",
        "................",
        "................",
      ],
    };

    const isGoalkeeper = key.includes("player_gk_");
    return {
      key,
      pixelWidth: 2,
      palette: this.makePalette(key, isGoalkeeper),
      data: mapByState[state],
    };
  }

  private makePalette(key: string, isGoalkeeper: boolean): Phaser.Types.Create.Palette {
    const palette =
      key.includes("player_home")
        ? {
            shirtLight: "#f3f3eb",
            shirtPrimary: isGoalkeeper ? "#6ad3ff" : "#d7e3ff",
            shirtShade: isGoalkeeper ? "#2f8eb7" : "#6f88c4",
            shorts: isGoalkeeper ? "#2b5b7a" : "#2355c8",
            shortsShade: isGoalkeeper ? "#163b52" : "#17388b",
            socks: isGoalkeeper ? "#d9f6ff" : "#f3f3eb",
          }
        : key.includes("player_away")
          ? {
              shirtLight: isGoalkeeper ? "#ffd6bf" : "#fbf1c9",
              shirtPrimary: isGoalkeeper ? "#ff8b52" : "#d9b34a",
              shirtShade: isGoalkeeper ? "#c95b2f" : "#8e6e1d",
              shorts: isGoalkeeper ? "#7a3416" : "#453d4d",
              shortsShade: isGoalkeeper ? "#4a1c0f" : "#24212b",
              socks: isGoalkeeper ? "#fff0e5" : "#f7e9bf",
            }
          : {
              shirtLight: "#f3f3eb",
              shirtPrimary: "#d7e3ff",
              shirtShade: "#6f88c4",
              shorts: "#2355c8",
              shortsShade: "#17388b",
              socks: "#f3f3eb",
            };

    return {
      "0": "#00000000",
      "1": "#11161b",
      "2": "#4e2d18",
      "3": "#ffc17c",
      "4": "#d6853d",
      "5": palette.shirtLight,
      "6": palette.shirtPrimary,
      "7": palette.shirtShade,
      "8": palette.shorts,
      "9": palette.shortsShade,
      A: palette.socks,
      B: "#171b22",
      C: "#ffffff",
      D: "#2b3036",
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
