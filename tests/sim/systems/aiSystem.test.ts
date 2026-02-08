import { describe, expect, test } from "vitest";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import { AISystem } from "../../../src/sim/systems/AISystem";
import { BallSystem } from "../../../src/sim/systems/BallSystem";
import { PassSystem } from "../../../src/sim/systems/PassSystem";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: 15 }, (_, i) => `${prefix}_${i + 1}`);
}

describe("AISystem", () => {
  test("assigns defensive marks", () => {
    const state = createInitialMatchState({
      rngSeed: 21,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    state.ball.state = "CARRIED";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";

    const ai = new AISystem();
    ai.step(state, new BallSystem(21), new PassSystem());

    const marked = state.teams.AWAY.playerIds
      .map((id) => state.players[id])
      .filter((p) => p.markTargetId !== null);

    expect(marked.length).toBeGreaterThan(0);
  });

  test("carrier gets intent when none exists", () => {
    const state = createInitialMatchState({
      rngSeed: 30,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    const carrierId = state.ball.carrierId!;
    state.ball.state = "CARRIED";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";
    state.players[carrierId].stats.sho = 80;
    state.players[carrierId].pos = { x: 900, y: 270 };

    const ai = new AISystem();
    ai.step(state, new BallSystem(30), new PassSystem());

    expect(state.players[carrierId].intent).not.toBeNull();
  });

  test("assigns loose-ball chase intent to nearest outfield players", () => {
    const state = createInitialMatchState({
      rngSeed: 77,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    state.ball.state = "LOOSE";
    state.ball.carrierId = null;
    state.ball.pos = { x: 480, y: 270 };
    state.ball.targetPos = null;
    state.possession.team = "NEUTRAL";

    const homeNearest = state.teams.HOME.playerIds
      .map((id) => state.players[id])
      .filter((p) => p.role !== "GK")
      .sort((a, b) => Math.hypot(a.pos.x - 480, a.pos.y - 270) - Math.hypot(b.pos.x - 480, b.pos.y - 270))[0];

    const awayNearest = state.teams.AWAY.playerIds
      .map((id) => state.players[id])
      .filter((p) => p.role !== "GK")
      .sort((a, b) => Math.hypot(a.pos.x - 480, a.pos.y - 270) - Math.hypot(b.pos.x - 480, b.pos.y - 270))[0];

    const ai = new AISystem();
    ai.step(state, new BallSystem(77), new PassSystem());

    expect(state.players[homeNearest.id].intent?.targetPos).toEqual({ x: 480, y: 270 });
    expect(state.players[awayNearest.id].intent?.targetPos).toEqual({ x: 480, y: 270 });
  });

  test("limits simultaneous attacking runs and applies run cooldown", () => {
    const state = createInitialMatchState({
      rngSeed: 88,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    state.ball.state = "CARRIED";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";
    for (const id of state.teams.HOME.playerIds) {
      state.players[id].runCooldownMs = 0;
    }

    const ai = new AISystem();
    ai.step(state, new BallSystem(88), new PassSystem());

    const runners = state.teams.HOME.playerIds
      .map((id) => state.players[id])
      .filter((p) => p.aiState === "MAKE_RUN");
    expect(runners.length).toBeLessThanOrEqual(2);
    if (runners.length > 0) {
      expect(runners[0].runCooldownMs).toBeGreaterThan(0);
    }
  });

  test("does not override high-priority manual intent", () => {
    const state = createInitialMatchState({
      rngSeed: 89,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    state.timeMs = 1000;
    state.ball.state = "LOOSE";
    state.ball.carrierId = null;
    state.possession.team = "NEUTRAL";
    state.ball.pos = { x: 470, y: 265 };

    const pinnedId = state.teams.HOME.playerIds.find((id) => state.players[id].role !== "GK")!;
    state.players[pinnedId].intent = {
      type: "PASS_TO_DIRECTION",
      expiresAtMs: 2000,
      priority: 100,
      direction: { x: 1, y: 0 },
    };

    const ai = new AISystem();
    ai.step(state, new BallSystem(89), new PassSystem());

    expect(state.players[pinnedId].intent?.type).toBe("PASS_TO_DIRECTION");
    expect(state.players[pinnedId].intent?.priority).toBe(100);
  });
});
