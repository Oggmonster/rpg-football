import { describe, expect, test } from "vitest";
import { buildAwayRatings, buildHomeRatings, DriveMatchEngine } from "../../../src/game/drive/DriveMatchEngine";

describe("DriveMatchEngine soccer tactics mode", () => {
  test("starts at midfield with a full offensive hand", () => {
    const engine = new DriveMatchEngine({ rngSeed: 7 });
    const state = engine.getState();

    expect(state.possession).toBe("HOME");
    expect(state.zone).toBe(3);
    expect(state.lane).toBe("CENTER");
    expect(engine.getUserDeckKind()).toBe("OFFENSE");
    expect(engine.getUserHand()).toHaveLength(4);
    expect(state.userHands.DEFENSE).toHaveLength(4);
  });

  test("playing an attacking card advances the turn and refills the hand", () => {
    const engine = new DriveMatchEngine({ rngSeed: 7 });
    const firstCard = engine.getUserHand()[0];
    const target = engine.getTargetOptions(firstCard.id)[0]?.id;
    const result = engine.playUserCard(firstCard.id, undefined, target);

    expect(result.userDeck).toBe("OFFENSE");
    expect(engine.getState().turn).toBe(1);
    expect(engine.getUserHand()).toHaveLength(4);
  });

  test("away possession switches the player into a defensive hand", () => {
    const engine = new DriveMatchEngine({ rngSeed: 9 });
    const state = engine.getState();
    state.possession = "AWAY";
    const defenseCard = state.userHands.DEFENSE[0];
    const result = engine.playUserCard(defenseCard);

    expect(result.userDeck).toBe("DEFENSE");
    expect(engine.getState().turn).toBe(1);
  });

  test("a high-quality shot in the box can score and restart possession", () => {
    const engine = new DriveMatchEngine({
      rngSeed: 1,
      homeRatings: { offense: 92, defense: 70, identity: "CONTROL", starNames: ["A", "B", "C"] },
      awayRatings: { offense: 52, defense: 52, identity: "REACTIVE", starNames: ["X", "Y", "Z"] },
      teamCommands: ["ALL_OUT_ATTACK", "PARK_THE_BUS", "HIGH_PRESS", "FLUID_FORMATION", "FAST_COUNTER"],
    });
    const state = engine.getState();
    state.zone = 6;
    state.lane = "CENTER";
    state.userHands.OFFENSE = ["CURLED_SHOT", "SAFE_PASS", "CROSS", "THROUGH_BALL"];

    const result = engine.playUserCard("CURLED_SHOT", "ALL_OUT_ATTACK", "ST");

    expect(result.tags).toContain("goal");
    expect(state.score.HOME).toBe(1);
    expect(state.possession).toBe("AWAY");
  });

  test("the last action of the match sets a winner or draw", () => {
    const engine = new DriveMatchEngine({ rngSeed: 3 });
    const state = engine.getState();
    state.turn = 17;
    state.score.HOME = 1;
    state.score.AWAY = 0;
    const card = state.userHands.OFFENSE[0];

    engine.playUserCard(card, undefined, engine.getTargetOptions(card)[0]?.id);

    expect(state.winner).toBe("HOME");
  });

  test("rating builders still return usable values", () => {
    const home = buildHomeRatings([
      {
        id: "1",
        name: "A",
        role: "MID",
        rarity: "Common",
        archetypeId: "X",
        archetypeName: "X",
        tacticalIdentity: "CONTROL",
        traits: [],
        perkSlots: { total: 1, unlocked: 1 },
        growthCaps: { pac: 80, sho: 80, pas: 80, dri: 80, def: 80, phy: 80 },
        stats: { pac: 70, sho: 71, pas: 74, dri: 73, def: 60, phy: 61 },
        level: 1,
        xp: 0,
        bonusTraits: [],
      },
      {
        id: "2",
        name: "B",
        role: "DEF",
        rarity: "Common",
        archetypeId: "Y",
        archetypeName: "Y",
        tacticalIdentity: "CONTROL",
        traits: [],
        perkSlots: { total: 1, unlocked: 1 },
        growthCaps: { pac: 80, sho: 80, pas: 80, dri: 80, def: 80, phy: 80 },
        stats: { pac: 66, sho: 40, pas: 55, dri: 50, def: 78, phy: 74 },
        level: 1,
        xp: 0,
        bonusTraits: [],
      },
    ]);
    const away = buildAwayRatings(5);

    expect(home.offense).toBeGreaterThan(50);
    expect(home.defense).toBeGreaterThan(50);
    expect(away.offense).toBeGreaterThan(50);
  });

  test("pass cards expose visible target options", () => {
    const engine = new DriveMatchEngine({ rngSeed: 5 });
    const options = engine.getTargetOptions("SAFE_PASS");

    expect(options.length).toBeGreaterThan(1);
    expect(options[0]).toHaveProperty("label");
    expect(options[0]).toHaveProperty("lane");
  });
});
