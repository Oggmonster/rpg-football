import type { BallSimState, DeckKind, TeamId } from "../state/MatchState";

export type SimEvent =
  | {
      type: "possession_changed";
      atMs: number;
      team: TeamId;
      deck: DeckKind;
    }
  | {
      type: "card_played";
      atMs: number;
      team: TeamId;
      cardId: string;
      deck: DeckKind;
    }
  | {
      type: "ball_transition";
      atMs: number;
      from: BallSimState;
      to: BallSimState;
      reason: string;
    }
  | {
      type: "goal_scored";
      atMs: number;
      team: TeamId;
      home: number;
      away: number;
    };
