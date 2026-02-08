import { describe, expect, test } from "vitest";
import attackCatalog from "../../src/data/cards.attack.json";
import defenseCatalog from "../../src/data/cards.defense.json";
import { MatchSim } from "../../src/sim/MatchSim";

describe("Team commands and momentum", () => {
  test("activates equipped team command and consumes it", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 610,
    });

    const ok = sim.playTeamCommand("ALL_OUT_ATTACK");
    expect(ok).toBe(true);

    const ui = sim.getTeamCommandsForUi();
    const allOut = ui.find((c) => c.type === "ALL_OUT_ATTACK");
    expect(allOut?.active).toBe(true);
    expect(allOut?.used).toBe(true);

    const secondTry = sim.playTeamCommand("ALL_OUT_ATTACK");
    expect(secondTry).toBe(false);
  });

  test("expires active team command after its duration", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 611,
    });

    const ok = sim.playTeamCommand("HIGH_PRESS");
    expect(ok).toBe(true);

    sim.step(21000);
    const ui = sim.getTeamCommandsForUi();
    const highPress = ui.find((c) => c.type === "HIGH_PRESS");
    expect(highPress?.active).toBe(false);
    expect(highPress?.used).toBe(true);
  });

  test("momentum and command modifiers impact cooldown", () => {
    const simGood = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 612,
    });
    const goodState = simGood.getRenderState();
    goodState.ball.state = "CARRIED";
    goodState.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";
    simGood.getRenderState().momentum = 0.8;
    simGood.playTeamCommand("ALL_OUT_ATTACK");
    const goodCard = "ATT_PASS_1";
    const goodPlayed = simGood.playCard(goodCard, { direction: { x: 1, y: 0 } });
    expect(goodPlayed).toBe(true);
    const goodCooldown = simGood.getRenderState().teams.HOME.cooldowns[goodCard];

    const simBad = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 613,
    });
    const badState = simBad.getRenderState();
    badState.ball.state = "CARRIED";
    badState.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";
    badState.momentum = -0.8;
    const badCard = "ATT_PASS_1";
    const badPlayed = simBad.playCard(badCard, { direction: { x: 1, y: 0 } });
    expect(badPlayed).toBe(true);
    const badCooldown = simBad.getRenderState().teams.HOME.cooldowns[badCard];

    expect(goodCooldown).toBeLessThan(badCooldown);
  });
});
