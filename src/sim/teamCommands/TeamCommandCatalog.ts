import type { TeamCommandModifiers, TeamCommandType } from "../state/MatchState";

export interface TeamCommandDef {
  type: TeamCommandType;
  label: string;
  durationMs: number;
  modifiers: TeamCommandModifiers;
}

const BASE_MODIFIERS: TeamCommandModifiers = {
  lineHeightDelta: 0,
  pressIntensityDelta: 0,
  runFrequencyDelta: 0,
  passBonus: 0,
  shotBonus: 0,
  tackleBonus: 0,
  cooldownMultiplier: 1,
};

export const TEAM_COMMAND_DEFS: Record<TeamCommandType, TeamCommandDef> = {
  ALL_OUT_ATTACK: {
    type: "ALL_OUT_ATTACK",
    label: "All Out Attack",
    durationMs: 20000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.16,
      runFrequencyDelta: 0.18,
      shotBonus: 0.08,
      passBonus: 0.04,
      cooldownMultiplier: 0.9,
    },
  },
  PARK_THE_BUS: {
    type: "PARK_THE_BUS",
    label: "Park the Bus",
    durationMs: 25000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: -0.2,
      pressIntensityDelta: -0.08,
      tackleBonus: 0.12,
      passBonus: -0.05,
      shotBonus: -0.04,
      cooldownMultiplier: 1.06,
    },
  },
  FAST_COUNTER: {
    type: "FAST_COUNTER",
    label: "Fast Counter",
    durationMs: 15000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.08,
      runFrequencyDelta: 0.22,
      passBonus: 0.1,
      cooldownMultiplier: 0.93,
    },
  },
  HIGH_PRESS: {
    type: "HIGH_PRESS",
    label: "High Press",
    durationMs: 20000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.1,
      pressIntensityDelta: 0.18,
      tackleBonus: 0.14,
      cooldownMultiplier: 0.95,
    },
  },
  SLOW_BUILD_UP: {
    type: "SLOW_BUILD_UP",
    label: "Slow Build-Up",
    durationMs: 22000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: -0.06,
      runFrequencyDelta: -0.2,
      passBonus: 0.15,
      shotBonus: -0.03,
      cooldownMultiplier: 1.04,
    },
  },
};

export const DEFAULT_TEAM_COMMAND_LOADOUT: TeamCommandType[] = [
  "ALL_OUT_ATTACK",
  "PARK_THE_BUS",
  "FAST_COUNTER",
  "HIGH_PRESS",
  "SLOW_BUILD_UP",
];

export function getTeamCommandDef(type: TeamCommandType): TeamCommandDef {
  return TEAM_COMMAND_DEFS[type];
}
