import type { DeckConstraints } from "./validators/DeckValidator";

export const ATTACK_DECK_CONSTRAINTS: DeckConstraints = {
  total: 15,
  byType: {
    SHOOT: { min: 2, max: 5 },
    PASS: { min: 2, max: 5 },
    DRIBBLE: { min: 1, max: 4 },
    THROUGH_PASS: { min: 1, max: 4 },
    CROSS: { min: 0, max: 3 },
    LONG_BALL: { min: 0, max: 3 },
    RUSH: { min: 1, max: 4 },
  },
};

export const DEFENSE_DECK_CONSTRAINTS: DeckConstraints = {
  total: 15,
  byType: {
    TACKLE: { min: 2, max: 5 },
    PRESS: { min: 1, max: 4 },
    COVER: { min: 1, max: 4 },
    INTERCEPT: { min: 1, max: 4 },
    MARK: { min: 0, max: 3 },
    BLOCK: { min: 0, max: 3 },
    DOUBLE_TEAM: { min: 0, max: 2 },
    RUSH_KEEPER: { min: 0, max: 1 },
  },
};
