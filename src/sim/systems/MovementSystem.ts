import type { MatchState, PlayerRole, TeamId, Vec2 } from "../state/MatchState";

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

      const speed = Math.max(35, p.stats.pac * 1.7 * (0.5 + p.stamina / 200));
      p.vel = scale(dir, speed);
      p.pos = add(p.pos, scale(p.vel, dt));
      p.pos.x = clamp(p.pos.x, 36, 924);
      p.pos.y = clamp(p.pos.y, 72, 468);

      const moving = distanceSq(p.vel, { x: 0, y: 0 }) > 1;
      p.stamina = clamp(p.stamina - (moving ? 1.8 : 0.8) * dt, 20, 100);
    }
  }

  private getDesiredPos(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const p = state.players[playerId];

    if (p.intent?.targetPos) return p.intent.targetPos;
    if (p.intent?.direction) {
      return {
        x: p.pos.x + p.intent.direction.x * 52,
        y: p.pos.y + p.intent.direction.y * 52,
      };
    }

    if (p.markTargetId && state.players[p.markTargetId]) {
      const t = state.players[p.markTargetId];
      const offset = team === "HOME" ? -12 : 12;
      return { x: t.pos.x + offset, y: t.pos.y };
    }

    return this.formationAnchor(state, playerId, team, role);
  }

  private formationAnchor(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const ids = state.teams[team].playerIds;
    const index = Math.max(0, ids.indexOf(playerId));
    const laneY = 110 + ((index + 1) * 300) / (ids.length + 1);

    const roleXHome: Record<PlayerRole, number> = {
      GK: 90,
      DEF: 240,
      MID: 400,
      FWD: 580,
    };

    const homeBase = roleXHome[role];
    const baseX = team === "HOME" ? homeBase : 960 - homeBase;
    const attacking = state.possession.team === team;
    const pressureShift = attacking ? 28 : -18;
    const xShift = team === "HOME" ? pressureShift : -pressureShift;

    return { x: baseX + xShift, y: laneY };
  }
}
