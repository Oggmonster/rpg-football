import { TUNING } from "../config/TuningConfig";
import type { MatchState, TeamId, Vec2 } from "../state/MatchState";
import { BallSystem } from "./BallSystem";
import { PassSystem } from "./PassSystem";

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class AISystem {
  step(state: MatchState, ballSystem: BallSystem, passSystem: PassSystem) {
    this.assignMarks(state);
    this.decideBallCarrierAction(state, ballSystem, passSystem);
  }

  private assignMarks(state: MatchState) {
    const attackingTeam = state.possession.team === "NEUTRAL" ? state.possession.lastTouchTeam : state.possession.team;
    const defendingTeam: TeamId = attackingTeam === "HOME" ? "AWAY" : "HOME";

    const threats = state.teams[attackingTeam].playerIds
      .map((id) => state.players[id])
      .filter((p) => p.role !== "GK")
      .sort((a, b) => {
        const aDanger = attackingTeam === "HOME" ? a.pos.x : 960 - a.pos.x;
        const bDanger = attackingTeam === "HOME" ? b.pos.x : 960 - b.pos.x;
        return bDanger - aDanger;
      })
      .slice(0, 2);

    const defenders = state.teams[defendingTeam].playerIds
      .map((id) => state.players[id])
      .filter((p) => p.role === "DEF" || p.role === "MID");

    for (const d of defenders) {
      d.markTargetId = null;
    }

    for (const threat of threats) {
      let bestDefId: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const d of defenders) {
        const dd = dist(d.pos, threat.pos);
        if (dd < bestDist) {
          bestDist = dd;
          bestDefId = d.id;
        }
      }
      if (bestDefId) {
        state.players[bestDefId].markTargetId = threat.id;
      }
    }
  }

  private decideBallCarrierAction(state: MatchState, ballSystem: BallSystem, passSystem: PassSystem) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;
    const carrier = state.players[state.ball.carrierId];
    if (carrier.intent) return;

    const team = carrier.teamId;
    const oppTeam: TeamId = team === "HOME" ? "AWAY" : "HOME";
    const goal = team === "HOME" ? { x: 960, y: 270 } : { x: 0, y: 270 };

    const shotDist = dist(carrier.pos, goal);
    const nearestThreat = Math.min(
      ...state.teams[oppTeam].playerIds.map((id) => dist(state.players[id].pos, carrier.pos))
    );
    const pressure = state.teams[oppTeam].playerIds.filter((id) => dist(state.players[id].pos, carrier.pos) < 70).length;
    const shotQuality = (1 - Math.min(1, shotDist / 320)) * 0.7 + (nearestThreat > 30 ? 0.3 : 0);

    if (shotQuality > 0.72 && carrier.stats.sho > 55) {
      carrier.intent = {
        type: "SHOOT_TO_DIRECTION",
        direction: team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 },
        expiresAtMs: state.timeMs + 450,
        priority: 70,
      };
      ballSystem.shootTo(state, goal);
      return;
    }

    if (pressure >= 2) {
      const passed = passSystem.tryBestPass(state, team, ballSystem, false);
      if (passed) {
        carrier.intent = {
          type: "PASS_TO_DIRECTION",
          expiresAtMs: state.timeMs + 700,
          priority: 60,
        };
      } else {
        carrier.intent = {
          type: "DRIBBLE_TO_DIRECTION",
          direction: team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 },
          expiresAtMs: state.timeMs + 550,
          priority: 55,
        };
      }
      return;
    }

    if (passSystem.tryBestPass(state, team, ballSystem, true) && TUNING.runFrequency > 0.4) {
      carrier.intent = {
        type: "THROUGH_TO_DIRECTION",
        expiresAtMs: state.timeMs + 800,
        priority: 58,
      };
      return;
    }

    carrier.intent = {
      type: "CARRY_BURST",
      direction: team === "HOME" ? { x: 1, y: 0 } : { x: -1, y: 0 },
      expiresAtMs: state.timeMs + 700,
      priority: 45,
    };
  }
}
