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

const PITCH_MIN_X = 24;
const PITCH_MAX_X = 936;
const PITCH_MIN_Y = 60;
const PITCH_MAX_Y = 480;

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

        if (state.ball.state === "SHOT") {
          if (this.tryKeeperSave(state, out)) {
            break;
          }
          const goal = this.goalTeamAtX(state.ball.pos.x);
          if (goal) {
            this.tryTransition(state, "GOAL", "shot_goal", out);
            state.score[goal] += 1;
            state.ball.vel = { x: 0, y: 0 };
            state.ball.targetPos = null;
            state.ball.carrierId = null;
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

  restartWithCarrier(
    state: MatchState,
    team: TeamId,
    pos: Vec2,
    _reason: string,
    preferKeeper = false
  ): boolean {
    const carrier = this.findNearestPlayerFromTeam(state, team, pos, preferKeeper);
    if (!carrier) return false;

    carrier.pos = { x: pos.x, y: pos.y };
    this.assignCarrier(state, carrier.id);
    state.ball.state = "CARRIED";
    state.ball.lastTouchTeam = team;
    state.possession.team = team;
    state.possession.lastTouchTeam = team;
    state.ball.targetPos = null;
    state.ball.vel = { x: 0, y: 0 };
    return true;
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
    const nearGoalX = defendingTeam === "HOME" ? state.ball.pos.x < 180 : state.ball.pos.x > 780;
    if (!nearGoalX) return false;

    const d = distance(gk.pos, state.ball.pos);
    if (d > 42) return false;

    const saveChance = Math.max(0.12, Math.min(0.9, 0.2 + gk.stats.def / 120 + gk.stats.phy / 200));
    if (this.rng.next() > saveChance) return false;

    this.assignCarrier(state, keeperId);
    if (this.rng.next() < 0.7) {
      this.tryTransition(state, "CARRIED", "keeper_save_hold", out);
    } else {
      state.ball.carrierId = null;
      state.ball.vel = { x: 0, y: 0 };
      this.tryTransition(state, "LOOSE", "keeper_parry", out);
    }
    return true;
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
          pos: { x: PITCH_MIN_X + 8, y: y < 270 ? PITCH_MIN_Y + 8 : PITCH_MAX_Y - 8 },
          preferKeeper: false,
          from,
        };
      }
      return {
        kind: "goal_kick",
        team: "HOME" as TeamId,
        pos: { x: PITCH_MIN_X + 54, y: y < 270 ? 220 : 320 },
        preferKeeper: true,
        from,
      };
    }

    if (x > PITCH_MAX_X) {
      if (lastTouch === "AWAY") {
        return {
          kind: "corner_kick",
          team: "HOME" as TeamId,
          pos: { x: PITCH_MAX_X - 8, y: y < 270 ? PITCH_MIN_Y + 8 : PITCH_MAX_Y - 8 },
          preferKeeper: false,
          from,
        };
      }
      return {
        kind: "goal_kick",
        team: "AWAY" as TeamId,
        pos: { x: PITCH_MAX_X - 54, y: y < 270 ? 220 : 320 },
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
