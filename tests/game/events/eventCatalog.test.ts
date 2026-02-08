import { describe, expect, test } from "vitest";
import { eventForWeek } from "../../../src/game/events/EventCatalog";

describe("eventForWeek", () => {
  test("rotates through configured weekly events", () => {
    expect(eventForWeek(0).id).toBe("BALANCED");
    expect(eventForWeek(1).id).toBe("COUNTER_SURGE");
    expect(eventForWeek(2).id).toBe("PRESS_FEVER");
    expect(eventForWeek(3).id).toBe("CONTROL_CLINIC");
    expect(eventForWeek(4).id).toBe("BALANCED");
  });
});
