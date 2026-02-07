import { describe, expect, test } from "vitest";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import type { TeamId } from "../../../src/sim/state/MatchState";
import { BallSystem } from "../../../src/sim/systems/BallSystem";
import { TackleSystem } from "../../../src/sim/systems/TackleSystem";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: 15 }, (_, i) => `${prefix}_${i + 1}`);
}

describe("TackleSystem", () => {
  test("auto tackle can transfer possession to defending team", () => {
    const state = createInitialMatchState({
      rngSeed: 321,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });
    const ballSystem = new BallSystem(321);
    const tackleSystem = new TackleSystem(321);

    const carrierId = state.teams.HOME.playerIds.find((id) => state.players[id].role !== "GK")!;
    state.ball.state = "CARRIED";
    state.ball.carrierId = carrierId;
    state.ball.lastTouchTeam = "HOME";
    state.possession.team = "HOME";
    state.possession.lastTouchTeam = "HOME";
    state.ball.carrierProtectedUntilMs = 0;

    const carrier = state.players[carrierId];
    carrier.pos = { x: 480, y: 270 };
    state.ball.pos = { x: 484, y: 270 };

    const defenderId = state.teams.AWAY.playerIds.find((id) => state.players[id].role !== "GK")!;
    const defender = state.players[defenderId];
    defender.pos = { x: 482, y: 270 };
    defender.intent = {
      type: "TACKLE_TARGET",
      targetPlayerId: carrierId,
      targetPos: { x: carrier.pos.x, y: carrier.pos.y },
      expiresAtMs: 99999,
      priority: 100,
    };
    defender.stats.def = 99;
    defender.stats.phy = 99;
    carrier.stats.dri = 25;
    carrier.stats.pac = 25;

    let sawAwayControl = false;
    for (let i = 0; i < 120; i++) {
      state.timeMs += 16;
      tackleSystem.step(state, 16, ballSystem);
      ballSystem.step(state, 16);
      if (state.ball.carrierId) {
        const team = state.players[state.ball.carrierId].teamId as TeamId;
        if (team === "AWAY") {
          sawAwayControl = true;
          break;
        }
      }
    }

    expect(sawAwayControl).toBe(true);
    expect(state.possession.team).toBe("AWAY");
  });
});
