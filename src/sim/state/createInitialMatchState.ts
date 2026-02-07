import { DEFAULT_TEAM_SIZE, MATCH_DURATION_MS } from "../config/MatchConfig";
import { PITCH_CENTER_X, PITCH_HEIGHT, PITCH_TOP } from "../config/PitchConfig";
import { RNG } from "../math/RNG";
import type {
  DeckState,
  HandState,
  MatchState,
  PlayerRole,
  PlayerState,
  TeamId,
  TeamState,
} from "./MatchState";

export interface InitialDecks {
  attack: string[];
  defense: string[];
}

export interface CreateInitialMatchStateArgs {
  rngSeed: number;
  teamSize?: number;
  homeDecks: InitialDecks;
  awayDecks: InitialDecks;
}

function createDeck(ids: string[]): DeckState {
  return { draw: [...ids] };
}

function createHand(): HandState {
  return { cards: [] };
}

function roleForSlot(slot: number, teamSize: number): PlayerRole {
  if (slot === 0) return "GK";
  const defenders = Math.max(2, Math.floor((teamSize - 1) * 0.4));
  const mids = Math.max(2, Math.floor((teamSize - 1) * 0.35));
  if (slot <= defenders) return "DEF";
  if (slot <= defenders + mids) return "MID";
  return "FWD";
}

function baseStatsByRole(role: PlayerRole) {
  switch (role) {
    case "GK":
      return { pac: 45, sho: 30, pas: 55, dri: 40, def: 70, phy: 68 };
    case "DEF":
      return { pac: 58, sho: 42, pas: 56, dri: 50, def: 68, phy: 66 };
    case "MID":
      return { pac: 62, sho: 58, pas: 66, dri: 64, def: 56, phy: 58 };
    case "FWD":
      return { pac: 70, sho: 68, pas: 56, dri: 66, def: 42, phy: 54 };
  }
}

function createPlayer(
  rng: RNG,
  id: string,
  teamId: TeamId,
  role: PlayerRole,
  shirtNumber: number,
  x: number,
  y: number
): PlayerState {
  const base = baseStatsByRole(role);
  const jitter = () => rng.int(-4, 4);
  return {
    id,
    teamId,
    role,
    shirtNumber,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    stamina: 100,
    stats: {
      pac: base.pac + jitter(),
      sho: base.sho + jitter(),
      pas: base.pas + jitter(),
      dri: base.dri + jitter(),
      def: base.def + jitter(),
      phy: base.phy + jitter(),
    },
    intent: null,
    markTargetId: null,
  };
}

function teamSpawnX(teamId: TeamId): number {
  const offset = 310;
  return teamId === "HOME" ? PITCH_CENTER_X - offset : PITCH_CENTER_X + offset;
}

function teamAdvanceX(teamId: TeamId, role: PlayerRole): number {
  const base = teamSpawnX(teamId);
  if (role === "GK") return base + (teamId === "HOME" ? -140 : 140);
  if (role === "DEF") return base + (teamId === "HOME" ? -60 : 60);
  if (role === "MID") return base + (teamId === "HOME" ? 30 : -30);
  return base + (teamId === "HOME" ? 110 : -110);
}

function buildTeamPlayers(
  rng: RNG,
  teamId: TeamId,
  teamSize: number,
  players: Record<string, PlayerState>
): string[] {
  const ids: string[] = [];
  for (let i = 0; i < teamSize; i++) {
    const role = roleForSlot(i, teamSize);
    const id = `${teamId}_P${String(i + 1).padStart(2, "0")}`;
    const laneY = PITCH_TOP + ((i + 1) * PITCH_HEIGHT) / (teamSize + 1);
    const y = laneY + rng.int(-10, 10);
    const x = teamAdvanceX(teamId, role) + rng.int(-8, 8);
    players[id] = createPlayer(rng, id, teamId, role, i + 1, x, y);
    ids.push(id);
  }
  return ids;
}

function createTeamState(id: TeamId, decks: InitialDecks, playerIds: string[]): TeamState {
  return {
    id,
    deckAttack: createDeck(decks.attack),
    deckDefense: createDeck(decks.defense),
    handAttack: createHand(),
    handDefense: createHand(),
    cooldowns: {},
    lockoutMs: 0,
    playerIds,
    tactical: {
      mentality: "BALANCED",
      pressIntensity: 0.5,
      lineHeight: 0.5,
    },
  };
}

export function createInitialMatchState(args: CreateInitialMatchStateArgs): MatchState {
  const teamSize = args.teamSize ?? DEFAULT_TEAM_SIZE;
  const rng = new RNG(args.rngSeed);
  const players: Record<string, PlayerState> = {};

  const homePlayerIds = buildTeamPlayers(rng, "HOME", teamSize, players);
  const awayPlayerIds = buildTeamPlayers(rng, "AWAY", teamSize, players);

  const kickoffCarrierId = homePlayerIds.find((id) => players[id].role !== "GK") ?? homePlayerIds[0];
  const kickoffCarrier = players[kickoffCarrierId];

  return {
    timeMs: 0,
    durationMs: MATCH_DURATION_MS,
    phase: "KICKOFF",
    rngSeed: args.rngSeed,
    teamSize,
    score: { HOME: 0, AWAY: 0 },
    possession: {
      team: "HOME",
      lastTouchTeam: "HOME",
    },
    teams: {
      HOME: createTeamState("HOME", args.homeDecks, homePlayerIds),
      AWAY: createTeamState("AWAY", args.awayDecks, awayPlayerIds),
    },
    players,
    ball: {
      state: "KICKOFF",
      pos: { x: kickoffCarrier.pos.x, y: kickoffCarrier.pos.y },
      vel: { x: 0, y: 0 },
      targetPos: null,
      carrierId: kickoffCarrierId,
      lastTouchTeam: "HOME",
      carrierProtectedUntilMs: 0,
    },
    flow: {
      goalResetMsRemaining: 0,
      restartTeam: null,
    },
  };
}
