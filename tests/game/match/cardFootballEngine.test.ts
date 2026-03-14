import { describe, expect, test } from "vitest";
import { CardFootballEngine } from "../../../src/game/match/CardFootballEngine";

function playAnyTurn(engine: CardFootballEngine) {
  const state = engine.getState();
  if (state.turnMode === "PLAYER_DEFENSE") {
    const card = state.currentHand[0];
    return engine.playDefenseCard(card.id);
  }

  const card = state.currentHand[0];
  const holder = state.pitchPlayers.find((player) => player.hasBall);
  if (!holder) {
    throw new Error("Expected a ball holder");
  }

  if (card.kind === "PASS") {
    const targets = engine.getPassTargets(card.id);
    return engine.playAttackCard(card.id, {
      type: "PASS",
      targetPlayerId: targets[0]?.playerId ?? state.pitchPlayers.find((player) => player.teamId === "HOME" && !player.hasBall)!.playerId,
    });
  }

  if (card.kind === "DRIBBLE") {
    return engine.playAttackCard(card.id, {
      type: "DRIBBLE",
      targetX: holder.x + 8,
      targetY: holder.y,
    });
  }

  return engine.playAttackCard(card.id, {
    type: "SHOT",
    shot: {
      aimQuality: 0.78,
      powerQuality: 0.73,
    },
  });
}

describe("CardFootballEngine", () => {
  test("starts with a home kickoff, three cards, and 11 players per side when requested", () => {
    const engine = new CardFootballEngine({ rngSeed: 7, kickoffTeamFirstHalf: "HOME" });
    const state = engine.getState();
    const homeNames = new Set(state.pitchPlayers.filter((player) => player.teamId === "HOME").map((player) => player.name));
    const awayNames = state.pitchPlayers.filter((player) => player.teamId === "AWAY").map((player) => player.name);

    expect(state.turnMode).toBe("PLAYER_ATTACK");
    expect(state.currentHand).toHaveLength(3);
    expect(state.pitchPlayers.filter((player) => player.teamId === "HOME")).toHaveLength(11);
    expect(state.pitchPlayers.filter((player) => player.teamId === "AWAY")).toHaveLength(11);
    expect(awayNames.some((name) => homeNames.has(name))).toBe(false);
  });

  test("different seeds can produce either team on the opening kickoff", () => {
    const kickoffTeams = new Set(
      Array.from({ length: 16 }, (_, index) => new CardFootballEngine({ rngSeed: index + 1 }).getState().kickoffTeamFirstHalf)
    );

    expect(kickoffTeams.has("HOME")).toBe(true);
    expect(kickoffTeams.has("AWAY")).toBe(true);
  });

  test("combo context rewards a one-two flowing into a shot", () => {
    const engine = new CardFootballEngine({ rngSeed: 91 }) as unknown as {
      state: { comboState: { teamId: "HOME" | "AWAY"; lastCardId: string; chain: number } | null };
      getComboContext: (teamId: "HOME" | "AWAY", cardId: string) => { bonus: number; line: string | null };
    };

    engine.state.comboState = { teamId: "HOME", lastCardId: "ONE_TWO", chain: 1 };

    const combo = engine.getComboContext("HOME", "PLACED_SHOT");
    expect(combo.bonus).toBeGreaterThan(0);
    expect(combo.line).toMatch(/give-and-go|lane/i);
  });

  test("active combo state is exposed to the HUD with a matching preview", () => {
    const engine = new CardFootballEngine({ rngSeed: 94 }) as unknown as CardFootballEngine & {
      state: { comboState: { teamId: "HOME" | "AWAY"; lastCardId: string; chain: number } | null };
    };

    engine.state.comboState = { teamId: "HOME", lastCardId: "ONE_TWO", chain: 2 };

    const state = engine.getState();
    const preview = engine.getComboPreview("PLACED_SHOT", "HOME");

    expect(state.combo?.lastCardId).toBe("ONE_TWO");
    expect(state.combo?.lastCardName).toBe("One-Two");
    expect(state.combo?.chain).toBe(2);
    expect(preview?.sourceCardName).toBe("One-Two");
    expect(preview?.bonus).toBeGreaterThan(0);
  });

  test("live state exposes a high-drama attack moment with a featured card", () => {
    const engine = new CardFootballEngine({ rngSeed: 101, kickoffTeamFirstHalf: "HOME" }) as unknown as CardFootballEngine & {
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        teams: { HOME: { lineup: { ST: { playerId: string; x: number; y: number } } } };
      };
    };

    engine.state.teams.HOME.lineup.ST.x = 88;
    engine.state.teams.HOME.lineup.ST.y = 31;
    engine.state.ball.teamId = "HOME";
    engine.state.ball.holderId = engine.state.teams.HOME.lineup.ST.playerId;
    engine.state.ball.x = 88;
    engine.state.ball.y = 31;
    engine.state.currentHand = ["PLACED_SHOT", "SHORT_PASS", "BODY_FEINT"];

    const state = engine.getState();

    expect(state.drama?.id).toBe("BOX_CHAOS");
    expect(state.heroMoment?.kind).toBe("ATTACK");
    expect(state.heroMoment?.cardId).toBe("PLACED_SHOT");
    expect(state.heroMoment?.bonus).toBeGreaterThan(0);
  });

  test("player defense exposes a trap-ready hero call when the CPU move is shown", () => {
    const engine = new CardFootballEngine({ rngSeed: 102, kickoffTeamFirstHalf: "AWAY" }) as unknown as CardFootballEngine & {
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        cpuPendingAttack: { hand: string[]; cardId: string } | null;
        turnMode: "PLAYER_ATTACK" | "PLAYER_DEFENSE" | "HALFTIME" | "FULLTIME";
        pressure: { HOME: number; AWAY: number };
      };
    };

    engine.state.turnMode = "PLAYER_DEFENSE";
    engine.state.currentHand = ["PRESS_TRAP", "DOUBLE_PRESS", "LOW_BLOCK"];
    engine.state.cpuPendingAttack = {
      hand: ["THROUGH_BALL", "POWER_SHOT", "SHORT_PASS"],
      cardId: "THROUGH_BALL",
    };
    engine.state.pressure.AWAY = 10;

    const state = engine.getState();

    expect(state.drama?.id).toBe("TRAP_READY");
    expect(state.heroMoment?.kind).toBe("DEFENSE");
    expect(state.heroMoment?.bonus).toBeGreaterThan(0);
    expect(["PRESS_TRAP", "DOUBLE_PRESS", "TRACK_RUNNER"]).toContain(state.heroMoment?.cardId);
  });

  test("playing the featured hero card carries the hero insight into the resolution", () => {
    const engine = new CardFootballEngine({ rngSeed: 103, kickoffTeamFirstHalf: "HOME" }) as unknown as CardFootballEngine & {
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        teams: { HOME: { lineup: { ST: { playerId: string; x: number; y: number } } } };
      };
    };

    engine.state.teams.HOME.lineup.ST.x = 86;
    engine.state.teams.HOME.lineup.ST.y = 32;
    engine.state.ball.teamId = "HOME";
    engine.state.ball.holderId = engine.state.teams.HOME.lineup.ST.playerId;
    engine.state.ball.x = 86;
    engine.state.ball.y = 32;
    engine.state.currentHand = ["PLACED_SHOT", "SHORT_PASS", "BODY_FEINT"];

    const state = engine.getState();
    const result = engine.playAttackCard(state.heroMoment?.cardId ?? "PLACED_SHOT", {
      type: "SHOT",
      shot: {
        aimQuality: 0.84,
        powerQuality: 0.78,
      },
    });

    expect(result.attackingCard?.id).toBe(state.heroMoment?.cardId);
    expect(result.insights.hero).toBeTruthy();
  });

  test("trait context rewards creative passers finding runners", () => {
    const engine = new CardFootballEngine({ rngSeed: 92 }) as unknown as {
      getPassTraitContext: (
        passer: Record<string, unknown>,
        target: Record<string, unknown>,
        card: { id: string }
      ) => { bonus: number; line: string | null };
    };

    const passer = {
      name: "N. Reeves",
      archetypeName: "Classic Playmaker",
      tacticalIdentity: "CONTROL",
      traits: ["Creator", "Through-Ball Expert"],
    };
    const target = {
      name: "D. Osei",
      archetypeName: "Speedster",
      tacticalIdentity: "COUNTER",
      traits: ["Counter Attack Specialist", "Wide Runner"],
    };

    const context = engine.getPassTraitContext(passer, target, { id: "THROUGH_BALL" });
    expect(context.bonus).toBeGreaterThanOrEqual(8);
    expect(context.line).toMatch(/sharpen|reads the run|half-step/i);
  });

  test("press trap and double team expose distinct trap bonuses", () => {
    const engine = new CardFootballEngine({ rngSeed: 93 }) as unknown as {
      getPassTrapContext: (
        defendingCard: { id: string },
        attackingCard: { id: string },
        pressure: Array<{ player: Record<string, unknown>; proximity: number }>,
        target: Record<string, unknown>,
        passDistance: number
      ) => { penalty: number; title: string | null; interceptor: Record<string, unknown> | null };
      getDribbleTrapContext: (
        defendingCard: { id: string },
        pressure: Array<{ player: Record<string, unknown>; proximity: number }>,
        holder: Record<string, unknown>
      ) => { penalty: number; cleanWindowBonus: number; title: string | null };
    };

    const pressure = [
      {
        player: {
          name: "C. Duval",
          archetypeName: "Destroyer",
          tacticalIdentity: "PRESS",
          traits: ["Enforcer", "Pressing Monster"],
          x: 48,
          y: 31,
        },
        proximity: 1.1,
      },
    ];
    const passTrap = engine.getPassTrapContext(
      { id: "PRESS_TRAP" },
      { id: "THREAD_PASS" },
      pressure,
      { name: "Runner", x: 55, y: 30 },
      20
    );
    const dribbleTrap = engine.getDribbleTrapContext({ id: "DOUBLE_TEAM" }, pressure, { name: "Carrier", x: 50, y: 32 });

    expect(passTrap.penalty).toBeGreaterThan(0);
    expect(passTrap.title).toBe("Trap Sprung");
    expect(passTrap.interceptor?.name).toBe("C. Duval");
    expect(dribbleTrap.penalty).toBeGreaterThan(0);
    expect(dribbleTrap.cleanWindowBonus).toBeGreaterThan(0);
    expect(dribbleTrap.title).toBe("Swarmed");
  });

  test("resolves turns and immediately prepares the next three-card hand", () => {
    const engine = new CardFootballEngine({ rngSeed: 8, kickoffTeamFirstHalf: "HOME" });

    const result = playAnyTurn(engine);
    const state = engine.getState();

    expect(result.commentary.length).toBeGreaterThan(0);
    expect(state.phase).toBe("LIVE");
    expect(state.currentHand).toHaveLength(3);
  });

  test("successful attacks build pressure for the attacking team", () => {
    const engine = new CardFootballEngine({ rngSeed: 18, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      getState: CardFootballEngine["getState"];
      playAttackCard: CardFootballEngine["playAttackCard"];
      rng: { int: (min: number, max: number) => number };
      state: { currentHand: string[] };
    };

    engine.state.currentHand = ["SHORT_PASS", "BODY_FEINT", "PLACED_SHOT"];
    engine.rng.int = () => 1;
    const target = engine.getState().pitchPlayers.find((player) => player.teamId === "HOME" && player.slotId === "ST");
    expect(target).toBeDefined();

    engine.playAttackCard("SHORT_PASS", {
      type: "PASS",
      targetPlayerId: target!.playerId,
    });

    const state = engine.getState();
    expect(state.pressure.HOME).toBeGreaterThan(0);
    expect(state.pressure.AWAY).toBe(0);
  });

  test("movement phase repositions multiple players during a resolution", () => {
    const engine = new CardFootballEngine({ rngSeed: 12, kickoffTeamFirstHalf: "HOME" });

    const result = playAnyTurn(engine);
    const movedPlayers = result.animations.filter(
      (animation) => Math.hypot(animation.toX - animation.fromX, animation.toY - animation.fromY) > 0.5
    );

    expect(result.animations).toHaveLength(22);
    expect(movedPlayers.length).toBeGreaterThan(8);
  });

  test("reaches halftime, accepts tactical changes and substitutions, then starts the second half", () => {
    const engine = new CardFootballEngine({ rngSeed: 11, kickoffTeamFirstHalf: "HOME" });

    let guard = 0;
    while (engine.getState().phase === "LIVE" && guard < 160) {
      playAnyTurn(engine);
      guard += 1;
    }

    const halftime = engine.getState();
    expect(halftime.phase).toBe("HALFTIME");

    const originalBenchPlayer = halftime.teams[0].bench[0];
    const originalSlot = halftime.teams[0].lineup[0].slotId;

    engine.setHomeTactic("DIRECT");
    engine.makeHomeSubstitution(originalSlot, originalBenchPlayer.playerId);
    engine.beginSecondHalf();

    const secondHalf = engine.getState();
    expect(secondHalf.half).toBe(2);
    expect(secondHalf.phase).toBe("LIVE");
    expect(secondHalf.turnMode).toBe("PLAYER_DEFENSE");
    expect(secondHalf.teams[0].tactic).toBe("DIRECT");
  });

  test("starting a new attack after a turnover keeps the ball at the live pitch location", () => {
    const engine = new CardFootballEngine({ rngSeed: 17, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      getState: CardFootballEngine["getState"];
      startRound: (teamId: "HOME" | "AWAY", openingLine: string, resetToCenter: boolean) => void;
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        teams: {
          AWAY: { lineup: { ST: { playerId: string; x: number; y: number; hasBall: boolean } } };
          HOME: { lineup: { LW: { x: number; y: number } } };
        };
      };
    };

    engine.state.teams.HOME.lineup.LW.x = 34.7;
    engine.state.teams.HOME.lineup.LW.y = 9.4;
    engine.state.teams.AWAY.lineup.ST.x = 73.5;
    engine.state.teams.AWAY.lineup.ST.y = 18.2;
    engine.state.ball.teamId = "AWAY";
    engine.state.ball.holderId = engine.state.teams.AWAY.lineup.ST.playerId;
    engine.state.ball.x = 73.5;
    engine.state.ball.y = 18.2;

    engine.startRound("AWAY", "Turn over.", false);

    const state = engine.getState();
    expect(state.ball.x).toBeCloseTo(73.5, 5);
    expect(state.ball.y).toBeCloseTo(18.2, 5);
    expect(state.ball.holderId).toBe(engine.state.teams.AWAY.lineup.ST.playerId);
    expect(engine.state.teams.HOME.lineup.LW.x).toBeCloseTo(34.7, 5);
    expect(engine.state.teams.HOME.lineup.LW.y).toBeCloseTo(9.4, 5);
    expect(engine.state.teams.AWAY.lineup.ST.hasBall).toBe(true);
  });

  test("failed passes recover near the loose-ball area instead of jumping to a fixed center-back", () => {
    const engine = new CardFootballEngine({ rngSeed: 31, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      getState: CardFootballEngine["getState"];
      playAttackCard: CardFootballEngine["playAttackCard"];
      rng: { int: (min: number, max: number) => number };
      state: { currentHand: string[] };
    };

    engine.state.currentHand = ["SHORT_PASS", "BODY_FEINT", "POWER_DRIVE"];
    const targets = engine.getPassTargets("SHORT_PASS");
    const widestTarget = targets.sort((a, b) => b.x - a.x)[0];

    engine.rng.int = () => 100;

    const result = engine.playAttackCard("SHORT_PASS", {
      type: "PASS",
      targetPlayerId: widestTarget.playerId,
    });
    const state = engine.getState();
    const holder = state.pitchPlayers.find((player) => player.playerId === state.ball.holderId);

    expect(result.title).toMatch(/Pass Misplayed|Intercepted/);
    expect(holder).toBeDefined();
    expect(holder?.teamId).toBe("AWAY");
    expect(Math.abs((holder?.x ?? 0) - widestTarget.x)).toBeLessThan(20);
  });

  test("failed wide passes can create a throw-in restart instead of a magical turnover", () => {
    const engine = new CardFootballEngine({ rngSeed: 35, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      getState: CardFootballEngine["getState"];
      playAttackCard: CardFootballEngine["playAttackCard"];
      rng: { int: (min: number, max: number) => number };
      state: {
        currentHand: string[];
        teams: {
          HOME: { lineup: { RW: { playerId: string; x: number; y: number } } };
        };
      };
    };

    engine.state.currentHand = ["SWITCH_PLAY", "BODY_FEINT", "PLACED_SHOT"];
    engine.state.teams.HOME.lineup.RW.x = 71;
    engine.state.teams.HOME.lineup.RW.y = 59;
    engine.rng.int = () => 100;

    const result = engine.playAttackCard("SWITCH_PLAY", {
      type: "PASS",
      targetPlayerId: engine.state.teams.HOME.lineup.RW.playerId,
    });

    expect(result.restart?.type).toBe("THROW_IN");
  });

  test("off-ball movement restores width and defensive shape instead of collapsing into one cluster", () => {
    const engine = new CardFootballEngine({ rngSeed: 41, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      playAttackCard: CardFootballEngine["playAttackCard"];
      getState: CardFootballEngine["getState"];
      rng: { int: (min: number, max: number) => number };
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        teams: {
          HOME: {
            lineup: Record<string, { playerId: string; x: number; y: number }>;
          };
          AWAY: {
            lineup: Record<string, { x: number; y: number }>;
          };
        };
      };
    };

    for (const slot of ["LB", "LCB", "RCB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"]) {
      engine.state.teams.HOME.lineup[slot].x = 48;
      engine.state.teams.HOME.lineup[slot].y = 31;
      engine.state.teams.AWAY.lineup[slot].x = 52;
      engine.state.teams.AWAY.lineup[slot].y = 33;
    }
    engine.state.ball.teamId = "HOME";
    engine.state.ball.holderId = engine.state.teams.HOME.lineup.CM.playerId;
    engine.state.ball.x = 48;
    engine.state.ball.y = 31;
    engine.state.currentHand = ["SHORT_PASS", "BODY_FEINT", "POWER_DRIVE"];
    engine.rng.int = () => 1;

    engine.playAttackCard("SHORT_PASS", {
      type: "PASS",
      targetPlayerId: engine.state.teams.HOME.lineup.ST.playerId,
    });

    const state = engine.getState();
    const homeWide = state.pitchPlayers
      .filter((player) => player.teamId === "HOME" && ["LW", "RW"].includes(player.slotId))
      .sort((a, b) => a.y - b.y);
    const awayFullbacks = state.pitchPlayers
      .filter((player) => player.teamId === "AWAY" && ["LB", "RB"].includes(player.slotId))
      .sort((a, b) => a.y - b.y);

    expect(homeWide[0].y).toBeLessThan(32);
    expect(homeWide[1].y).toBeGreaterThan(32);
    expect(awayFullbacks[0].y).toBeLessThan(33);
    expect(awayFullbacks[1].y).toBeGreaterThan(33);
  });

  test("keeper retreats back toward goal after losing the ball", () => {
    const engine = new CardFootballEngine({ rngSeed: 55, kickoffTeamFirstHalf: "HOME" }) as unknown as {
      getState: CardFootballEngine["getState"];
      playAttackCard: CardFootballEngine["playAttackCard"];
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        teams: {
          HOME: {
            lineup: {
              GK: { playerId: string; x: number; y: number };
              ST: { playerId: string; x: number; y: number };
            };
          };
          AWAY: {
            lineup: {
              GK: { x: number; y: number };
            };
          };
        };
      };
    };

    engine.state.teams.HOME.lineup.GK.x = 20;
    engine.state.teams.HOME.lineup.GK.y = 39;
    engine.state.teams.HOME.lineup.ST.x = 63;
    engine.state.teams.HOME.lineup.ST.y = 32;
    engine.state.ball.teamId = "HOME";
    engine.state.ball.holderId = engine.state.teams.HOME.lineup.ST.playerId;
    engine.state.ball.x = 63;
    engine.state.ball.y = 32;
    engine.state.currentHand = ["SHORT_PASS", "BODY_FEINT", "POWER_DRIVE"];

    engine.playAttackCard("SHORT_PASS", {
      type: "PASS",
      targetPlayerId: engine.state.teams.HOME.lineup.ST.playerId,
    });

    const state = engine.getState();
    const keeper = state.pitchPlayers.find((player) => player.teamId === "HOME" && player.slotId === "GK");

    expect(keeper).toBeDefined();
    expect((keeper?.x ?? 99)).toBeLessThan(20);
  });

  test("engine exposes distinct team playstyles for the prototype match", () => {
    const engine = new CardFootballEngine({ rngSeed: 61, kickoffTeamFirstHalf: "HOME" });
    const state = engine.getState();

    expect(state.teams.find((team) => team.id === "HOME")?.playstyle).toBe("CONTROL");
    expect(["CONTROL", "DIRECT", "WIDE", "PRESSING"]).toContain(state.teams.find((team) => team.id === "AWAY")?.playstyle);
  });

  test("off-target shots keep a visual miss point instead of snapping to the goal-kick holder", () => {
    const engine = new CardFootballEngine({ rngSeed: 73, kickoffTeamFirstHalf: "HOME" }) as unknown as CardFootballEngine & {
      rng: { int: (min: number, max: number) => number };
      state: {
        currentHand: string[];
      };
    };

    engine.state.currentHand = ["PLACED_SHOT", "BODY_FEINT", "SHORT_PASS"];
    engine.rng.int = () => 100;

    const result = engine.playAttackCard("PLACED_SHOT", {
      type: "SHOT",
      shot: {
        aimQuality: 0.82,
        powerQuality: 0.76,
      },
    });

    expect(result.title).toBe("Off Target");
    expect(result.visualBall).not.toBeNull();
    expect((result.visualBall?.x ?? 0) > 100).toBe(true);
    expect(result.visualBall?.holderId).toBe("");
    expect(result.ball.holderId).not.toBe(result.visualBall?.holderId);
  });

  test("goal resolutions keep a visual goal-mouth target while the live state resets to kickoff", () => {
    const engine = new CardFootballEngine({ rngSeed: 74, kickoffTeamFirstHalf: "HOME" }) as unknown as CardFootballEngine & {
      rng: { int: (min: number, max: number) => number };
      state: {
        ball: { holderId: string; teamId: "HOME" | "AWAY"; x: number; y: number };
        currentHand: string[];
        teams: {
          HOME: {
            lineup: {
              ST: { playerId: string; x: number; y: number };
            };
          };
          AWAY: {
            lineup: Record<string, { x: number; y: number }>;
          };
        };
      };
    };

    engine.state.teams.HOME.lineup.ST.x = 83;
    engine.state.teams.HOME.lineup.ST.y = 32;
    engine.state.ball.teamId = "HOME";
    engine.state.ball.holderId = engine.state.teams.HOME.lineup.ST.playerId;
    engine.state.ball.x = 83;
    engine.state.ball.y = 32;
    for (const slot of ["LB", "LCB", "RCB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"]) {
      engine.state.teams.AWAY.lineup[slot].x = 58;
      engine.state.teams.AWAY.lineup[slot].y = 10;
    }
    engine.state.currentHand = ["PLACED_SHOT", "BODY_FEINT", "SHORT_PASS"];
    engine.rng.int = () => 1;

    const result = engine.playAttackCard("PLACED_SHOT", {
      type: "SHOT",
      shot: {
        aimQuality: 0.9,
        powerQuality: 0.7,
      },
    });

    expect(result.title).toBe("Goal");
    expect(result.visualBall).not.toBeNull();
    expect((result.visualBall?.x ?? 0) > 95).toBe(true);
    expect(result.visualBall?.holderId).toBe("");
    expect(result.ball.x).toBe(50);
    expect(result.ball.holderId).not.toBe(result.visualBall?.holderId);
  });

  test("defense guidance highlights runner-tracking cards against direct through balls", () => {
    const engine = new CardFootballEngine({ rngSeed: 75, kickoffTeamFirstHalf: "HOME" }) as unknown as CardFootballEngine & {
      state: {
        turnMode: "PLAYER_DEFENSE";
        currentHand: string[];
        cpuPendingAttack: { hand: string[]; cardId: string };
        teams: {
          AWAY: { playstyle: "CONTROL" | "DIRECT" | "WIDE" | "PRESSING" };
        };
      };
    };

    engine.state.turnMode = "PLAYER_DEFENSE";
    engine.state.currentHand = ["LANE_BLOCK", "TRACK_RUNNER", "DROP_OFF"];
    engine.state.cpuPendingAttack = { hand: ["THROUGH_BALL"], cardId: "THROUGH_BALL" };
    engine.state.teams.AWAY.playstyle = "DIRECT";

    const tracker = engine.getDefenseCardGuidance("TRACK_RUNNER");
    const laneBlock = engine.getDefenseCardGuidance("LANE_BLOCK");

    expect(tracker).not.toBeNull();
    expect(laneBlock).not.toBeNull();
    expect((tracker?.score ?? 0) > (laneBlock?.score ?? 0)).toBe(true);
    expect(tracker?.badge).toMatch(/BEST|GOOD/);
    expect(tracker?.focus).toMatch(/run/i);
  });
});
