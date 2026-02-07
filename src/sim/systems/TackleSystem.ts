import { TUNING } from "../config/TuningConfig";
import { RNG } from "../math/RNG";
import type { MatchState } from "../state/MatchState";
import { BallSystem } from "./BallSystem";

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

    for (const id of state.teams[defendingTeam].playerIds) {
      const defender = state.players[id];
      if (defender.intent?.type !== "TACKLE_TARGET") continue;
      if (dist(defender.pos, carrier.pos) > 26) continue;

      const atk = carrier.stats.dri * 0.65 + carrier.stats.pac * 0.35;
      const def = defender.stats.def * 0.6 + defender.stats.phy * 0.4;
      const base = 0.35 + (def - atk) / 220;
      const chance = Math.max(0.08, Math.min(0.88, base * (0.55 + TUNING.tackleAggression) * dt * 6));

      if (this.rng.next() < chance) {
        const loose = ballSystem.forceLoose(state);
        if (loose) {
          defender.intent = null;
          return;
        }
      }
    }
  }
}
