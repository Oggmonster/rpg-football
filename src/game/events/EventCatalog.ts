export type EventModifierId = "BALANCED" | "COUNTER_SURGE" | "PRESS_FEVER" | "CONTROL_CLINIC";

export interface EventGameplayModifiers {
  cooldownMultiplier: number;
  momentumMultiplier: number;
  passBonus: number;
  shotBonus: number;
  dribbleBonus: number;
  tackleBonus: number;
}

export interface EventRewardModifiers {
  coinMultiplier: number;
  playerXpMultiplier: number;
  managerXpMultiplier: number;
}

export interface EventDefinition {
  id: EventModifierId;
  label: string;
  description: string;
  gameplay: EventGameplayModifiers;
  rewards: EventRewardModifiers;
}

const BASE_GAMEPLAY: EventGameplayModifiers = {
  cooldownMultiplier: 1,
  momentumMultiplier: 1,
  passBonus: 0,
  shotBonus: 0,
  dribbleBonus: 0,
  tackleBonus: 0,
};

const BASE_REWARDS: EventRewardModifiers = {
  coinMultiplier: 1,
  playerXpMultiplier: 1,
  managerXpMultiplier: 1,
};

export const EVENT_CATALOG: Record<EventModifierId, EventDefinition> = {
  BALANCED: {
    id: "BALANCED",
    label: "Balanced Week",
    description: "Standard ruleset for stable tactics and economy.",
    gameplay: { ...BASE_GAMEPLAY },
    rewards: { ...BASE_REWARDS },
  },
  COUNTER_SURGE: {
    id: "COUNTER_SURGE",
    label: "Counter Surge",
    description: "Faster cooldown pace and stronger finishing transitions.",
    gameplay: {
      ...BASE_GAMEPLAY,
      cooldownMultiplier: 0.93,
      shotBonus: 0.05,
      passBonus: 0.03,
    },
    rewards: {
      ...BASE_REWARDS,
      coinMultiplier: 1.08,
      managerXpMultiplier: 1.06,
    },
  },
  PRESS_FEVER: {
    id: "PRESS_FEVER",
    label: "Press Fever",
    description: "Defensive actions gain more bite and momentum swings.",
    gameplay: {
      ...BASE_GAMEPLAY,
      momentumMultiplier: 1.12,
      tackleBonus: 0.06,
      dribbleBonus: -0.02,
    },
    rewards: {
      ...BASE_REWARDS,
      playerXpMultiplier: 1.06,
    },
  },
  CONTROL_CLINIC: {
    id: "CONTROL_CLINIC",
    label: "Control Clinic",
    description: "Passing and dribbling precision week with calmer flow.",
    gameplay: {
      ...BASE_GAMEPLAY,
      passBonus: 0.07,
      dribbleBonus: 0.05,
      momentumMultiplier: 0.96,
    },
    rewards: {
      ...BASE_REWARDS,
      playerXpMultiplier: 1.05,
      managerXpMultiplier: 1.04,
    },
  },
};

const WEEKLY_ROTATION: EventModifierId[] = ["BALANCED", "COUNTER_SURGE", "PRESS_FEVER", "CONTROL_CLINIC"];

export function eventForWeek(weekIndex: number): EventDefinition {
  const id = WEEKLY_ROTATION[Math.abs(weekIndex) % WEEKLY_ROTATION.length];
  return EVENT_CATALOG[id];
}

export function eventById(id: EventModifierId): EventDefinition {
  return EVENT_CATALOG[id];
}
