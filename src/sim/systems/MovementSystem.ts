import type { MatchState, PlayerRole, TeamId, Vec2 } from "../state/MatchState";

import {
  PITCH_BOTTOM,
  PITCH_CENTER_X,
  PITCH_CENTER_Y,
  PITCH_LEFT,
  PITCH_RIGHT,
  PITCH_TOP,
} from "../config/PitchConfig";
import { DEFAULT_FORMATION, FORMATION_PRESETS, type FormationPreset, type FormationPresetId } from "../config/FormationConfig";

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

type FormationLine = "DEF" | "MID" | "FWD";

interface FormationSlot {
  line: FormationLine;
  lane: number;
  laneCount: number;
}

export class MovementSystem {
  private formationAssignments: Record<TeamId, Record<string, FormationSlot>> = {
    HOME: {},
    AWAY: {},
  };

  step(state: MatchState, dtMs: number) {
    const dt = dtMs / 1000;
    this.formationAssignments.HOME = this.buildTeamFormationAssignments(state, "HOME");
    this.formationAssignments.AWAY = this.buildTeamFormationAssignments(state, "AWAY");

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

    if (p.intent?.targetPos) return p.intent.targetPos;
    if (p.intent?.direction) {
      return {
        x: p.pos.x + p.intent.direction.x * 52,
        y: p.pos.y + p.intent.direction.y * 52,
      };
    }

    if (state.ball.carrierId === playerId && state.ball.state === "CARRIED") {
      return this.ballCarrierTarget(state, team, p.pos.y);
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
    const line = this.getFormationLine(team, playerId, role);
    const ball = state.ball.pos;
    const advanceX = team === "HOME" ? 26 : -26;
    const pullTowardBallX = (ball.x - base.x) * 0.18;
    const pullTowardBallY = (ball.y - base.y) * 0.14;
    const desired = {
      x: clamp(base.x + advanceX + pullTowardBallX, PITCH_LEFT + 20, PITCH_RIGHT - 20),
      y: clamp(base.y + pullTowardBallY, PITCH_TOP + 20, PITCH_BOTTOM - 20),
    };
    return this.clampToZone(base, desired, line);
  }

  private defensiveAnchor(state: MatchState, playerId: string, team: TeamId, role: PlayerRole): Vec2 {
    const base = this.formationAnchor(state, playerId, team, role);
    const line = this.getFormationLine(team, playerId, role);
    const ball = state.ball.pos;
    const teamGoalX = team === "HOME" ? PITCH_LEFT + 10 : PITCH_RIGHT - 10;
    const compactX = (ball.x + teamGoalX) / 2;
    const xWeight = role === "DEF" ? 0.34 : role === "MID" ? 0.26 : 0.2;
    const yWeight = role === "DEF" ? 0.24 : role === "MID" ? 0.2 : 0.14;
    const desired = {
      x: clamp(base.x + (compactX - base.x) * xWeight, PITCH_LEFT + 20, PITCH_RIGHT - 20),
      y: clamp(base.y + (ball.y - base.y) * yWeight, PITCH_TOP + 20, PITCH_BOTTOM - 20),
    };
    return this.clampToZone(base, desired, line);
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
    const preset = this.getTeamFormationPreset(state, team);
    const slot = this.formationAssignments[team][playerId];
    const fallbackIndex = Math.max(0, ids.indexOf(playerId));
    const laneCount = slot?.laneCount ?? ids.length;
    const lane = slot?.lane ?? fallbackIndex;
    const laneY = PITCH_TOP + 20 + ((lane + 1) * (PITCH_BOTTOM - PITCH_TOP - 40)) / (laneCount + 1);

    const line: FormationLine = slot?.line ?? (role === "DEF" ? "DEF" : role === "MID" ? "MID" : "FWD");
    const homeBase = role === "GK" ? PITCH_LEFT + 50 : PITCH_LEFT + preset.lineXHome[line];
    const baseX = team === "HOME" ? homeBase : PITCH_CENTER_X + (PITCH_CENTER_X - homeBase);
    const tactical = state.teams[team].tactical;
    const attacking = state.possession.team === team;
    const pressureShift = attacking ? 18 + tactical.lineHeight * 32 : -14 + tactical.pressIntensity * 10;
    const xShift = team === "HOME" ? pressureShift : -pressureShift;

    return { x: baseX + xShift, y: laneY };
  }

  private getFormationLine(team: TeamId, playerId: string, role: PlayerRole): FormationLine {
    const slot = this.formationAssignments[team][playerId];
    if (slot) return slot.line;
    return role === "DEF" ? "DEF" : role === "MID" ? "MID" : "FWD";
  }

  private clampToZone(anchor: Vec2, desired: Vec2, line: FormationLine): Vec2 {
    const zone = this.zoneRadiusForLine(line);
    return {
      x: clamp(desired.x, anchor.x - zone.x, anchor.x + zone.x),
      y: clamp(desired.y, anchor.y - zone.y, anchor.y + zone.y),
    };
  }

  private zoneRadiusForLine(line: FormationLine): Vec2 {
    if (line === "DEF") return { x: 80, y: 105 };
    if (line === "MID") return { x: 110, y: 120 };
    return { x: 130, y: 130 };
  }

  private buildTeamFormationAssignments(state: MatchState, team: TeamId): Record<string, FormationSlot> {
    const out: Record<string, FormationSlot> = {};
    const preset = this.getTeamFormationPreset(state, team);
    const outfieldIds = state.teams[team].playerIds.filter((id) => state.players[id].role !== "GK");
    const available = [...outfieldIds];
    const lineCounts = this.normalizeLineCounts(preset, outfieldIds.length);

    const takeByPriority = (count: number, priorities: PlayerRole[]) => {
      const picked: string[] = [];
      for (const role of priorities) {
        for (let i = 0; i < available.length && picked.length < count; i++) {
          const id = available[i];
          if (state.players[id].role !== role) continue;
          picked.push(id);
        }
      }
      for (const id of picked) {
        const idx = available.indexOf(id);
        if (idx >= 0) available.splice(idx, 1);
      }
      return picked.slice(0, count);
    };

    const defenders = takeByPriority(lineCounts.DEF, ["DEF", "MID", "FWD", "GK"]);
    const midfielders = takeByPriority(lineCounts.MID, ["MID", "DEF", "FWD", "GK"]);
    const forwards = takeByPriority(lineCounts.FWD, ["FWD", "MID", "DEF", "GK"]);
    if (available.length > 0) {
      midfielders.push(...available.splice(0, available.length));
    }

    this.assignLine(out, defenders, "DEF");
    this.assignLine(out, midfielders, "MID");
    this.assignLine(out, forwards, "FWD");
    return out;
  }

  private assignLine(target: Record<string, FormationSlot>, ids: string[], line: FormationLine) {
    for (let i = 0; i < ids.length; i++) {
      target[ids[i]] = { line, lane: i, laneCount: ids.length };
    }
  }

  private getTeamFormationPreset(state: MatchState, team: TeamId): FormationPreset {
    const presetId = state.teams[team].tactical.formation as FormationPresetId | undefined;
    return FORMATION_PRESETS[presetId ?? DEFAULT_FORMATION] ?? FORMATION_PRESETS[DEFAULT_FORMATION];
  }

  private normalizeLineCounts(preset: FormationPreset, outfieldCount: number): Record<FormationLine, number> {
    const counts: Record<FormationLine, number> = {
      DEF: preset.lines.DEF,
      MID: preset.lines.MID,
      FWD: preset.lines.FWD,
    };
    let total = counts.DEF + counts.MID + counts.FWD;

    while (total > outfieldCount) {
      if (counts.MID > 1) {
        counts.MID -= 1;
      } else if (counts.FWD > 1) {
        counts.FWD -= 1;
      } else if (counts.DEF > 1) {
        counts.DEF -= 1;
      } else {
        break;
      }
      total -= 1;
    }

    while (total < outfieldCount) {
      counts.MID += 1;
      total += 1;
    }

    return counts;
  }
}
