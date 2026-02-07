import { TUNING } from "../config/TuningConfig";
import type { MatchState, Vec2 } from "../state/MatchState";

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function nearestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 0.0001) return { ...a };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const t = Math.max(0, Math.min(1, dot(ap, ab) / abLenSq));
  return { x: a.x + ab.x * t, y: a.y + ab.y * t };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class InterceptSystem {
  step(state: MatchState) {
    if (state.ball.state !== "IN_FLIGHT" || !state.ball.targetPos) return;

    for (const p of Object.values(state.players)) {
      if (p.intent?.type !== "INTERCEPT_LANE") continue;
      const intercept = nearestPointOnSegment(p.pos, state.ball.pos, state.ball.targetPos);
      if (distance(intercept, p.pos) <= TUNING.interceptRadiusPx * 3) {
        p.intent.targetPos = intercept;
      }
    }
  }
}
