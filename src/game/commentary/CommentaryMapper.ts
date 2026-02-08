import type { SimEvent } from "../../sim/events/SimEvent";
import type { TeamId } from "../../sim/state/MatchState";
import type { CommentaryLine } from "./CommentaryQueue";

function pick(lines: string[], seed: number): string {
  if (lines.length === 0) return "Play continues.";
  if (!Number.isFinite(seed)) return lines[0];
  const idx = Math.floor(Math.abs(seed)) % lines.length;
  return lines[idx] ?? lines[0];
}

function line(text: string, team: TeamId | null, priority: number, immediate = false): CommentaryLine {
  return { text, team, priority, immediate };
}

export function commentaryFromEvent(event: SimEvent): CommentaryLine[] {
  if (event.type === "goal_scored") {
    const text = pick(["GOAL! Clean finish!", "Clinical execution!", "Counter lands!"], event.atMs);
    return [line(text, event.team, 100, true)];
  }

  if (event.type === "team_command_activated") {
    const map: Record<string, string[]> = {
      ALL_OUT_ATTACK: ["All Out Attack deployed!", "Forward lines surging!"],
      PARK_THE_BUS: ["Defensive wall formed.", "Sitting deep now."],
      HIGH_PRESS: ["High press activated!", "Close them down!"],
      FAST_COUNTER: ["Fast counter primed!", "Break on!"],
      SLOW_BUILD_UP: ["Controlled build-up.", "Patience and precision."],
      WING_OVERLOAD: ["Overload on the flank!", "Pressure down wide."],
      MIDFIELD_LOCKDOWN: ["Midfield locked down.", "Center lane sealed."],
      TARGET_MAN_PLAY: ["Target man engaged.", "Direct route unlocked."],
      FLUID_FORMATION: ["Shape-shift online.", "Adaptive positioning live."],
      LAST_10_MINUTES_FURY: ["Last push engaged!", "Maximum intensity!"],
    };
    const lines = map[event.command] ?? ["Tactical switch activated."];
    return [line(pick(lines, event.atMs), event.team, 80)];
  }

  if (event.type === "card_result") {
    if (!event.success) {
      return [line("Play denied.", event.team, 35)];
    }

    switch (event.cardType) {
      case "PASS":
      case "THROUGH_PASS":
      case "LONG_BALL":
      case "CROSS":
        return [line(pick(["Threaded pass!", "Great link-up play!", "Quick distribution."], event.atMs), event.team, 50)];
      case "DRIBBLE":
      case "RUSH":
        return [line(pick(["Silky footwork.", "Line broken!", "Taking him on!"], event.atMs), event.team, 55)];
      case "SHOOT":
        return [line(pick(["Dangerous strike!", "That had venom!", "Cracking effort!"], event.atMs), event.team, 70)];
      case "TACKLE":
        return [line(pick(["Excellent challenge!", "Ball won cleanly!", "Crunching tackle!"], event.atMs), event.team, 62)];
      default:
        return [];
    }
  }

  if (event.type === "momentum_changed") {
    if (Math.abs(event.momentum) < 0.25) return [];
    const up = event.byTeam === "HOME" ? event.momentum > 0 : event.momentum < 0;
    return [
      line(
        pick(up ? ["Momentum building!", "Upward surge!", "They smell blood!"] : ["Momentum slipping...", "Losing the rhythm."], event.atMs),
        event.byTeam,
        45
      ),
    ];
  }

  if (event.type === "ball_transition") {
    if (["keeper_save_hold", "keeper_parry", "keeper_rush_pickup"].includes(event.reason)) {
      return [line(pick(["What a save!", "Strong hands!", "Keeper stands tall!"], event.atMs), null, 66)];
    }
    if (event.reason === "lane_intercept") {
      return [line(pick(["Reads it perfectly.", "Cut out the danger.", "Vision and timing!"], event.atMs), null, 58)];
    }
  }

  return [];
}
