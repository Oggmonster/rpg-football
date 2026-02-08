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

  test("switches to defense hand while ball is in flight", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 222,
    });

    const state = sim.getRenderState();
    state.ball.state = "CARRIED";
    state.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";

    const ok = sim.playCard("ATT_PASS_1", {});
    expect(ok).toBe(true);
    expect(state.ball.carrierId).toBeNull();
    expect(sim.getActiveDeckKind()).toBe("DEFENSE");
    expect(sim.getActiveHandCardIds()).toEqual(state.teams.HOME.handDefense.cards);
  });

  test("records card debug trace with resolved type and result", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 333,
    });
    const state = sim.getRenderState();
    state.ball.state = "CARRIED";
    state.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";

    const ok = sim.playCard("ATT_PASS_1", {});
    expect(ok).toBe(true);
    expect(sim.getLastCardDebugLine()).toContain("ATT_PASS_1 -> PASS -> played");
  });

  test("uses directional input to set pass target", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 444,
    });
    const state = sim.getRenderState();
    state.ball.state = "CARRIED";
    state.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";
    const carrierBefore = state.players[state.ball.carrierId ?? state.teams.HOME.playerIds[0]].pos;

    const ok = sim.playCard("ATT_PASS_1", { direction: { x: 0, y: -1 } });
    expect(ok).toBe(true);
    expect(state.ball.targetPos).not.toBeNull();
    expect((state.ball.targetPos?.y ?? 0) < carrierBefore.y).toBe(true);
  });

  test("sanitizes invalid directional input values", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 449,
    });
    const state = sim.getRenderState();
    state.ball.state = "CARRIED";
    state.teams.HOME.handAttack.cards[0] = "ATT_PASS_1";

    const ok = sim.playCard("ATT_PASS_1", {
      direction: { x: Number.NaN, y: Number.NaN },
      targetPos: { x: Number.NaN, y: Number.NaN },
    });

    expect(ok).toBe(true);
    expect(Number.isFinite(state.ball.pos.x)).toBe(true);
    expect(Number.isFinite(state.ball.pos.y)).toBe(true);
    expect(Number.isFinite(state.ball.vel.x)).toBe(true);
    expect(Number.isFinite(state.ball.vel.y)).toBe(true);
  });

  test("emits card_result events for success and failure", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 445,
    });
    const successCard = sim.getActiveHandCardIds()[0];
    const ok = sim.playCard(successCard, { direction: { x: 1, y: 0 } });
    expect(ok).toBe(true);

    const successEvent = sim
      .drainEvents()
      .find((e) => e.type === "card_result" && e.cardId === successCard && e.success === true);
    expect(successEvent).toBeTruthy();

    sim.step(999999);
    const blockedCard = sim.getActiveHandCardIds()[0];
    const blocked = sim.playCard(blockedCard, { direction: { x: 1, y: 0 } });
    expect(blocked).toBe(false);
    const failEvent = sim
      .drainEvents()
      .find((e) => e.type === "card_result" && e.cardId === blockedCard && e.success === false);
    expect(failEvent).toBeTruthy();
  });

  test("blocks card play during halftime", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 446,
    });
    sim.step(120000);
    const state = sim.getRenderState();
    expect(state.phase).toBe("HALFTIME");

    const card = sim.getActiveHandCardIds()[0];
    const ok = sim.playCard(card, { direction: { x: 1, y: 0 } });
    expect(ok).toBe(false);
    expect(sim.getLastActionMessage()).toContain("Halftime");
  });

  test("exposes hand UI status for lockout and cooldown", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 447,
    });
    const state = sim.getRenderState();
    const card = sim.getActiveHandCardIds()[0];

    state.teams.HOME.lockoutMs = 320;
    let ui = sim.getActiveHandCardUi();
    expect(ui[card].status).toBe("LOCKOUT");
    expect(ui[card].playable).toBe(false);

    state.teams.HOME.lockoutMs = 0;
    state.teams.HOME.cooldowns[card] = 1400;
    ui = sim.getActiveHandCardUi();
    expect(ui[card].status).toBe("COOLDOWN");
    expect(ui[card].playable).toBe(false);
  });

  test("exposes halftime hand UI status", () => {
    const sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 448,
    });

    sim.step(120000);
    const handIds = sim.getActiveHandCardIds();
    const ui = sim.getActiveHandCardUi();
    expect(handIds.length).toBeGreaterThan(0);
    expect(ui[handIds[0]].status).toBe("PHASE");
    expect(ui[handIds[0]].reason).toContain("Halftime");
  });
});
