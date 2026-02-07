import { TUNING } from "../config/TuningConfig";
import { GOAL_LINE_LEFT_X, GOAL_LINE_RIGHT_X, PITCH_CENTER_X, PITCH_CENTER_Y } from "../config/PitchConfig";
import type { MatchState, TeamId, Vec2 } from "../state/MatchState";
import { BallSystem } from "./BallSystem";
import { PassSystem } from "./PassSystem";

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class AISystem {
  step(state: MatchState, ballSystem: BallSystem, passSystem: PassSystem) {
    this.updateTeamTacticalState(state);
    this.assignBallChaseAndPressure(state);
    this.assignMarks(state);
    this.assignAttackingSupport(state);
    this.decideBallCarrierAction(state, ballSystem, passSystem);
  }

  private updateTeamTacticalState(state: MatchState) {
    const ballX = state.ball.pos.x;
    const ballSide = (ballX - 480) / 480;

    for (const teamId of ["HOME", "AWAY"] as const) {
      const inPossession = state.possession.team === teamId;
      const sideFactor = teamId === "HOME" ? ballSide : -ballSide;
      const lineHeightBase = inPossession ? 0.56 : 0.45;
      const pressBase = inPossession ? 0.44 : 0.62;

      state.teams[teamId].tactical.lineHeight = Math.max(0.3, Math.min(0.78, lineHeightBase + sideFactor * 0.14));
      state.teams[teamId].tactical.pressIntensity = Math.max(0.25, Math.min(0.88, pressBase + sideFactor * 0.12));
      state.teams[teamId].tactical.mentality = inPossession ? "ATTACKING" : "DEFENSIVE";
    }
  }

  private assignBallChaseAndPressure(state: MatchState) {
    if (state.ball.state === "CARRIED" && state.ball.carrierId) {
      this.assignCarrierPressure(state);
      return;
    }

    const chaseTarget = state.ball.targetPos ?? state.ball.pos;
    for (const teamId of ["HOME", "AWAY"] as const) {
      const chaser = this.findNearestOutfielderToPoint(state, teamId, chaseTarget);
      if (!chaser) continue;
      this.assignIntentIfFree(chaser.id, state, {
        type: "PRESS_ZONE",
        targetPos: { x: chaseTarget.x, y: chaseTarget.y },
        expiresAtMs: state.timeMs + 320,
        priority: 88,
      });
    }
  }

  private assignCarrierPressure(state: MatchState) {
    const carrierId = state.ball.carrierId;
    if (!carrierId) return;

    const carrier = state.players[carrierId];
    const defendingTeam: TeamId = carrier.teamId === "HOME" ? "AWAY" : "HOME";
    const supportTeam: TeamId = carrier.teamId;

    const primary = this.findNearestOutfielderToPoint(state, defendingTeam, carrier.pos);
    if (primary) {
      this.assignIntentIfFree(primary.id, state, {
        type: "TACKLE_TARGET",
        targetPos: { x: carrier.pos.x, y: carrier.pos.y },
        targetPlayerId: carrier.id,
        expiresAtMs: state.timeMs + 280,
        priority: 92,
      });
    }

    const secondary = this.findSecondNearestOutfielderToPoint(state, defendingTeam, carrier.pos, primary?.id ?? null);
    if (secondary) {
      const yOffset = secondary.pos.y < carrier.pos.y ? -18 : 18;
      this.assignIntentIfFree(secondary.id, state, {
        type: "COVER_ZONE",
        targetPos: { x: carrier.pos.x + (defendingTeam === "HOME" ? -16 : 16), y: carrier.pos.y + yOffset },
        targetPlayerId: carrier.id,
        expiresAtMs: state.timeMs + 500,
        priority: 80,
      });
    }

    const support = this.findNearestOutfielderToPoint(state, supportTeam, carrier.pos, carrier.id);
    if (support) {
      const xOffset = supportTeam === "HOME" ? 42 : -42;
      const yOffset = support.pos.y <= carrier.pos.y ? -24 : 24;
      this.assignIntentIfFree(support.id, state, {
        type: "DRIBBLE_TO_DIRECTION",
        targetPos: { x: carrier.pos.x + xOffset, y: carrier.pos.y + yOffset },
        expiresAtMs: state.timeMs + 560,
        priority: 52,
      });
    }
  }

  private assignMarks(state: MatchState) {
    const attackingTeam = state.possession.team === "NEUTRAL" ? state.possession.lastTouchTeam : state.possession.team;
    const defendingTeam: TeamId = attackingTeam === "HOME" ? "AWAY" : "HOME";

    const threats = state.teams[attackingTeam].playerIds
      .map((id) => state.players[id])
      .filter((p) => p.role !== "GK")
      .sort((a, b) => {
        const aDanger = attackingTeam === "HOME" ? a.pos.x : PITCH_CENTER_X * 2 - a.pos.x;
        const bDanger = attackingTeam === "HOME" ? b.pos.x : PITCH_CENTER_X * 2 - b.pos.x;
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

  private assignAttackingSupport(state: MatchState) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;

    const carrier = state.players[state.ball.carrierId];
    const team = carrier.teamId;
    const candidateIds = state.teams[team].playerIds
      .filter((id) => id !== carrier.id && state.players[id].role !== "GK")
      .sort((a, b) => {
        const aP = state.players[a];
        const bP = state.players[b];
        const aDist = dist(aP.pos, carrier.pos);
        const bDist = dist(bP.pos, carrier.pos);
        return aDist - bDist;
      })
      .slice(0, 3);

    const xBase = team === "HOME" ? 36 : -36;
    const yOffsets = [-34, 0, 34];
    for (let i = 0; i < candidateIds.length; i++) {
      const p = state.players[candidateIds[i]];
      this.assignIntentIfFree(p.id, state, {
        type: "DRIBBLE_TO_DIRECTION",
        targetPos: { x: carrier.pos.x + xBase * (i === 1 ? 1.4 : 1), y: carrier.pos.y + yOffsets[i] },
        expiresAtMs: state.timeMs + 420,
        priority: 50,
      });
    }
  }

  private decideBallCarrierAction(state: MatchState, ballSystem: BallSystem, passSystem: PassSystem) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;
    const carrier = state.players[state.ball.carrierId];
    if (carrier.intent) return;

    const team = carrier.teamId;
    const oppTeam: TeamId = team === "HOME" ? "AWAY" : "HOME";
    const goal = team === "HOME" ? { x: GOAL_LINE_RIGHT_X, y: PITCH_CENTER_Y } : { x: GOAL_LINE_LEFT_X, y: PITCH_CENTER_Y };

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

  private assignIntentIfFree(
    playerId: string,
    state: MatchState,
    intent: NonNullable<MatchState["players"][string]["intent"]>
  ) {
    const player = state.players[playerId];
    if (!player) return;
    const current = player.intent;
    if (current && current.expiresAtMs > state.timeMs && current.priority >= intent.priority) {
      return;
    }
    player.intent = intent;
  }

  private findNearestOutfielderToPoint(state: MatchState, team: TeamId, target: Vec2, excludeId?: string | null) {
    let best: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const id of state.teams[team].playerIds) {
      if (id === excludeId) continue;
      const p = state.players[id];
      if (!p || p.role === "GK") continue;
      const d = dist(p.pos, target);
      if (d < bestDist) {
        bestDist = d;
        best = id;
      }
    }
    return best ? state.players[best] : null;
  }

  private findSecondNearestOutfielderToPoint(state: MatchState, team: TeamId, target: Vec2, firstId: string | null) {
    return this.findNearestOutfielderToPoint(state, team, target, firstId);
  }
}
