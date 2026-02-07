import type { DeckKind } from "../state/MatchState";

export type CardType =
  | "PASS"
  | "THROUGH_PASS"
  | "SHOOT"
  | "DRIBBLE"
  | "RUSH"
  | "CROSS"
  | "LONG_BALL"
  | "TACKLE"
  | "PRESS"
  | "COVER"
  | "INTERCEPT"
  | "MARK"
  | "BLOCK"
  | "DOUBLE_TEAM"
  | "RUSH_KEEPER";

export interface CardDef {
  id: string;
  name: string;
  deck: DeckKind;
  type: CardType;
  cooldownMs: number;
}
