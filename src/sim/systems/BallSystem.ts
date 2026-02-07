import { TUNING } from "../config/TuningConfig";
import { RNG } from "../math/RNG";
import type { BallSimState, MatchState, TeamId, Vec2 } from "../state/MatchState";

export interface BallTransition {
  from: BallSimState;
  to: BallSimState;
  reason: string;
}

const ALLOWED: Record<BallSimState, BallSimState[]> = {
  KICKOFF: ["CARRIED"],
  CARRIED: ["IN_FLIGHT", "SHOT", "LOOSE", "CARRIED"],
  IN_FLIGHT: ["CARRIED", "LOOSE"],
  SHOT: ["GOAL", "LOOSE", "CARRIED"],
  LOOSE: ["CARRIED", "CONTROL_CONTEST"],
  CONTROL_CONTEST: ["CARRIED", "LOOSE"],
  GOAL: ["KICKOFF"],
};

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len <= 0.0001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export class BallSystem {
  private rng: RNG;

  constructor(seed: number) {
    this.rng = new RNG(seed ^ 0xa531);
  }

  step(state: MatchState, dtMs: number): BallTransition[] {
    const out: BallTransition[] = [];
    const dt = dtMs / 1000;

    switch (state.ball.state) {
      case "KICKOFF": {
        this.tryTransition(state, "CARRIED", "kickoff_start", out);
        break;
      }
      case "CARRIED": {
        const carrier = state.ball.carrierId ? state.players[state.ball.carrierId] : null;
        if (carrier) {
          state.ball.pos = { x: carrier.pos.x + 4, y: carrier.pos.y };
          state.ball.vel = { x: 0, y: 0 };
          state.ball.targetPos = null;
          state.ball.lastTouchTeam = carrier.teamId;
        } else {
          this.tryTransition(state, "LOOSE", "carrier_missing", out);
        }
        break;
      }
      case "IN_FLIGHT":
      case "SHOT": {
        state.ball.pos = add(state.ball.pos, scale(state.ball.vel, dt));
        const goal = this.goalTeamAtX(state.ball.pos.x);
        if (state.ball.state === "SHOT" && goal) {
          this.tryTransition(state, "GOAL", "shot_goal", out);
          state.score[goal] += 1;
          state.ball.vel = { x: 0, y: 0 };
          state.ball.targetPos = null;
          state.ball.carrierId = null;
        } else {
          this.tryAutoReceiveOrLoose(state, out);
        }
        break;
      }
      case "LOOSE": {
        const damp = Math.max(0, 1 - (1 - TUNING.looseBallFrictionPerSec) * dt);
        state.ball.vel = scale(state.ball.vel, damp);
        state.ball.pos = add(state.ball.pos, scale(state.ball.vel, dt));

        const nearest = this.findNearestPlayer(state, TUNING.pickupRadiusPx);
        if (nearest) {
          this.assignCarrier(state, nearest.id);
          this.tryTransition(state, "CARRIED", "pickup", out);
        } else if (this.rng.next() < TUNING.scrambleChancePerSecond * dt) {
          this.tryTransition(state, "CONTROL_CONTEST", "scramble", out);
        }
        break;
      }
      case "CONTROL_CONTEST": {
        const nearest = this.findNearestPlayer(state, TUNING.pickupRadiusPx * 1.5);
        if (nearest) {
          this.assignCarrier(state, nearest.id);
          this.tryTransition(state, "CARRIED", "contest_winner", out);
        } else {
          this.tryTransition(state, "LOOSE", "contest_fail", out);
        }
        break;
      }
      case "GOAL": {
        break;
      }
    }

    this.resolvePossession(state);
    return out;
  }

  passTo(state: MatchState, targetPos: Vec2): boolean {
    if (state.ball.state !== "CARRIED") return false;
    const carrier = state.ball.carrierId ? state.players[state.ball.carrierId] : null;
    if (!carrier) return false;

    const dir = normalize({ x: targetPos.x - state.ball.pos.x, y: targetPos.y - state.ball.pos.y });
    state.ball.vel = scale(dir, TUNING.passSpeedPxPerSec);
    state.ball.targetPos = { ...targetPos };
    state.ball.carrierId = null;
    state.ball.lastTouchTeam = carrier.teamId;
    return this.canTransition(state.ball.state, "IN_FLIGHT") ? ((state.ball.state = "IN_FLIGHT"), true) : false;
  }

  shootTo(state: MatchState, targetPos: Vec2): boolean {
    if (state.ball.state !== "CARRIED") return false;
    const carrier = state.ball.carrierId ? state.players[state.ball.carrierId] : null;
    if (!carrier) return false;

    const dir = normalize({ x: targetPos.x - state.ball.pos.x, y: targetPos.y - state.ball.pos.y });
    state.ball.vel = scale(dir, TUNING.shotSpeedPxPerSec);
    state.ball.targetPos = { ...targetPos };
    state.ball.carrierId = null;
    state.ball.lastTouchTeam = carrier.teamId;
    return this.canTransition(state.ball.state, "SHOT") ? ((state.ball.state = "SHOT"), true) : false;
  }

  forceLoose(state: MatchState): boolean {
    if (state.ball.state !== "CARRIED") return false;
    state.ball.carrierId = null;
    state.ball.targetPos = null;
    state.ball.vel = { x: 0, y: 0 };
    return this.canTransition(state.ball.state, "LOOSE") ? ((state.ball.state = "LOOSE"), true) : false;
  }

  resetForKickoff(state: MatchState, team: TeamId): boolean {
    if (state.ball.state !== "GOAL") return false;
    const kickoffId = state.teams[team].playerIds.find((id) => state.players[id].role !== "GK") ?? state.teams[team].playerIds[0];
    this.assignCarrier(state, kickoffId);
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = team;
    return this.canTransition(state.ball.state, "KICKOFF") ? ((state.ball.state = "KICKOFF"), true) : false;
  }

  private tryAutoReceiveOrLoose(state: MatchState, out: BallTransition[]) {
    const targetReached = state.ball.targetPos && distance(state.ball.pos, state.ball.targetPos) <= TUNING.arriveThresholdPx;
    const receiver = this.findNearestPlayer(state, TUNING.pickupRadiusPx);

    if (receiver && (targetReached || state.ball.state === "SHOT")) {
      this.assignCarrier(state, receiver.id);
      this.tryTransition(state, "CARRIED", "receiver_control", out);
      return;
    }

    if (targetReached) {
      state.ball.vel = { x: 0, y: 0 };
      state.ball.targetPos = null;
      this.tryTransition(state, "LOOSE", "no_control", out);
    }
  }

  private findNearestPlayer(state: MatchState, maxRadiusPx: number) {
    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const p of Object.values(state.players)) {
      const d = distance(p.pos, state.ball.pos);
      if (d <= maxRadiusPx && d < bestDist) {
        bestDist = d;
        bestId = p.id;
      }
    }

    if (!bestId) return null;
    return state.players[bestId];
  }

  private assignCarrier(state: MatchState, playerId: string) {
    const p = state.players[playerId];
    state.ball.carrierId = playerId;
    state.ball.pos = { x: p.pos.x + 4, y: p.pos.y };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = p.teamId;
  }

  private tryTransition(state: MatchState, to: BallSimState, reason: string, out: BallTransition[]) {
    const from = state.ball.state;
    if (!this.canTransition(from, to)) return false;
    state.ball.state = to;
    out.push({ from, to, reason });
    return true;
  }

  private canTransition(from: BallSimState, to: BallSimState): boolean {
    return ALLOWED[from].includes(to);
  }

  private resolvePossession(state: MatchState) {
    switch (state.ball.state) {
      case "CARRIED": {
        const carrier = state.ball.carrierId ? state.players[state.ball.carrierId] : null;
        const team = carrier ? carrier.teamId : state.ball.lastTouchTeam;
        state.possession.team = team;
        state.possession.lastTouchTeam = team;
        return;
      }
      case "IN_FLIGHT":
      case "LOOSE":
      case "GOAL":
      case "SHOT":
      case "KICKOFF": {
        state.possession.team = state.ball.lastTouchTeam;
        state.possession.lastTouchTeam = state.ball.lastTouchTeam;
        return;
      }
      case "CONTROL_CONTEST": {
        state.possession.team = "NEUTRAL";
        state.possession.lastTouchTeam = state.ball.lastTouchTeam;
      }
    }
  }

  private goalTeamAtX(x: number): TeamId | null {
    if (x <= 40 - TUNING.goalLineTolerancePx) return "AWAY";
    if (x >= 920 + TUNING.goalLineTolerancePx) return "HOME";
    return null;
  }
}
