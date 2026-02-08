import { describe, expect, test } from "vitest";
import type { ManagerProgress } from "../../../src/game/profile/ProfileStore";
import { applySeasonProgress } from "../../../src/game/seasons/SeasonSystem";

describe("applySeasonProgress", () => {
  test("resets season and promotes when threshold reached", () => {
    const manager: ManagerProgress = {
      level: 5,
      xp: 30,
      coins: 200,
      season: 2,
      division: 8,
      seasonMatches: 19,
      seasonPoints: 34,
      weekIndex: 3,
      activeEventId: "CONTROL_CLINIC",
      matchesPlayed: 44,
      wins: 20,
      draws: 8,
      losses: 16,
    };

    const out = applySeasonProgress(manager, "WIN");

    expect(out.seasonReset).toBe(true);
    expect(out.promotion).toBe(true);
    expect(out.manager.season).toBe(3);
    expect(out.manager.division).toBe(7);
    expect(out.manager.seasonMatches).toBe(0);
    expect(out.manager.seasonPoints).toBe(0);
  });
});
