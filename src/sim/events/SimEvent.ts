import type { DeckKind, TeamId } from "../state/MatchState";

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
    };
