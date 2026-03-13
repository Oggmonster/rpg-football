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

    expect(state.turnMode).toBe("PLAYER_ATTACK");
    expect(state.currentHand).toHaveLength(3);
    expect(state.pitchPlayers.filter((player) => player.teamId === "HOME")).toHaveLength(11);
    expect(state.pitchPlayers.filter((player) => player.teamId === "AWAY")).toHaveLength(11);
  });

  test("resolves turns and immediately prepares the next three-card hand", () => {
    const engine = new CardFootballEngine({ rngSeed: 8, kickoffTeamFirstHalf: "HOME" });

    const result = playAnyTurn(engine);
    const state = engine.getState();

    expect(result.commentary.length).toBeGreaterThan(0);
    expect(state.phase).toBe("LIVE");
    expect(state.currentHand).toHaveLength(3);
  });

  test("reaches halftime, accepts tactical changes and substitutions, then starts the second half", () => {
    const engine = new CardFootballEngine({ rngSeed: 11, kickoffTeamFirstHalf: "HOME" });

    let guard = 0;
    while (engine.getState().phase === "LIVE" && guard < 80) {
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
});
