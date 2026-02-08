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
  WING_OVERLOAD: {
    type: "WING_OVERLOAD",
    label: "Wing Overload",
    durationMs: 18000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.05,
      runFrequencyDelta: 0.12,
      passBonus: 0.08,
      shotBonus: 0.02,
      cooldownMultiplier: 0.96,
    },
  },
  MIDFIELD_LOCKDOWN: {
    type: "MIDFIELD_LOCKDOWN",
    label: "Midfield Lockdown",
    durationMs: 20000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: -0.04,
      pressIntensityDelta: 0.08,
      tackleBonus: 0.16,
      passBonus: 0.03,
      cooldownMultiplier: 1.01,
    },
  },
  TARGET_MAN_PLAY: {
    type: "TARGET_MAN_PLAY",
    label: "Target Man Play",
    durationMs: 25000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.03,
      runFrequencyDelta: -0.04,
      passBonus: 0.1,
      shotBonus: 0.04,
      cooldownMultiplier: 1.0,
    },
  },
  FLUID_FORMATION: {
    type: "FLUID_FORMATION",
    label: "Fluid Formation",
    durationMs: 20000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.02,
      pressIntensityDelta: 0.06,
      runFrequencyDelta: 0.08,
      passBonus: 0.08,
      shotBonus: 0.03,
      tackleBonus: 0.05,
      cooldownMultiplier: 0.98,
    },
  },
  LAST_10_MINUTES_FURY: {
    type: "LAST_10_MINUTES_FURY",
    label: "Last 10 Minutes Fury",
    durationMs: 30000,
    modifiers: {
      ...BASE_MODIFIERS,
      lineHeightDelta: 0.14,
      pressIntensityDelta: 0.14,
      runFrequencyDelta: 0.28,
      passBonus: 0.06,
      shotBonus: 0.14,
      tackleBonus: 0.07,
      cooldownMultiplier: 0.78,
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
