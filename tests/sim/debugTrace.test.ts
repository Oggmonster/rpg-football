import { describe, expect, test } from "vitest";
import attackCatalog from "../../src/data/cards.attack.json";
import defenseCatalog from "../../src/data/cards.defense.json";
import { MatchSim } from "../../src/sim/MatchSim";

function runScripted(seed: number) {
  const sim = MatchSim.createFromCatalogs({ attackCatalog, defenseCatalog, rngSeed: seed });

  for (let i = 0; i < 40; i++) {
    sim.step(16);
  }

  const first = sim.getActiveHandCardIds()[0];
  sim.playCard(first, { direction: { x: 1, y: 0 } });
  for (let i = 0; i < 20; i++) sim.step(16);

  sim.togglePossession();
  const second = sim.getActiveHandCardIds()[0];
  sim.playCard(second, { direction: { x: -1, y: 0 } });
  for (let i = 0; i < 25; i++) sim.step(16);

  return sim.getDebugLogJson(400);
}

describe("deterministic debug trace", () => {
  test("same seed and actions produce identical trace", () => {
    const a = runScripted(2026);
    const b = runScripted(2026);
    expect(a).toBe(b);
  });

  test("different seed produces different trace", () => {
    const a = runScripted(2026);
    const b = runScripted(2027);
    expect(a).not.toBe(b);
  });
});
