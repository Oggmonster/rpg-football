import type { SimEvent } from "../events/SimEvent";
import type { MatchState } from "../state/MatchState";

export interface SimDebugFrame {
  tick: number;
  timeMs: number;
  phase: MatchState["phase"];
  ballState: MatchState["ball"]["state"];
  possession: MatchState["possession"]["team"];
  score: { HOME: number; AWAY: number };
  events: SimEvent[];
}

export interface SimDebugLog {
  seed: number;
  frames: SimDebugFrame[];
}

export function compactStateFrame(state: MatchState, tick: number, events: SimEvent[]): SimDebugFrame {
  return {
    tick,
    timeMs: Math.round(state.timeMs),
    phase: state.phase,
    ballState: state.ball.state,
    possession: state.possession.team,
    score: { HOME: state.score.HOME, AWAY: state.score.AWAY },
    events,
  };
}
