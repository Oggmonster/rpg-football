import { describe, expect, test } from "vitest";
import attackCatalog from "../../src/data/cards.attack.json";
import defenseCatalog from "../../src/data/cards.defense.json";
import { MatchSim } from "../../src/sim/MatchSim";

describe("MatchSim event modifiers", () => {
  test("applies cooldown multiplier from active event", () => {
    const base = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 2231,
    });
    const boosted = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 2231,
      eventModifiers: {
        cooldownMultiplier: 0.8,
        momentumMultiplier: 1,
        passBonus: 0,
        shotBonus: 0,
        dribbleBonus: 0,
      },
    });

    const baseState = base.getRenderState();
    const boostedState = boosted.getRenderState();
    baseState.ball.state = "CARRIED";
    boostedState.ball.state = "CARRIED";
    baseState.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";
    boostedState.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";

    const okBase = base.playCard("ATT_PASS_1", { direction: { x: 1, y: 0 } });
    const okBoosted = boosted.playCard("ATT_PASS_1", { direction: { x: 1, y: 0 } });

    expect(okBase).toBe(true);
    expect(okBoosted).toBe(true);

    const cdBase = baseState.teams.HOME.cooldowns["ATT_PASS_1"];
    const cdBoosted = boostedState.teams.HOME.cooldowns["ATT_PASS_1"];
    expect(cdBoosted).toBeLessThan(cdBase);
  });
});
