import { describe, expect, test } from "vitest";
import attackCatalog from "../../src/data/cards.attack.json";
import defenseCatalog from "../../src/data/cards.defense.json";
import { HAND_SIZE } from "../../src/sim/config/MatchConfig";
import { MatchSim } from "../../src/sim/MatchSim";

describe("Match flow", () => {
  test("goal enters reset window and restarts with conceding team kickoff", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 501,
    });

    sim.forceGoal("HOME");

    let state = JSON.parse(sim.getStateSnapshot());
    expect(state.ball.state).toBe("GOAL");
    expect(state.flow.goalResetMsRemaining).toBeGreaterThan(0);
    expect(state.flow.restartTeam).toBe("AWAY");

    sim.step(1000);
    state = JSON.parse(sim.getStateSnapshot());
    expect(state.ball.state).toBe("GOAL");
    expect(state.flow.goalResetMsRemaining).toBeGreaterThan(0);

    sim.step(600);
    state = JSON.parse(sim.getStateSnapshot());
    expect(state.ball.state).toBe("KICKOFF");
    expect(state.possession.team).toBe("AWAY");
    expect(state.flow.restartTeam).toBeNull();
  });

  test("match ends at duration and blocks card plays", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 502,
    });

    sim.step(999999);
    const endState = JSON.parse(sim.getStateSnapshot());
    expect(endState.phase).toBe("ENDED");

    const card = sim.getActiveHandCardIds()[0];
    const ok = sim.playCard(card, { direction: { x: 1, y: 0 } });
    expect(ok).toBe(false);
  });

  test("resetMatch restores fresh match state", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 503,
    });

    sim.step(2000);
    sim.forceGoal("AWAY");
    sim.resetMatch(700);

    const state = JSON.parse(sim.getStateSnapshot());
    expect(state.timeMs).toBe(0);
    expect(state.phase).toBe("KICKOFF");
    expect(state.score.HOME).toBe(0);
    expect(state.score.AWAY).toBe(0);
    expect(state.rngSeed).toBe(700);
    expect(state.teams.HOME.handAttack.cards.length).toBe(HAND_SIZE);
    expect(state.teams.HOME.handDefense.cards.length).toBe(HAND_SIZE);
  });
});
