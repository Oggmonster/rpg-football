import { TUNING } from "../config/TuningConfig";
import { GOAL_LINE_LEFT_X, GOAL_LINE_RIGHT_X } from "../config/PitchConfig";
import type { MatchState, TeamId, Vec2 } from "../state/MatchState";
import { BallSystem } from "./BallSystem";

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentThreat(point: Vec2, a: Vec2, b: Vec2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: point.x - a.x, y: point.y - a.y };
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 0.0001) return distance(point, a);
  const t = Math.max(0, Math.min(1, dot(ap, ab) / abLenSq));
  const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return distance(point, proj);
}

export class PassSystem {
  tryBestPass(state: MatchState, team: TeamId, ballSystem: BallSystem, progressiveOnly: boolean): boolean {
    const carrierId = state.ball.carrierId;
    if (!carrierId) return false;
    const carrier = state.players[carrierId];
    if (carrier.teamId !== team) return false;

    const teammateIds = state.teams[team].playerIds.filter((id) => id !== carrierId);
    if (teammateIds.length === 0) return false;

    const goalX = team === "HOME" ? GOAL_LINE_RIGHT_X : GOAL_LINE_LEFT_X;
    let bestScore = -Infinity;
    let bestTarget: Vec2 | null = null;

    for (const id of teammateIds) {
      const mate = state.players[id];
      const progress = team === "HOME" ? mate.pos.x - carrier.pos.x : carrier.pos.x - mate.pos.x;
      if (progressiveOnly && progress < 8) continue;

      let minThreatDist = 9999;
      for (const oppId of state.teams[team === "HOME" ? "AWAY" : "HOME"].playerIds) {
        const opp = state.players[oppId];
        minThreatDist = Math.min(minThreatDist, segmentThreat(opp.pos, carrier.pos, mate.pos));
      }

      const goalDistGain = Math.abs(goalX - carrier.pos.x) - Math.abs(goalX - mate.pos.x);
      const score = goalDistGain * 0.55 + progress * 0.35 + minThreatDist * 0.2 * TUNING.passAssist;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { x: mate.pos.x, y: mate.pos.y };
      }
    }

    if (!bestTarget) return false;
    const momentumAdv = team === "HOME" ? state.momentum : -state.momentum;
    const commandBonus = state.teams[team].activeCommand?.modifiers.passBonus ?? 0;
    const passQuality = (carrier.stats.pas + carrier.stats.dri) / 220;
    const successChance = Math.max(0.35, Math.min(0.98, 0.7 + passQuality * 0.22 + momentumAdv * 0.08 + commandBonus));
    const deterministicRoll = Math.abs(Math.sin(state.timeMs * 0.00031 + carrier.pos.x * 0.013 + carrier.pos.y * 0.021));
    const passSuccess = deterministicRoll < successChance;
    const jitterSeed = Math.sin(state.timeMs * 0.00047 + carrier.pos.x * 0.017 + carrier.pos.y * 0.019);
    const jitterX = Math.sin(jitterSeed * 11.71) * 120;
    const jitterY = Math.cos(jitterSeed * 9.13) * 90;
    const target = passSuccess
      ? bestTarget
      : {
          x: bestTarget.x + jitterX,
          y: bestTarget.y + jitterY,
        };
    return ballSystem.passTo(state, target);
  }
}
