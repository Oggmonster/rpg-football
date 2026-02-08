import type { ManagerProgress } from "../profile/ProfileStore";
import { eventForWeek, type EventModifierId } from "../events/EventCatalog";

export interface SeasonUpdate {
  manager: ManagerProgress;
  pointsAwarded: number;
  seasonReset: boolean;
  promotion: boolean;
  relegation: boolean;
  eventChanged: boolean;
  activeEventId: EventModifierId;
}

function pointsForResult(result: "WIN" | "DRAW" | "LOSS"): number {
  if (result === "WIN") return 3;
  if (result === "DRAW") return 1;
  return 0;
}

export function applySeasonProgress(manager: ManagerProgress, result: "WIN" | "DRAW" | "LOSS"): SeasonUpdate {
  const next: ManagerProgress = { ...manager };
  const beforeEventId = next.activeEventId;
  const pointsAwarded = pointsForResult(result);

  next.seasonMatches += 1;
  next.seasonPoints += pointsAwarded;
  next.weekIndex = Math.floor((next.seasonMatches - 1) / 5);

  let seasonReset = false;
  let promotion = false;
  let relegation = false;

  if (next.seasonMatches >= 20) {
    seasonReset = true;
    if (next.seasonPoints >= 34 && next.division > 1) {
      next.division -= 1;
      promotion = true;
    } else if (next.seasonPoints <= 14 && next.division < 10) {
      next.division += 1;
      relegation = true;
    }

    next.season += 1;
    next.seasonMatches = 0;
    next.seasonPoints = 0;
    next.weekIndex = 0;
  }

  next.activeEventId = eventForWeek(next.weekIndex).id;
  const eventChanged = beforeEventId !== next.activeEventId;

  return {
    manager: next,
    pointsAwarded,
    seasonReset,
    promotion,
    relegation,
    eventChanged,
    activeEventId: next.activeEventId,
  };
}
