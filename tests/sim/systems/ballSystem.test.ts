import { describe, expect, test } from "vitest";
import { DECK_SIZE } from "../../../src/sim/config/MatchConfig";
import { PITCH_CENTER_Y, PITCH_LEFT, PITCH_RIGHT, PITCH_TOP } from "../../../src/sim/config/PitchConfig";
import { createInitialMatchState } from "../../../src/sim/state/createInitialMatchState";
import type { MatchState } from "../../../src/sim/state/MatchState";
import { BallSystem } from "../../../src/sim/systems/BallSystem";

function mkDeck(prefix: string): string[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => `${prefix}_${i + 1}`);
}

function makeState(seed = 42): MatchState {
  return createInitialMatchState({
    rngSeed: seed,
    homeDecks: { attack: mkDeck("HA"), defense: mkDeck("HD") },
    awayDecks: { attack: mkDeck("AA"), defense: mkDeck("AD") },
  });
}

describe("BallSystem transitions", () => {
  test("KICKOFF -> CARRIED on first step", () => {
    const state = makeState();
    const system = new BallSystem(42);

    const transitions = system.step(state, 16);

    expect(transitions.some((t) => t.from === "KICKOFF" && t.to === "CARRIED")).toBe(true);
    expect(state.ball.state).toBe("CARRIED");
  });

  test("CARRIED -> IN_FLIGHT and then IN_FLIGHT -> LOOSE when no receiver", () => {
    const state = makeState();
    const system = new BallSystem(42);

    system.step(state, 16);
    for (const p of Object.values(state.players)) {
      p.pos = { x: PITCH_LEFT + 20, y: PITCH_TOP + 20 };
    }

    const passOk = system.passTo(state, { x: 780, y: 270 });
    expect(passOk).toBe(true);
    expect(state.ball.state).toBe("IN_FLIGHT");

    let sawLoose = false;
    for (let i = 0; i < 180; i++) {
      const t = system.step(state, 16);
      if (t.some((x) => x.from === "IN_FLIGHT" && x.to === "LOOSE")) {
        sawLoose = true;
        break;
      }
    }

    expect(sawLoose).toBe(true);
    expect(state.ball.state).toBe("LOOSE");
  });

  test("SHOT -> GOAL increments score", () => {
    const state = makeState();
    const system = new BallSystem(55);

    system.step(state, 16);

    const homeCarrierId = state.ball.carrierId!;
    state.players[homeCarrierId].pos = { x: PITCH_LEFT + 220, y: PITCH_CENTER_Y };
    state.ball.pos = { x: PITCH_LEFT + 224, y: PITCH_CENTER_Y };

    for (const id of state.teams.AWAY.playerIds) {
      state.players[id].pos = { x: PITCH_LEFT + 40, y: PITCH_TOP + 30 };
    }

    const shotOk = system.shootTo(state, { x: PITCH_RIGHT + 200, y: PITCH_CENTER_Y });
    expect(shotOk).toBe(true);

    let reachedGoal = false;
    for (let i = 0; i < 240; i++) {
      const t = system.step(state, 16);
      if (t.some((x) => x.to === "GOAL")) {
        reachedGoal = true;
        break;
      }
    }

    expect(reachedGoal).toBe(true);
    expect(state.ball.state).toBe("GOAL");
    expect(state.score.HOME).toBe(1);
  });

  test("LOOSE -> CARRIED on pickup by nearest player", () => {
    const state = makeState();
    const system = new BallSystem(123);

    const awayId = state.teams.AWAY.playerIds[0];
    const away = state.players[awayId];

    state.ball.state = "LOOSE";
    state.ball.carrierId = null;
    state.ball.pos = { x: away.pos.x, y: away.pos.y };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.targetPos = null;
    state.ball.lastTouchTeam = "HOME";

    system.step(state, 16);

    expect(state.ball.state).toBe("CARRIED");
    expect(state.ball.carrierId).toBe(awayId);
    expect(state.possession.team).toBe("AWAY");
  });

  test("invalid transition guard: cannot shoot from KICKOFF", () => {
    const state = makeState();
    const system = new BallSystem(42);

    const ok = system.shootTo(state, { x: 1000, y: 250 });

    expect(ok).toBe(false);
    expect(state.ball.state).toBe("KICKOFF");
  });

  test("restarts with throw-in when ball exits sideline", () => {
    const state = makeState(99);
    const system = new BallSystem(99);
    system.step(state, 16);

    state.ball.state = "IN_FLIGHT";
    state.ball.carrierId = null;
    state.ball.pos = { x: 400, y: 50 };
    state.ball.vel = { x: 0, y: -80 };
    state.ball.targetPos = { x: 400, y: 40 };
    state.ball.lastTouchTeam = "HOME";

    const transitions = system.step(state, 16);
    expect(transitions.some((t) => t.reason === "throw_in")).toBe(true);
    expect(state.ball.state).toBe("CARRIED");
    expect(state.possession.team).toBe("AWAY");
  });

  test("restarts with goal kick when attacker sends ball over end line", () => {
    const state = makeState(100);
    const system = new BallSystem(100);
    system.step(state, 16);

    state.ball.state = "IN_FLIGHT";
    state.ball.carrierId = null;
    state.ball.pos = { x: PITCH_RIGHT + 8, y: PITCH_CENTER_Y - 10 };
    state.ball.vel = { x: 120, y: 0 };
    state.ball.targetPos = { x: PITCH_RIGHT + 20, y: PITCH_CENTER_Y - 10 };
    state.ball.lastTouchTeam = "HOME";

    const transitions = system.step(state, 16);
    expect(transitions.some((t) => t.reason === "goal_kick")).toBe(true);
    expect(state.ball.state).toBe("CARRIED");
    expect(state.possession.team).toBe("AWAY");
  });

  test("in-flight ball can be intercepted in lane by defender", () => {
    const state = makeState(101);
    const system = new BallSystem(101);
    system.step(state, 16);

    const passerId = state.teams.HOME.playerIds.find((id) => state.players[id].role !== "GK")!;
    const passer = state.players[passerId];
    passer.pos = { x: 420, y: 270 };
    state.ball.state = "CARRIED";
    state.ball.carrierId = passerId;
    state.ball.pos = { x: 424, y: 270 };
    state.ball.lastTouchTeam = "HOME";

    const defenderId = state.teams.AWAY.playerIds.find((id) => state.players[id].role !== "GK")!;
    const defender = state.players[defenderId];
    defender.pos = { x: 520, y: 270 };
    defender.stats.def = 99;
    defender.stats.pac = 99;

    const passOk = system.passTo(state, { x: 680, y: 270 });
    expect(passOk).toBe(true);

    let intercepted = false;
    for (let i = 0; i < 20; i++) {
      const t = system.step(state, 16);
      if (t.some((x) => x.reason === "lane_intercept")) {
        intercepted = true;
        break;
      }
    }

    expect(intercepted).toBe(true);
    expect(state.ball.state).toBe("CARRIED");
    expect(state.ball.carrierId).toBe(defenderId);
  });
});
