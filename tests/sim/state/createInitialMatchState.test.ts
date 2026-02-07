import { describe, expect, test } from "vitest";
import { DECK_SIZE } from "../../../src/sim/config/MatchConfig";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import { serializeMatchState } from "../../../src/sim/state/serializeMatchState";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => `${prefix}_${i + 1}`);
}

describe("createInitialMatchState", () => {
  test("creates expected baseline invariants", () => {
    const state = createInitialMatchState({
      rngSeed: 1337,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    expect(state.timeMs).toBe(0);
    expect(state.phase).toBe("KICKOFF");
    expect(state.score.HOME).toBe(0);
    expect(state.score.AWAY).toBe(0);
    expect(state.possession.team).toBe("HOME");
    expect(state.ball.state).toBe("KICKOFF");

    expect(state.teams.HOME.playerIds.length).toBe(state.teamSize);
    expect(state.teams.AWAY.playerIds.length).toBe(state.teamSize);
    expect(Object.keys(state.players).length).toBe(state.teamSize * 2);

    expect(state.teams.HOME.deckAttack.draw.length).toBe(DECK_SIZE);
    expect(state.teams.HOME.deckDefense.draw.length).toBe(DECK_SIZE);
    expect(state.teams.AWAY.deckAttack.draw.length).toBe(DECK_SIZE);
    expect(state.teams.AWAY.deckDefense.draw.length).toBe(DECK_SIZE);
  });

  test("is deterministic for same seed and inputs", () => {
    const args = {
      rngSeed: 2026,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    };

    const a = createInitialMatchState(args);
    const b = createInitialMatchState(args);

    expect(serializeMatchState(a)).toBe(serializeMatchState(b));
  });

  test("changes player spawn/stats when seed changes", () => {
    const a = createInitialMatchState({
      rngSeed: 1,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    const b = createInitialMatchState({
      rngSeed: 2,
      homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
      awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
    });

    expect(serializeMatchState(a)).not.toBe(serializeMatchState(b));
  });
});
