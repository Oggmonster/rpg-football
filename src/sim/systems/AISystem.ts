import { TUNING } from "../config/TuningConfig";
import { GOAL_LINE_LEFT_X, GOAL_LINE_RIGHT_X, PITCH_CENTER_X, PITCH_CENTER_Y } from "../config/PitchConfig";
import type { MatchState, TeamId, Vec2 } from "../state/MatchState";
import { BallSystem } from "./BallSystem";
import { PassSystem } from "./PassSystem";

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class AISystem {
  step(state: MatchState, ballSystem: BallSystem, passSystem: PassSystem, humanControlledTeam?: TeamId) {
    this.resetAiStateLabels(state);
    this.updateTeamTacticalState(state);
    this.assignBallChaseAndPressure(state);
    this.assignMarks(state);
    this.assignAttackingSupport(state);
    this.decideBallCarrierAction(state, ballSystem, passSystem, humanControlledTeam);
    this.resolveFallbackAiStates(state);
  }

  private updateTeamTacticalState(state: MatchState) {
    const ballX = state.ball.pos.x;
    const ballSide = (ballX - 480) / 480;

    for (const teamId of ["HOME", "AWAY"] as const) {
      const inPossession = state.possession.team === teamId;
      const sideFactor = teamId === "HOME" ? ballSide : -ballSide;
      const lineHeightBase = inPossession ? 0.56 : 0.45;
      const pressBase = inPossession ? 0.44 : 0.62;
      const commandMods = state.teams[teamId].activeCommand?.modifiers;
      const lineHeightDelta = commandMods?.lineHeightDelta ?? 0;
      const pressDelta = commandMods?.pressIntensityDelta ?? 0;

      state.teams[teamId].tactical.lineHeight = Math.max(
        0.25,
        Math.min(0.85, lineHeightBase + sideFactor * 0.14 + lineHeightDelta)
      );
      state.teams[teamId].tactical.pressIntensity = Math.max(
        0.2,
        Math.min(0.94, pressBase + sideFactor * 0.12 + pressDelta)
      );
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
      this.setAiState(state, chaser.id, "PRESS");
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
      const distToCarrier = dist(primary.pos, carrier.pos);
      this.assignIntentIfFree(primary.id, state, {
        type: distToCarrier < 56 ? "TACKLE_TARGET" : "PRESS_ZONE",
        targetPos: { x: carrier.pos.x, y: carrier.pos.y },
        targetPlayerId: carrier.id,
        expiresAtMs: state.timeMs + 480,
        priority: distToCarrier < 56 ? 96 : 86,
      });
      this.setAiState(state, primary.id, distToCarrier < 56 ? "TACKLE_ATTEMPT" : "PRESS");
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
      this.setAiState(state, secondary.id, "MARK");
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
      this.setAiState(state, support.id, "SUPPORT");
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
        this.setAiState(state, bestDefId, "MARK");
      }
    }
  }

  private assignAttackingSupport(state: MatchState) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;

    const carrier = state.players[state.ball.carrierId];
    const team = carrier.teamId;
    const opp: TeamId = team === "HOME" ? "AWAY" : "HOME";
    const outfieldIds = state.teams[team].playerIds.filter((id) => id !== carrier.id && state.players[id].role !== "GK");
    const runBonus = state.teams[team].activeCommand?.modifiers.runFrequencyDelta ?? 0;
    const maxRuns = runBonus > 0.15 ? 3 : 2;

    const runCandidates = outfieldIds
      .map((id) => state.players[id])
      .filter((p) => p.runCooldownMs <= 0)
      .map((p) => {
        const forward = team === "HOME" ? p.pos.x - carrier.pos.x : carrier.pos.x - p.pos.x;
        const spacing = state.teams[opp].playerIds.reduce((best, oppId) => {
          const d = dist(state.players[oppId].pos, p.pos);
          return Math.min(best, d);
        }, Number.POSITIVE_INFINITY);
        return { id: p.id, score: forward * 0.7 + spacing * 0.45 + p.stats.pac * 0.25 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRuns);

    for (const run of runCandidates) {
      const p = state.players[run.id];
      const xLead = team === "HOME" ? 96 : -96;
      const yBias = p.pos.y < carrier.pos.y ? -30 : 30;
      this.assignIntentIfFree(p.id, state, {
        type: "DRIBBLE_TO_DIRECTION",
        targetPos: { x: p.pos.x + xLead, y: p.pos.y + yBias * 0.3 },
        expiresAtMs: state.timeMs + 620,
        priority: 57,
      });
      p.runCooldownMs = 1800;
      this.setAiState(state, p.id, "MAKE_RUN");
    }

    const supportIds = outfieldIds
      .filter((id) => !runCandidates.some((r) => r.id === id))
      .sort((a, b) => dist(state.players[a].pos, carrier.pos) - dist(state.players[b].pos, carrier.pos))
      .slice(0, 2);

    const xBase = team === "HOME" ? 44 : -44;
    const yOffsets = [-28, 28];
    for (let i = 0; i < supportIds.length; i++) {
      const p = state.players[supportIds[i]];
      this.assignIntentIfFree(p.id, state, {
        type: "DRIBBLE_TO_DIRECTION",
        targetPos: { x: carrier.pos.x + xBase, y: carrier.pos.y + yOffsets[i] },
        expiresAtMs: state.timeMs + 420,
        priority: 50,
      });
      this.setAiState(state, p.id, "SUPPORT");
    }
  }

  private decideBallCarrierAction(
    state: MatchState,
    ballSystem: BallSystem,
    passSystem: PassSystem,
    humanControlledTeam?: TeamId
  ) {
    if (state.ball.state !== "CARRIED" || !state.ball.carrierId) return;
    const carrier = state.players[state.ball.carrierId];
    carrier.aiState = "BALL_CARRIER";
    if (humanControlledTeam && carrier.teamId === humanControlledTeam) return;
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

    const runFrequency = TUNING.runFrequency + (state.teams[team].activeCommand?.modifiers.runFrequencyDelta ?? 0);
    if (passSystem.tryBestPass(state, team, ballSystem, true) && runFrequency > 0.4) {
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
    if (
      current &&
      current.type === intent.type &&
      current.targetPlayerId &&
      intent.targetPlayerId &&
      current.targetPlayerId === intent.targetPlayerId
    ) {
      player.intent = {
        ...current,
        ...intent,
      };
      return;
    }
    if (current && current.expiresAtMs > state.timeMs && current.priority >= 95 && intent.priority < current.priority) {
      return;
    }
    if (current && current.expiresAtMs > state.timeMs && current.priority >= intent.priority) {
      return;
    }
    player.intent = intent;
  }

  private resetAiStateLabels(state: MatchState) {
    for (const p of Object.values(state.players)) {
      if (p.role === "GK") {
        p.aiState = "HOLD_ZONE";
        continue;
      }
      if (state.possession.team === p.teamId) {
        p.aiState = "SUPPORT";
      } else {
        p.aiState = "RECOVER_SHAPE";
      }
    }
  }

  private setAiState(state: MatchState, playerId: string, aiState: MatchState["players"][string]["aiState"]) {
    const p = state.players[playerId];
    if (!p || p.role === "GK") return;
    p.aiState = aiState;
  }

  private resolveFallbackAiStates(state: MatchState) {
    for (const p of Object.values(state.players)) {
      if (p.role === "GK") {
        p.aiState = "HOLD_ZONE";
        continue;
      }
      if (p.aiState !== "SUPPORT" && p.aiState !== "RECOVER_SHAPE") continue;
      if (p.markTargetId && state.possession.team !== p.teamId) {
        p.aiState = "MARK";
      }
      if (p.intent?.type === "PRESS_ZONE") p.aiState = "PRESS";
      if (p.intent?.type === "TACKLE_TARGET") p.aiState = "TACKLE_ATTEMPT";
      if (p.intent?.type === "CARRY_BURST" || p.intent?.type === "DRIBBLE_TO_DIRECTION") {
        if (state.possession.team === p.teamId) {
          p.aiState = "SUPPORT";
        }
      }
    }
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
