import { TUNING } from "../config/TuningConfig";
import { RNG } from "../math/RNG";
import type { MatchState, TeamId } from "../state/MatchState";
import { BallSystem } from "./BallSystem";

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inTackleArc(
  defender: { teamId: TeamId; pos: { x: number; y: number } },
  target: { pos: { x: number; y: number } },
  halfAngleDeg: number
) {
  const facing = defender.teamId === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const to = { x: target.pos.x - defender.pos.x, y: target.pos.y - defender.pos.y };
  const mag = Math.hypot(to.x, to.y);
  if (mag < 0.0001) return true;
  const n = { x: to.x / mag, y: to.y / mag };
  const dot = facing.x * n.x + facing.y * n.y;
  return dot >= Math.cos((halfAngleDeg * Math.PI) / 180);
}

export class TackleSystem {
  private rng: RNG;

  constructor(seed: number) {
    this.rng = new RNG(seed ^ 0x19f3);
  }

  step(state: MatchState, dtMs: number, ballSystem: BallSystem) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;

    const carrier = state.players[state.ball.carrierId];
    const defendingTeam = carrier.teamId === "HOME" ? "AWAY" : "HOME";
    const dt = dtMs / 1000;
    const protectedBall = state.timeMs < state.ball.carrierProtectedUntilMs;

    for (const id of state.teams[defendingTeam].playerIds) {
      const defender = state.players[id];
      const intentType = defender.intent?.type;
      if (intentType !== "TACKLE_TARGET" && intentType !== "PRESS_ZONE") continue;
      const distanceToCarrier = dist(defender.pos, carrier.pos);
      const engageRange = intentType === "TACKLE_TARGET" ? 36 : 28;
      if (distanceToCarrier > engageRange) continue;
      if (!inTackleArc(defender, carrier, intentType === "TACKLE_TARGET" ? 92 : 110)) continue;

      const atk = carrier.stats.dri * 0.65 + carrier.stats.pac * 0.35;
      const def = defender.stats.def * 0.6 + defender.stats.phy * 0.4;
      const base = 0.38 + (def - atk) / 200;
      const intentScale = intentType === "TACKLE_TARGET" ? 1 : 0.72;
      const protectionScale = protectedBall ? 0.72 : 1;
      const spacingScale = Math.max(0.58, 1 - distanceToCarrier / 34);
      const momentumAdv = defendingTeam === "HOME" ? state.momentum : -state.momentum;
      const commandBonus = state.teams[defendingTeam].activeCommand?.modifiers.tackleBonus ?? 0;
      const chance = Math.max(
        0.02,
        Math.min(
          0.82,
          base *
            (0.72 + TUNING.tackleAggression) *
            (1 + commandBonus + momentumAdv * 0.18) *
            dt *
            6.2 *
            intentScale *
            protectionScale *
            spacingScale
        )
      );

      if (this.rng.next() < chance) {
        const won = ballSystem.restartWithCarrier(state, defendingTeam, carrier.pos, "tackle_win", false);
        if (won) {
          defender.intent = null;
          return;
        }
      }
    }
  }

  tryCardTackle(
    state: MatchState,
    defendingTeam: TeamId,
    ballSystem: BallSystem,
    mode: "STANDING" | "SLIDING",
    preferredTargetId?: string
  ): "FOUL" | "WIN" | "LOOSE" | "MISS" {
    const resolvePreferredTarget = () => {
      if (!preferredTargetId) return null;
      const target = state.players[preferredTargetId];
      if (!target || target.teamId === defendingTeam) return null;
      return target;
    };

    let carrier = resolvePreferredTarget();
    if (!carrier) {
      if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return "MISS";
      carrier = state.players[state.ball.carrierId];
      if (carrier.teamId === defendingTeam) return "MISS";
    }

    let defenderId: string | null = null;
    let defenderDist = Number.POSITIVE_INFINITY;
    for (const id of state.teams[defendingTeam].playerIds) {
      const p = state.players[id];
      if (p.role === "GK") continue;
      const d = dist(p.pos, carrier.pos);
      if (d < defenderDist) {
        defenderDist = d;
        defenderId = id;
      }
    }
    if (!defenderId) return "MISS";

    const defender = state.players[defenderId];
    const reach = mode === "SLIDING" ? 30 : 18;
    if (defenderDist > reach) return "MISS";
    if (!inTackleArc(defender, carrier, mode === "SLIDING" ? 92 : 72)) return "MISS";

    const atk = carrier.stats.dri * 0.6 + carrier.stats.pac * 0.4;
    const def = defender.stats.def * 0.62 + defender.stats.phy * 0.38;
    const diff = (def - atk) / 200;
    const momentumAdv = defendingTeam === "HOME" ? state.momentum : -state.momentum;
    const commandBonus = state.teams[defendingTeam].activeCommand?.modifiers.tackleBonus ?? 0;

    const foulChance = Math.max(0.04, Math.min(0.35, (mode === "SLIDING" ? 0.17 : 0.08) - diff * 0.05));
    const winChance = Math.max(
      0.12,
      Math.min(0.82, (mode === "SLIDING" ? 0.33 : 0.42) + diff + commandBonus * 0.3 + momentumAdv * 0.12)
    );
    const looseChance = Math.max(0.08, Math.min(0.5, mode === "SLIDING" ? 0.28 : 0.2));

    const roll = this.rng.next();
    if (roll < foulChance) {
      ballSystem.restartWithCarrier(state, carrier.teamId, carrier.pos, "free_kick", false);
      state.teams[defendingTeam].lockoutMs = 550;
      return "FOUL";
    }
    if (roll < foulChance + winChance) {
      ballSystem.restartWithCarrier(state, defendingTeam, carrier.pos, "tackle_win", false);
      return "WIN";
    }
    if (roll < foulChance + winChance + looseChance) {
      ballSystem.forceLoose(state);
      return "LOOSE";
    }
    return "MISS";
  }
}
