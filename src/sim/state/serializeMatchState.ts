import type { MatchState } from "./MatchState";

function orderedObject<T>(record: Record<string, T>): Record<string, T> {
  const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

export function serializeMatchState(state: MatchState): string {
  const players = orderedObject(state.players);
  const payload: MatchState = {
    ...state,
    teams: {
      HOME: { ...state.teams.HOME, playerIds: [...state.teams.HOME.playerIds] },
      AWAY: { ...state.teams.AWAY, playerIds: [...state.teams.AWAY.playerIds] },
    },
    players,
  };

  return JSON.stringify(payload);
}
 