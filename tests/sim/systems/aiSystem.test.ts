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
});
