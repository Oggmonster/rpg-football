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
});
