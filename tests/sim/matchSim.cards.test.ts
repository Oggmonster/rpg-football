import { describe, expect, test } from "vitest";
import attackCatalog from "../../src/data/cards.attack.json";
import defenseCatalog from "../../src/data/cards.defense.json";
import { HAND_SIZE } from "../../src/sim/config/MatchConfig";
import { MatchSim } from "../../src/sim/MatchSim";

describe("MatchSim card lifecycle and hand swap", () => {
  test("shows attack hand in possession and defense hand when out of possession", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 77,
    });

    const stateA = JSON.parse(sim.getStateSnapshot());
    expect(sim.getActiveDeckKind()).toBe("ATTACK");
    expect(sim.getActiveHandCardIds()).toEqual(stateA.teams.HOME.handAttack.cards);

    sim.togglePossession();

    const stateB = JSON.parse(sim.getStateSnapshot());
    expect(sim.getActiveDeckKind()).toBe("DEFENSE");
    expect(sim.getActiveHandCardIds()).toEqual(stateB.teams.HOME.handDefense.cards);
  });

  test("cycles played card in attack deck and draws replacement", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 99,
    });

    const before = JSON.parse(sim.getStateSnapshot());
    const cardId = sim.getActiveHandCardIds()[0];

    const ok = sim.playCard(cardId, { direction: { x: 1, y: 0 } });

    const after = JSON.parse(sim.getStateSnapshot());
    expect(ok).toBe(true);
    expect(after.teams.HOME.handAttack.cards.length).toBe(HAND_SIZE);
    expect(after.teams.HOME.deckAttack.draw[after.teams.HOME.deckAttack.draw.length - 1]).toBe(cardId);
    expect(before.teams.HOME.handAttack.cards).not.toEqual(after.teams.HOME.handAttack.cards);
  });

  test("cycles played card in defense deck when opponent has possession", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 101,
    });

    sim.togglePossession();
    const cardId = sim.getActiveHandCardIds()[0];
    const ok = sim.playCard(cardId, { direction: { x: -1, y: 0 } });

    const after = JSON.parse(sim.getStateSnapshot());
    expect(sim.getActiveDeckKind()).toBe("DEFENSE");
    expect(ok).toBe(true);
    expect(after.teams.HOME.handDefense.cards.length).toBe(HAND_SIZE);
    expect(after.teams.HOME.deckDefense.draw[after.teams.HOME.deckDefense.draw.length - 1]).toBe(cardId);
  });

  test("throws on invalid deck constraints", () => {
    const invalidAttack = { cards: attackCatalog.cards.slice(0, 14) };

    expect(() =>
      MatchSim.createFromCatalogs({
        attackCatalog: invalidAttack,
        defenseCatalog,
        rngSeed: 5,
      })
    ).toThrowError();
  });
});
