export type TeamId = "HOME" | "AWAY";
export type DeckKind = "ATTACK" | "DEFENSE";

export interface DeckState {
  draw: string[];
}

export interface HandState {
  cards: string[];
}

export interface TeamState {
  id: TeamId;
  deckAttack: DeckState;
  deckDefense: DeckState;
  handAttack: HandState;
  handDefense: HandState;
  cooldowns: Record<string, number>;
}

export interface MatchState {
  timeMs: number;
  possession: TeamId;
  teams: Record<TeamId, TeamState>;
  rngSeed: number;
}
