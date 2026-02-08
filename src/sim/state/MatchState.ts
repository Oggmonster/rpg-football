import type { FormationPresetId } from "../config/FormationConfig";

export type TeamId = "HOME" | "AWAY";
export type DeckKind = "ATTACK" | "DEFENSE";
export type MatchPhase = "KICKOFF" | "LIVE" | "ENDED";
export type BallSimState =
  | "KICKOFF"
  | "CARRIED"
  | "IN_FLIGHT"
  | "SHOT"
  | "LOOSE"
  | "CONTROL_CONTEST"
  | "GOAL";

export interface Vec2 {
  x: number;
  y: number;
}

export interface DeckState {
  draw: string[];
}

export interface HandState {
  cards: string[];
}

export interface PlayerStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export type PlayerRole = "GK" | "DEF" | "MID" | "FWD";

export interface IntentState {
  type:
    | "PASS_TO_DIRECTION"
    | "THROUGH_TO_DIRECTION"
    | "SHOOT_TO_DIRECTION"
    | "DRIBBLE_TO_DIRECTION"
    | "CARRY_BURST"
    | "TACKLE_TARGET"
    | "PRESS_ZONE"
    | "COVER_ZONE"
    | "INTERCEPT_LANE";
  direction?: Vec2;
  targetPlayerId?: string;
  targetPos?: Vec2;
  expiresAtMs: number;
  priority: number;
}

export interface PlayerState {
  id: string;
  teamId: TeamId;
  role: PlayerRole;
  shirtNumber: number;
  pos: Vec2;
  vel: Vec2;
  stamina: number;
  stats: PlayerStats;
  intent: IntentState | null;
  markTargetId: string | null;
}

export interface BallState {
  state: BallSimState;
  pos: Vec2;
  vel: Vec2;
  targetPos: Vec2 | null;
  carrierId: string | null;
  lastTouchTeam: TeamId;
  carrierProtectedUntilMs: number;
}

export interface PossessionState {
  team: TeamId | "NEUTRAL";
  lastTouchTeam: TeamId;
}

export interface TeamTacticalState {
  mentality: "BALANCED" | "ATTACKING" | "DEFENSIVE";
  pressIntensity: number;
  lineHeight: number;
  formation: FormationPresetId;
}

export interface TeamState {
  id: TeamId;
  deckAttack: DeckState;
  deckDefense: DeckState;
  handAttack: HandState;
  handDefense: HandState;
  cooldowns: Record<string, number>;
  lockoutMs: number;
  playerIds: string[];
  tactical: TeamTacticalState;
}

export interface MatchFlowState {
  goalResetMsRemaining: number;
  restartTeam: TeamId | null;
}

export interface MatchState {
  timeMs: number;
  durationMs: number;
  phase: MatchPhase;
  rngSeed: number;
  teamSize: number;
  score: Record<TeamId, number>;
  possession: PossessionState;
  teams: Record<TeamId, TeamState>;
  players: Record<string, PlayerState>;
  ball: BallState;
  flow: MatchFlowState;
}

