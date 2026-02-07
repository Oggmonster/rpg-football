import type { MatchState, PlayerRole, TeamId, Vec2 } from "../state/MatchState";

import {
  PITCH_BOTTOM,
  PITCH_CENTER_X,
  PITCH_CENTER_Y,
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
} from "../config/PitchConfig";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export class MovementSystem {
  step(state: MatchState, dtMs: number) {
    const dt = dtMs / 1000;

    for (const p of Object.values(state.players)) {
      const desired = this.getDesiredPos(state, p.id, p.teamId, p.role);
      const toTarget = { x: desired.x - p.pos.x, y: desired.y - p.pos.y };
      const dir = normalize(toTarget);
      const targetDistance = Math.hypot(toTarget.x, toTarget.y);

      const baseSpeed = Math.max(35, p.stats.pac * 1.7 * (0.5 + p.stamina / 200));
      const intentType = p.intent?.type;
      const sprintBoost = intentType === "CARRY_BURST" || intentType === "TACKLE_TARGET" ? 1.18 : 1;
      const closeControl = targetDistance < 6 ? 0 : 1;
      const speed = baseSpeed * sprintBoost * closeControl;
      p.vel = scale(dir, speed);
      p.pos = add(p.pos, scale(p.vel, dt));
      p.pos.x = clamp(p.pos.x, PITCH_LEFT + 12, PITCH_RIGHT - 12);
      p.pos.y = clamp(p.pos.y, PITCH_TOP + 12, PITCH_BOTTOM - 12);

      const moving = distanceSq(p.vel, { x: 0, y: 0 }) > 1;
      p.stamina = clamp(p.stamina - (moving ? 1.8 : 0.8) * dt, 20, 100);
    }
  }

  private getDesiredPos(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const p = state.players[playerId];

    if (role === "GK") {
      return this.goalkeeperAnchor(state, team);
    }

    if (state.ball.carrierId === playerId && state.ball.state === "CARRIED") {
      return this.ballCarrierTarget(state, team, p.pos.y);
    }

    if (p.intent?.targetPos) return p.intent.targetPos;
    if (p.intent?.direction) {
      return {
        x: p.pos.x + p.intent.direction.x * 52,
        y: p.pos.y + p.intent.direction.y * 52,
      };
    }

    if (p.markTargetId && state.players[p.markTargetId] && state.possession.team !== team) {
      const t = state.players[p.markTargetId];
      const offset = team === "HOME" ? -12 : 12;
      return { x: t.pos.x + offset, y: t.pos.y };
    }

    const inPossession = state.possession.team === team;
    if (inPossession) {
      return this.offBallSupportAnchor(state, playerId, team, role);
    }

    return this.defensiveAnchor(state, playerId, team, role);
  }

  private ballCarrierTarget(state: MatchState, team: TeamId, y: number): Vec2 {
    const goalX = team === "HOME" ? PITCH_RIGHT - 20 : PITCH_LEFT + 20;
    const nearestOpp = this.nearestOpponentDistance(state, team, state.ball.pos);
    const underPressure = nearestOpp < 54;
    const x = underPressure ? (team === "HOME" ? state.ball.pos.x + 24 : state.ball.pos.x - 24) : goalX;
    const laneY = clamp(
      y + (underPressure ? (y < PITCH_CENTER_Y ? 20 : -20) : 0),
      PITCH_TOP + 32,
      PITCH_BOTTOM - 32
    );
    return { x: clamp(x, PITCH_LEFT + 20, PITCH_RIGHT - 20), y: laneY };
  }

  private offBallSupportAnchor(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const base = this.formationAnchor(state, playerId, team, role);
    const ball = state.ball.pos;
    const advanceX = team === "HOME" ? 26 : -26;
    const pullTowardBallX = (ball.x - base.x) * 0.18;
    const pullTowardBallY = (ball.y - base.y) * 0.14;
    return {
      x: clamp(base.x + advanceX + pullTowardBallX, PITCH_LEFT + 20, PITCH_RIGHT - 20),
      y: clamp(base.y + pullTowardBallY, PITCH_TOP + 20, PITCH_BOTTOM - 20),
    };
  }

  private defensiveAnchor(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const base = this.formationAnchor(state, playerId, team, role);
    const ball = state.ball.pos;
    const teamGoalX = team === "HOME" ? PITCH_LEFT + 10 : PITCH_RIGHT - 10;
    const compactX = (ball.x + teamGoalX) / 2;
    const xWeight = role === "DEF" ? 0.34 : role === "MID" ? 0.26 : 0.2;
    const yWeight = role === "DEF" ? 0.24 : role === "MID" ? 0.2 : 0.14;
    return {
      x: clamp(base.x + (compactX - base.x) * xWeight, PITCH_LEFT + 20, PITCH_RIGHT - 20),
      y: clamp(base.y + (ball.y - base.y) * yWeight, PITCH_TOP + 20, PITCH_BOTTOM - 20),
    };
  }

  private goalkeeperAnchor(state: MatchState, team: TeamId): Vec2 {
    const ball = state.ball.pos;
    const home = team === "HOME";
    const inBox = home ? ball.x < PITCH_LEFT + 210 : ball.x > PITCH_RIGHT - 210;
    const sweeper = (state.ball.state === "LOOSE" || state.ball.state === "IN_FLIGHT") && inBox;
    const xBase = home ? PITCH_LEFT + 28 : PITCH_RIGHT - 28;
    const x = sweeper ? xBase + (home ? 26 : -26) : xBase;
    return {
      x: clamp(x, PITCH_LEFT + 18, PITCH_RIGHT - 18),
      y: clamp(PITCH_CENTER_Y + (ball.y - PITCH_CENTER_Y) * 0.42, PITCH_TOP + 90, PITCH_BOTTOM - 90),
    };
  }

  private nearestOpponentDistance(state: MatchState, team: TeamId, from: Vec2): number {
    const opp: TeamId = team === "HOME" ? "AWAY" : "HOME";
    let best = Number.POSITIVE_INFINITY;
    for (const id of state.teams[opp].playerIds) {
      const p = state.players[id];
      const d = Math.hypot(p.pos.x - from.x, p.pos.y - from.y);
      if (d < best) best = d;
    }
    return best;
  }

  private formationAnchor(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const ids = state.teams[team].playerIds;
    const index = Math.max(0, ids.indexOf(playerId));
    const laneY = PITCH_TOP + 20 + ((index + 1) * (PITCH_BOTTOM - PITCH_TOP - 40)) / (ids.length + 1);

    const roleXHome: Record<PlayerRole, number> = {
      GK: PITCH_LEFT + 50,
      DEF: PITCH_LEFT + 220,
      MID: PITCH_LEFT + 430,
      FWD: PITCH_LEFT + 640,
    };

    const homeBase = roleXHome[role];
    const baseX = team === "HOME" ? homeBase : PITCH_CENTER_X + (PITCH_CENTER_X - homeBase);
    const tactical = state.teams[team].tactical;
    const attacking = state.possession.team === team;
    const pressureShift = attacking ? 18 + tactical.lineHeight * 32 : -14 + tactical.pressIntensity * 10;
    const xShift = team === "HOME" ? pressureShift : -pressureShift;

    return { x: baseX + xShift, y: laneY };
  }
}
