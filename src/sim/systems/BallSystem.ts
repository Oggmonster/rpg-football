import { TUNING } from "../config/TuningConfig";
import {
  GOAL_LINE_LEFT_X,
  GOAL_LINE_RIGHT_X,
  PITCH_BOTTOM,
  PITCH_CENTER_Y,
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
} from "../config/PitchConfig";
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

const PITCH_MIN_X = PITCH_LEFT;
const PITCH_MAX_X = PITCH_RIGHT;
const PITCH_MIN_Y = PITCH_TOP;
const PITCH_MAX_Y = PITCH_BOTTOM;
const GOAL_MOUTH_HALF_HEIGHT = 70;

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

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function segmentDistance(point: Vec2, a: Vec2, b: Vec2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: point.x - a.x, y: point.y - a.y };
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 0.0001) return distance(point, a);
  const t = Math.max(0, Math.min(1, dot(ap, ab) / abLenSq));
  const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return distance(point, proj);
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
        const previousPos = { ...state.ball.pos };
        state.ball.pos = add(state.ball.pos, scale(state.ball.vel, dt));
        const dampingPerSec = state.ball.state === "SHOT" ? 0.06 : 0.45;
        const damp = Math.max(0.95, 1 - dampingPerSec * dt);
        state.ball.vel = scale(state.ball.vel, damp);

        if (this.tryLaneInterception(state, previousPos, state.ball.pos, out)) {
          break;
        }

        if (state.ball.state === "SHOT") {
          if (this.tryKeeperSave(state, out)) {
            break;
          }
          if (this.tryKeeperRushPickup(state, out)) {
            break;
          }
          const goal = this.goalTeamAtX(state.ball.pos.x, state.ball.pos.y);
          if (goal) {
            this.snapBallIntoGoal(state, goal);
            this.tryTransition(state, "GOAL", "shot_goal", out);
            state.score[goal] += 1;
            state.ball.targetPos = null;
            state.ball.carrierId = null;
            state.ball.carrierProtectedUntilMs = 0;
            break;
          }
          if (this.handleOutOfPlay(state, out)) {
            break;
          }
        }

        if (state.ball.state === "IN_FLIGHT" && this.handleOutOfPlay(state, out)) {
          break;
        }

        this.tryAutoReceiveOrLoose(state, out);
        break;
      }
      case "LOOSE": {
        const damp = Math.max(0, 1 - (1 - TUNING.looseBallFrictionPerSec) * dt);
        state.ball.vel = scale(state.ball.vel, damp);
        state.ball.pos = add(state.ball.pos, scale(state.ball.vel, dt));

        if (this.handleOutOfPlay(state, out)) {
          break;
        }

        if (this.tryKeeperRushPickup(state, out)) {
          break;
        }

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
        this.applyGoalNetPhysics(state, dt);
        break;
      }
    }

    this.resolvePossession(state);
    return out;
  }

  passTo(state: MatchState, targetPos: Vec2, speedScale = 1): boolean {
    return this.startDirectedFlight(state, targetPos, "IN_FLIGHT", TUNING.passSpeedPxPerSec, speedScale, 0.55, 1.7);
  }

  shootTo(state: MatchState, targetPos: Vec2, speedScale = 1): boolean {
    return this.startDirectedFlight(state, targetPos, "SHOT", TUNING.shotSpeedPxPerSec, speedScale, 0.6, 1.85);
  }

  forceLoose(state: MatchState): boolean {
    if (state.ball.state !== "CARRIED") return false;
    state.ball.carrierId = null;
    state.ball.targetPos = null;
    state.ball.vel = { x: 0, y: 0 };
    state.ball.carrierProtectedUntilMs = 0;
    return this.canTransition(state.ball.state, "LOOSE") ? ((state.ball.state = "LOOSE"), true) : false;
  }

  resetForKickoff(state: MatchState, team: TeamId): boolean {
    if (state.ball.state !== "GOAL") return false;
    const kickoffId = state.teams[team].playerIds.find((id) => state.players[id].role !== "GK") ?? state.teams[team].playerIds[0];
    this.assignCarrier(state, kickoffId);
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = team;
    state.ball.carrierProtectedUntilMs = state.timeMs + 700;
    return this.canTransition(state.ball.state, "KICKOFF") ? ((state.ball.state = "KICKOFF"), true) : false;
  }

  restartWithCarrier(
    state: MatchState,
    team: TeamId,
    pos: Vec2,
    reason: string,
    preferKeeper = false
  ): boolean {
    const carrier = this.findNearestPlayerFromTeam(state, team, pos, preferKeeper);
    if (!carrier) return false;

    if (this.shouldSnapCarrierToRestartSpot(reason)) {
      carrier.pos = { x: pos.x, y: pos.y };
    }
    this.assignCarrier(state, carrier.id);
    state.ball.state = "CARRIED";
    state.ball.lastTouchTeam = team;
    state.possession.team = team;
    state.possession.lastTouchTeam = team;
    state.ball.targetPos = null;
    state.ball.vel = { x: 0, y: 0 };
    state.ball.carrierProtectedUntilMs = state.timeMs + 450;
    return true;
  }

  grantCarrierProtection(state: MatchState, durationMs: number) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;
    state.ball.carrierProtectedUntilMs = Math.max(state.ball.carrierProtectedUntilMs, state.timeMs + durationMs);
  }

  private tryAutoReceiveOrLoose(state: MatchState, out: BallTransition[]) {
    const targetReached = state.ball.targetPos && distance(state.ball.pos, state.ball.targetPos) <= TUNING.arriveThresholdPx;
    const receiver = this.findNearestPlayer(state, TUNING.pickupRadiusPx);
    const speed = Math.hypot(state.ball.vel.x, state.ball.vel.y);
    const shotPickupReady = state.ball.state === "SHOT" && speed < 85;

    if (receiver && (targetReached || shotPickupReady)) {
      this.assignCarrier(state, receiver.id);
      this.tryTransition(state, "CARRIED", "receiver_control", out);
      return;
    }

    if (targetReached || speed < 12) {
      state.ball.vel = this.rolloutVelocityFromFlight(state.ball.vel, state.ball.state === "SHOT");
      state.ball.targetPos = null;
      this.tryTransition(state, "LOOSE", "no_control", out);
    }
  }

  private tryLaneInterception(state: MatchState, segmentStart: Vec2, segmentEnd: Vec2, out: BallTransition[]): boolean {
    if (!state.ball.targetPos) return false;
    if (state.ball.state !== "IN_FLIGHT" && state.ball.state !== "SHOT") return false;
    const interceptTeam: TeamId = state.ball.lastTouchTeam === "HOME" ? "AWAY" : "HOME";
    const segment = { x: segmentEnd.x - segmentStart.x, y: segmentEnd.y - segmentStart.y };
    const segmentLen = Math.hypot(segment.x, segment.y);
    if (segmentLen < 0.0001) return false;
    const segmentDir = { x: segment.x / segmentLen, y: segment.y / segmentLen };

    let bestId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const id of state.teams[interceptTeam].playerIds) {
      const p = state.players[id];
      if (!p || p.role === "GK") continue;
      const dLane = segmentDistance(p.pos, segmentStart, segmentEnd);
      const toDef = { x: p.pos.x - segmentStart.x, y: p.pos.y - segmentStart.y };
      const progress = dot(toDef, segmentDir);
      if (progress < -8 || progress > segmentLen + 8) continue;
      if (dLane > TUNING.interceptRadiusPx) continue;
      const laneScore = 1 - dLane / TUNING.interceptRadiusPx;
      const reachScore = 1 - Math.min(1, Math.abs(progress - segmentLen * 0.5) / (segmentLen * 0.5 + 1));
      const score = laneScore * 0.7 + reachScore * 0.3 + (p.stats.def + p.stats.pac) / 220;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    if (!bestId) return false;
    const defender = state.players[bestId];
    const speed = Math.max(1, Math.hypot(state.ball.vel.x, state.ball.vel.y));
    const speedPenalty = Math.min(0.2, speed / 900);
    const interceptChance = Math.max(0.14, Math.min(0.87, 0.36 + (defender.stats.def + defender.stats.pac) / 240 - speedPenalty));
    if (this.rng.next() > interceptChance) return false;
    this.assignCarrier(state, bestId);
    this.tryTransition(state, "CARRIED", "lane_intercept", out);
    return true;
  }

  private startDirectedFlight(
    state: MatchState,
    targetPos: Vec2,
    nextState: "IN_FLIGHT" | "SHOT",
    baseSpeed: number,
    speedScale: number,
    minScale: number,
    maxScale: number
  ): boolean {
    if (state.ball.state !== "CARRIED") return false;
    const carrier = state.ball.carrierId ? state.players[state.ball.carrierId] : null;
    if (!carrier || !this.canTransition(state.ball.state, nextState)) return false;

    const dir = normalize({ x: targetPos.x - state.ball.pos.x, y: targetPos.y - state.ball.pos.y });
    const clampedScale = Math.max(minScale, Math.min(maxScale, Number.isFinite(speedScale) ? speedScale : 1));
    state.ball.vel = scale(dir, baseSpeed * clampedScale);
    state.ball.targetPos = { ...targetPos };
    state.ball.carrierId = null;
    state.ball.lastTouchTeam = carrier.teamId;
    state.ball.carrierProtectedUntilMs = 0;
    state.ball.state = nextState;
    return true;
  }

  private handleOutOfPlay(state: MatchState, out: BallTransition[]) {
    if (!this.isOutOfPlay(state.ball.pos)) return false;

    const restart = this.getRestart(state);
    if (!restart) return false;

    this.restartWithCarrier(state, restart.team, restart.pos, restart.kind, restart.preferKeeper);
    out.push({
      from: restart.from,
      to: "CARRIED",
      reason: restart.kind,
    });
    return true;
  }

  private tryKeeperSave(state: MatchState, out: BallTransition[]): boolean {
    const defendingTeam: TeamId = state.ball.lastTouchTeam === "HOME" ? "AWAY" : "HOME";
    const keeperId = state.teams[defendingTeam].playerIds.find((id) => state.players[id].role === "GK");
    if (!keeperId) return false;

    const gk = state.players[keeperId];
    const nearGoalX = defendingTeam === "HOME" ? state.ball.pos.x < PITCH_LEFT + 220 : state.ball.pos.x > PITCH_RIGHT - 220;
    if (!nearGoalX) return false;

    const d = distance(gk.pos, state.ball.pos);
    if (d > 44) return false;

    const shotSpeed = Math.hypot(state.ball.vel.x, state.ball.vel.y);
    const speedPenalty = Math.min(0.18, shotSpeed / 2400);
    const saveChance = Math.max(0.12, Math.min(0.78, 0.1 + gk.stats.def / 215 + gk.stats.phy / 300 - speedPenalty));
    if (this.rng.next() > saveChance) return false;

    this.assignCarrier(state, keeperId);
    if (this.rng.next() < 0.45) {
      this.tryTransition(state, "CARRIED", "keeper_save_hold", out);
    } else {
      state.ball.carrierId = null;
      const reboundDir = defendingTeam === "HOME" ? 1 : -1;
      const reboundX = Math.max(70, Math.abs(state.ball.vel.x) * 0.52) * reboundDir;
      const reboundY = state.ball.vel.y * 0.25 + (this.rng.next() - 0.5) * 26;
      state.ball.vel = { x: reboundX, y: reboundY };
      state.ball.carrierProtectedUntilMs = 0;
      this.tryTransition(state, "LOOSE", "keeper_parry", out);
    }
    return true;
  }

  private tryKeeperRushPickup(state: MatchState, out: BallTransition[]): boolean {
    if (state.ball.state !== "LOOSE" && state.ball.state !== "IN_FLIGHT" && state.ball.state !== "SHOT") return false;
    const ballSpeed = Math.hypot(state.ball.vel.x, state.ball.vel.y);
    if (ballSpeed > 360) return false;

    for (const teamId of ["HOME", "AWAY"] as const) {
      const keeperId = state.teams[teamId].playerIds.find((id) => state.players[id].role === "GK");
      if (!keeperId) continue;
      const gk = state.players[keeperId];
      const inRushZone = teamId === "HOME" ? state.ball.pos.x < PITCH_LEFT + 210 : state.ball.pos.x > PITCH_RIGHT - 210;
      if (!inRushZone) continue;
      const d = distance(gk.pos, state.ball.pos);
      if (d > 52) continue;

      const rushChance = Math.max(0.16, Math.min(0.66, 0.24 + gk.stats.def / 260 + gk.stats.pac / 360));
      if (this.rng.next() > rushChance) continue;

      this.assignCarrier(state, keeperId);
      this.tryTransition(state, "CARRIED", "keeper_rush_pickup", out);
      return true;
    }

    return false;
  }

  private isOutOfPlay(pos: Vec2): boolean {
    if (pos.y < PITCH_MIN_Y || pos.y > PITCH_MAX_Y) return true;
    if (pos.x < PITCH_MIN_X || pos.x > PITCH_MAX_X) return true;
    return false;
  }

  private getRestart(state: MatchState) {
    const { x, y } = state.ball.pos;
    const lastTouch = state.ball.lastTouchTeam;
    const from = state.ball.state;

    if (y < PITCH_MIN_Y || y > PITCH_MAX_Y) {
      const team: TeamId = lastTouch === "HOME" ? "AWAY" : "HOME";
      return {
        kind: "throw_in",
        team,
        pos: {
          x: Math.max(PITCH_MIN_X + 16, Math.min(PITCH_MAX_X - 16, x)),
          y: y < PITCH_MIN_Y ? PITCH_MIN_Y + 12 : PITCH_MAX_Y - 12,
        },
        preferKeeper: false,
        from,
      };
    }

    if (x < PITCH_MIN_X) {
      if (lastTouch === "HOME") {
        return {
          kind: "corner_kick",
          team: "AWAY" as TeamId,
          pos: { x: PITCH_MIN_X + 8, y: y < PITCH_CENTER_Y ? PITCH_MIN_Y + 8 : PITCH_MAX_Y - 8 },
          preferKeeper: false,
          from,
        };
      }
      return {
        kind: "goal_kick",
        team: "HOME" as TeamId,
        pos: { x: PITCH_MIN_X + 72, y: y < PITCH_CENTER_Y ? PITCH_CENTER_Y - 80 : PITCH_CENTER_Y + 80 },
        preferKeeper: true,
        from,
      };
    }

    if (x > PITCH_MAX_X) {
      if (lastTouch === "AWAY") {
        return {
          kind: "corner_kick",
          team: "HOME" as TeamId,
          pos: { x: PITCH_MAX_X - 8, y: y < PITCH_CENTER_Y ? PITCH_MIN_Y + 8 : PITCH_MAX_Y - 8 },
          preferKeeper: false,
          from,
        };
      }
      return {
        kind: "goal_kick",
        team: "AWAY" as TeamId,
        pos: { x: PITCH_MAX_X - 72, y: y < PITCH_CENTER_Y ? PITCH_CENTER_Y - 80 : PITCH_CENTER_Y + 80 },
        preferKeeper: true,
        from,
      };
    }

    return null;
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

  private findNearestPlayerFromTeam(state: MatchState, team: TeamId, target: Vec2, preferKeeper: boolean) {
    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const id of state.teams[team].playerIds) {
      const p = state.players[id];
      if (!p) continue;
      if (preferKeeper && p.role !== "GK") continue;
      if (!preferKeeper && p.role === "GK") continue;
      const d = distance(p.pos, target);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    if (!bestId) {
      return state.players[state.teams[team].playerIds[0]] ?? null;
    }
    return state.players[bestId];
  }

  private assignCarrier(state: MatchState, playerId: string) {
    const p = state.players[playerId];
    state.ball.carrierId = playerId;
    state.ball.pos = { x: p.pos.x + 4, y: p.pos.y };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = p.teamId;
    state.ball.carrierProtectedUntilMs = state.timeMs + 520;
  }

  private shouldSnapCarrierToRestartSpot(reason: string) {
    return reason === "throw_in" || reason === "corner_kick" || reason === "goal_kick";
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

  private goalTeamAtX(x: number, y: number): TeamId | null {
    const insideGoalMouth = y >= PITCH_CENTER_Y - GOAL_MOUTH_HALF_HEIGHT && y <= PITCH_CENTER_Y + GOAL_MOUTH_HALF_HEIGHT;
    if (!insideGoalMouth) return null;
    if (x <= GOAL_LINE_LEFT_X - TUNING.goalLineTolerancePx) return "AWAY";
    if (x >= GOAL_LINE_RIGHT_X + TUNING.goalLineTolerancePx) return "HOME";
    return null;
  }

  private snapBallIntoGoal(state: MatchState, scoringTeam: TeamId) {
    const towardRight = scoringTeam === "HOME";
    const insideX = towardRight ? GOAL_LINE_RIGHT_X + 12 : GOAL_LINE_LEFT_X - 12;
    const insideY = Math.max(
      PITCH_CENTER_Y - GOAL_MOUTH_HALF_HEIGHT + 4,
      Math.min(PITCH_CENTER_Y + GOAL_MOUTH_HALF_HEIGHT - 4, state.ball.pos.y)
    );
    state.ball.pos = { x: insideX, y: insideY };
    state.ball.vel = {
      x: towardRight ? 58 : -58,
      y: state.ball.vel.y * 0.22,
    };
  }

  private rolloutVelocityFromFlight(vel: Vec2, wasShot: boolean): Vec2 {
    const speed = Math.hypot(vel.x, vel.y);
    if (speed < 1.5) return { x: 0, y: 0 };

    const carry = wasShot ? 0.64 : 0.5;
    const dir = normalize(vel);
    const lateralMagnitude = (this.rng.next() - 0.5) * (wasShot ? 22 : 14);
    const lateral = { x: -dir.y * lateralMagnitude, y: dir.x * lateralMagnitude };
    const base = scale(vel, carry);
    return {
      x: base.x + lateral.x,
      y: base.y + lateral.y,
    };
  }

  private applyGoalNetPhysics(state: MatchState, dt: number) {
    state.ball.pos = add(state.ball.pos, scale(state.ball.vel, dt));
    const damp = Math.max(0.78, 1 - 3.2 * dt);
    state.ball.vel = scale(state.ball.vel, damp);

    const top = PITCH_CENTER_Y - GOAL_MOUTH_HALF_HEIGHT - 10;
    const bottom = PITCH_CENTER_Y + GOAL_MOUTH_HALF_HEIGHT + 10;
    if (state.ball.pos.y < top) {
      state.ball.pos.y = top;
      state.ball.vel.y = Math.abs(state.ball.vel.y) * 0.45;
    } else if (state.ball.pos.y > bottom) {
      state.ball.pos.y = bottom;
      state.ball.vel.y = -Math.abs(state.ball.vel.y) * 0.45;
    }

    if (state.ball.lastTouchTeam === "HOME") {
      const front = GOAL_LINE_RIGHT_X + 2;
      const back = GOAL_LINE_RIGHT_X + 24;
      if (state.ball.pos.x < front) {
        state.ball.pos.x = front;
        state.ball.vel.x = Math.abs(state.ball.vel.x) * 0.4;
      } else if (state.ball.pos.x > back) {
        state.ball.pos.x = back;
        state.ball.vel.x = -Math.abs(state.ball.vel.x) * 0.4;
      }
    } else {
      const front = GOAL_LINE_LEFT_X - 2;
      const back = GOAL_LINE_LEFT_X - 24;
      if (state.ball.pos.x > front) {
        state.ball.pos.x = front;
        state.ball.vel.x = -Math.abs(state.ball.vel.x) * 0.4;
      } else if (state.ball.pos.x < back) {
        state.ball.pos.x = back;
        state.ball.vel.x = Math.abs(state.ball.vel.x) * 0.4;
      }
    }

    if (Math.hypot(state.ball.vel.x, state.ball.vel.y) < 5) {
      state.ball.vel = { x: 0, y: 0 };
    }
  }
}
