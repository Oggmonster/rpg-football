import { describe, expect, test } from "vitest";
import attackCatalog from "../../../src/data/cards.attack.json";
import defenseCatalog from "../../../src/data/cards.defense.json";
import { MatchSim } from "../../../src/sim/MatchSim";
import { loadProfile } from "../../../src/game/profile/ProfileStore";
import { applyMatchProgression } from "../../../src/game/progression/ProgressionSystem";

describe("applyMatchProgression", () => {
  test("awards manager and player progression on full time", () => {
    const profile = loadProfile();
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 9901,
      homeTeamCommands: profile.teamCommandDeckIds,
    });

    const state = sim.getRenderState();
    state.phase = "ENDED";
    state.score.HOME = 2;
    state.score.AWAY = 1;
    state.momentum = 0.45;

    const sampleId = profile.squadIds[0];
    const beforePlayer = profile.collection.find((p) => p.id === sampleId);
    const beforeManagerCoins = profile.manager.coins;

    const { updated, summary } = applyMatchProgression(profile, state, profile.squadIds);

    const afterPlayer = updated.collection.find((p) => p.id === sampleId);
    expect(summary.resultLabel).toBe("WIN");
    expect(updated.manager.matchesPlayed).toBe(profile.manager.matchesPlayed + 1);
    expect(updated.manager.coins).toBeGreaterThan(beforeManagerCoins);
    expect(afterPlayer?.xp ?? 0).toBeGreaterThanOrEqual(beforePlayer?.xp ?? 0);
  });
});
