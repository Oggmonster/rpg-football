import { describe, expect, test } from "vitest";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import { MovementSystem } from "../../../src/sim/systems/MovementSystem";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: 15 }, (_, i) => `${prefix}_${i + 1}`);
}

describe("MovementSystem", () => {
  test("moves players from initial positions", () => {
    const state = createInitialMatchState({
      rngSeed: 11,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    const system = new MovementSystem();

    const sampleId = state.teams.HOME.playerIds[3];
    const before = { ...state.players[sampleId].pos };

    system.step(state, 1000);

    const after = state.players[sampleId].pos;
    expect(after.x !== before.x || after.y !== before.y).toBe(true);
  });

  test("ball carrier advances toward opponent goal", () => {
    const state = createInitialMatchState({
      rngSeed: 12,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    const system = new MovementSystem();
    const carrierId = state.ball.carrierId!;
    const beforeX = state.players[carrierId].pos.x;

    state.ball.state = "CARRIED";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";

    system.step(state, 500);

    expect(state.players[carrierId].pos.x).toBeGreaterThan(beforeX);
  });

  test("goalkeeper shifts toward ball lane when ball enters own third", () => {
    const state = createInitialMatchState({
      rngSeed: 13,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    const system = new MovementSystem();
    const homeGkId = state.teams.HOME.playerIds.find((id) => state.players[id].role === "GK")!;
    const before = { ...state.players[homeGkId].pos };

    state.ball.state = "LOOSE";
    state.ball.carrierId = null;
    state.ball.pos = { x: 120, y: 360 };
    state.ball.vel = { x: 0, y: 0 };
    state.possession.team = "NEUTRAL";

    system.step(state, 500);

    const after = state.players[homeGkId].pos;
    const target = { x: 98, y: 307.8 };
    const beforeDist = Math.hypot(before.x - target.x, before.y - target.y);
    const afterDist = Math.hypot(after.x - target.x, after.y - target.y);
    expect(afterDist).toBeLessThan(beforeDist);
  });

  test("maintains line spacing in a 4-4-2 style shape", () => {
    const state = createInitialMatchState({
      rngSeed: 14,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    const system = new MovementSystem();
    state.ball.state = "CARRIED";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";
    state.ball.pos = { x: 920, y: 270 };

    system.step(state, 800);

    const home = state.teams.HOME.playerIds.map((id) => state.players[id]).filter((p) => p.role !== "GK");
    const defAvgX = home.filter((p) => p.role === "DEF").reduce((s, p) => s + p.pos.x, 0) / home.filter((p) => p.role === "DEF").length;
    const midAvgX = home.filter((p) => p.role === "MID").reduce((s, p) => s + p.pos.x, 0) / home.filter((p) => p.role === "MID").length;
    const fwdAvgX = home.filter((p) => p.role === "FWD").reduce((s, p) => s + p.pos.x, 0) / home.filter((p) => p.role === "FWD").length;

    expect(defAvgX).toBeLessThan(midAvgX);
    expect(midAvgX).toBeLessThan(fwdAvgX);
  });
});
