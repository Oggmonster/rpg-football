import type { BallSimState, DeckKind, TeamCommandType, TeamId } from "../state/MatchState";

export type SimEvent =
  | {
      type: "team_command_activated";
      atMs: number;
      team: TeamId;
      command: TeamCommandType;
      durationMs: number;
    }
  | {
      type: "team_command_expired";
      atMs: number;
      team: TeamId;
      command: TeamCommandType;
    }
  | {
      type: "momentum_changed";
      atMs: number;
      momentum: number;
      byTeam: TeamId;
      reason: string;
    }
  | {
      type: "card_result";
      atMs: number;
      team: TeamId;
      cardId: string;
      cardType?: string;
      success: boolean;
      reason: string;
    }
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
