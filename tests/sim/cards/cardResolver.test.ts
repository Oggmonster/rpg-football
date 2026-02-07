import { describe, expect, test } from "vitest";
import { CardCatalog } from "../../../src/sim/cards/CardCatalog";
import { CardResolver } from "../../../src/sim/cards/CardResolver";
import type { CardDef } from "../../../src/sim/cards/types";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";

const attack: CardDef[] = [
  { id: "A_PASS", name: "Pass", deck: "ATTACK", type: "PASS", cooldownMs: 1000 },
];

const defense: CardDef[] = [
  { id: "D_TACKLE", name: "Tackle", deck: "DEFENSE", type: "TACKLE", cooldownMs: 1000 },
];

function createState() {
  return createInitialMatchState({
    rngSeed: 1,
    homeDecks: { attack: ["A_PASS"], defense: ["D_TACKLE"] },
    awayDecks: { attack: ["A_PASS"], defense: ["D_TACKLE"] },
  });
}

describe("CardResolver context", () => {
  test("denies attack card when team does not have possession", () => {
    const state = createState();
    state.possession.team = "AWAY";
    state.ball.state = "CARRIED";
    state.ball.carrierId = state.teams.AWAY.playerIds[0];
    state.ball.lastTouchTeam = "AWAY";
    const resolver = new CardResolver(new CardCatalog(attack), new CardCatalog(defense));

    const card = resolver.tryPlay(state, "HOME", "A_PASS", "ATTACK");

    expect(card).toBeNull();
  });

  test("denies defense card when team has possession", () => {
    const state = createState();
    state.possession.team = "HOME";
    state.ball.state = "CARRIED";
    state.ball.carrierId = state.teams.HOME.playerIds[0];
    state.ball.lastTouchTeam = "HOME";
    const resolver = new CardResolver(new CardCatalog(attack), new CardCatalog(defense));

    const card = resolver.tryPlay(state, "HOME", "D_TACKLE", "DEFENSE");

    expect(card).toBeNull();
  });

  test("applies cooldown and lockout on successful play", () => {
    const state = createState();
    state.possession.team = "HOME";
    const resolver = new CardResolver(new CardCatalog(attack), new CardCatalog(defense));

    const card = resolver.tryPlay(state, "HOME", "A_PASS", "ATTACK");

    expect(card?.id).toBe("A_PASS");
    expect(state.teams.HOME.cooldowns.A_PASS).toBeGreaterThan(0);
    expect(state.teams.HOME.lockoutMs).toBeGreaterThan(0);
  });
});
