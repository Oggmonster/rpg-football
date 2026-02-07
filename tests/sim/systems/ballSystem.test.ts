import { describe, expect, test } from "vitest";
import { DECK_SIZE } from "../../../src/sim/config/MatchConfig";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import type { MatchState } from "../../../src/sim/state/MatchState";
import { BallSystem } from "../../../src/sim/systems/BallSystem";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => `${prefix}_${i + 1}`);
}

function makeState(seed = 42): MatchState {
  return createInitialMatchState({
    rngSeed: seed,
    homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
    awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
  });
}

describe("BallSystem transitions", () => {
  test("KICKOFF -> CARRIED on first step", () => {
    const state = makeState();
    const system = new BallSystem(42);

    const transitions = system.step(state, 16);

    expect(transitions.some((t) => t.from === "KICKOFF" && t.to === "CARRIED")).toBe(true);
    expect(state.ball.state).toBe("CARRIED");
  });

  test("CARRIED -> IN_FLIGHT and then IN_FLIGHT -> LOOSE when no receiver", () => {
    const state = makeState();
    const system = new BallSystem(42);

    system.step(state, 16);
    for (const p of Object.values(state.players)) {
      p.pos = { x: 0, y: 0 };
    }

    const passOk = system.passTo(state, { x: 780, y: 270 });
    expect(passOk).toBe(true);
    expect(state.ball.state).toBe("IN_FLIGHT");

    let sawLoose = false;
    for (let i = 0; i < 180; i++) {
      const t = system.step(state, 16);
      if (t.some((x) => x.from === "IN_FLIGHT" && x.to === "LOOSE")) {
        sawLoose = true;
        break;
      }
    }

    expect(sawLoose).toBe(true);
    expect(state.ball.state).toBe("LOOSE");
  });

  test("SHOT -> GOAL increments score", () => {
    const state = makeState();
    const system = new BallSystem(55);

    system.step(state, 16);
    for (const p of Object.values(state.players)) {
      p.pos = { x: 0, y: 0 };
    }

    const shotOk = system.shootTo(state, { x: 1200, y: 270 });
    expect(shotOk).toBe(true);

    let reachedGoal = false;
    for (let i = 0; i < 240; i++) {
      const t = system.step(state, 16);
      if (t.some((x) => x.to === "GOAL")) {
        reachedGoal = true;
        break;
      }
    }

    expect(reachedGoal).toBe(true);
    expect(state.ball.state).toBe("GOAL");
    expect(state.score.HOME).toBe(1);
  });

  test("LOOSE -> CARRIED on pickup by nearest player", () => {
    const state = makeState();
    const system = new BallSystem(123);

    const awayId = state.teams.AWAY.playerIds[0];
    const away = state.players[awayId];

    state.ball.state = "LOOSE";
    state.ball.carrierId = null;
    state.ball.pos = { x: away.pos.x, y: away.pos.y };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = "HOME";

    system.step(state, 16);

    expect(state.ball.state).toBe("CARRIED");
    expect(state.ball.carrierId).toBe(awayId);
    expect(state.possession.team).toBe("AWAY");
  });

  test("invalid transition guard: cannot shoot from KICKOFF", () => {
    const state = makeState();
    const system = new BallSystem(42);

    const ok = system.shootTo(state, { x: 1000, y: 250 });

    expect(ok).toBe(false);
    expect(state.ball.state).toBe("KICKOFF");
  });
});
