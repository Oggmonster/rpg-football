import playersCollection from "../../data/players.collection.json";
import { RNG } from "../../sim/math/RNG";

export type TeamId = "HOME" | "AWAY";
export type SideId = "LEFT" | "RIGHT";
export type MatchPhase = "LIVE" | "HALFTIME" | "FULLTIME";
export type TurnMode = "PLAYER_ATTACK" | "PLAYER_DEFENSE" | "HALFTIME" | "FULLTIME";
export type AttackCardKind = "PASS" | "DRIBBLE" | "SHOT";
export type DefenseCardKind = "BLOCK" | "TACKLE" | "MAN_MARK";
export type CardFamily = "ATTACK" | "DEFENSE";
export type MatchTacticId = "BALANCED" | "DIRECT" | "WING_PLAY" | "LOW_BLOCK";
export type DistanceTier = "LONG" | "MID" | "CLOSE";
export type SlotId =
  | "GK"
  | "LB"
  | "LCB"
  | "RCB"
  | "RB"
  | "LCM"
  | "CM"
  | "RCM"
  | "LW"
  | "ST"
  | "RW";

type RawPlayerRole = "GK" | "DEF" | "MID" | "FWD";

type RawCollectionPlayer = {
  id: string;
  name: string;
  role: RawPlayerRole;
  tacticalIdentity: string;
  stats: {
    pac: number;
    sho: number;
    pas: number;
    dri: number;
    def: number;
    phy: number;
  };
};

type AttackCardDef = {
  id: string;
  name: string;
  kind: AttackCardKind;
  description: string;
  preferredMinDistance: number;
  preferredMaxDistance: number;
  accuracy: number;
  flair: number;
  radius: number;
  requiredStars: number;
  shootingBoost: number;
};

type DefenseCardDef = {
  id: string;
  name: string;
  kind: DefenseCardKind;
  description: string;
  passStop: number;
  dribbleStop: number;
  shotStop: number;
  longBallStop: number;
};

type MatchCardDef = AttackCardDef | DefenseCardDef;

type TeamDeckState = {
  attackDraw: string[];
  attackDiscard: string[];
  defenseDraw: string[];
  defenseDiscard: string[];
};

type TeamRosterPlayer = {
  teamId: TeamId;
  playerId: string;
  name: string;
  role: RawPlayerRole;
  slotId: SlotId;
  stats: RawCollectionPlayer["stats"];
  tacticalIdentity: string;
  agility: number;
  blocking: number;
  skillStars: number;
  side: SideId;
  x: number;
  y: number;
  hasBall: boolean;
};

type TeamRosterState = {
  teamId: TeamId;
  label: string;
  lineup: Record<SlotId, TeamRosterPlayer>;
  bench: TeamRosterPlayer[];
  tactic: MatchTacticId;
  substitutionsUsed: number;
  decks: TeamDeckState;
};

type MatchStats = {
  successfulPasses: number;
  failedPasses: number;
  successfulDribbles: number;
  failedDribbles: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  tacklesWon: number;
  interceptions: number;
};

type CpuPendingAttack = {
  hand: string[];
  cardId: string;
};

type BallState = {
  holderId: string;
  teamId: TeamId;
  x: number;
  y: number;
};

type MatchState = {
  seed: number;
  phase: MatchPhase;
  half: 1 | 2;
  kickoffTeamFirstHalf: TeamId;
  currentRoundTeam: TeamId;
  attackRoundsThisHalf: Record<TeamId, number>;
  score: Record<TeamId, number>;
  ball: BallState;
  teams: Record<TeamId, TeamRosterState>;
  stats: Record<TeamId, MatchStats>;
  turnMode: TurnMode;
  currentHand: string[];
  cpuPendingAttack: CpuPendingAttack | null;
  winner: TeamId | "DRAW" | null;
  lastResolution: ActionResolutionView | null;
  commentaryFeed: string[];
};

export type MatchCardView = {
  id: string;
  name: string;
  family: CardFamily;
  kind: AttackCardKind | DefenseCardKind;
  description: string;
  requiredStars: number;
  radius: number;
};

export type PitchPlayerView = {
  playerId: string;
  teamId: TeamId;
  name: string;
  role: RawPlayerRole;
  slotId: SlotId;
  x: number;
  y: number;
  hasBall: boolean;
  stats: RawCollectionPlayer["stats"] & {
    agility: number;
    blocking: number;
    skillStars: number;
  };
  tacticalIdentity: string;
};

export type PassTargetView = {
  playerId: string;
  slotId: SlotId;
  name: string;
  x: number;
  y: number;
  chance: number;
  distance: number;
  laneRisk: number;
};

export type DribblePreviewView = {
  radius: number;
  chance: number;
};

export type ShotSetupView = {
  shooterId: string;
  shooterName: string;
  distanceTier: DistanceTier;
  laneBlockers: PitchPlayerView[];
  keeper: PitchPlayerView;
};

export type LineupPlayerView = {
  playerId: string;
  slotId: SlotId;
  name: string;
  role: RawPlayerRole;
  overall: number;
};

export type MatchStateView = {
  phase: MatchPhase;
  half: 1 | 2;
  score: Record<TeamId, number>;
  turnMode: TurnMode;
  possessionTeam: TeamId;
  currentRoundTeam: TeamId;
  attackRoundsThisHalf: Record<TeamId, number>;
  kickoffTeamFirstHalf: TeamId;
  currentHand: MatchCardView[];
  cpuPreviewCard: MatchCardView | null;
  teams: {
    id: TeamId;
    label: string;
    tactic: MatchTacticId;
    substitutionsUsed: number;
    lineup: LineupPlayerView[];
    bench: LineupPlayerView[];
  }[];
  pitchPlayers: PitchPlayerView[];
  ball: BallState;
  commentaryFeed: string[];
  winner: TeamId | "DRAW" | null;
  stats: Record<TeamId, MatchStats>;
  halftime: {
    canContinue: boolean;
    tactics: MatchTacticId[];
    substitutionsRemaining: number;
  } | null;
};

export type ActionResolutionView = {
  title: string;
  summary: string;
  commentary: string[];
  possessionAfter: TeamId;
  roundEnded: boolean;
  goalScored: boolean;
  attackingCard: MatchCardView | null;
  defendingCard: MatchCardView | null;
  cpuPreviewCard: MatchCardView | null;
  ball: BallState;
  animations: {
    playerId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }[];
};

export type ShotInput = {
  aimQuality: number;
  powerQuality: number;
};

export type AttackActionInput =
  | { type: "PASS"; targetPlayerId: string }
  | { type: "DRIBBLE"; targetX: number; targetY: number }
  | { type: "SHOT"; shot: ShotInput };

export type CardFootballEngineOptions = {
  rngSeed?: number;
  kickoffTeamFirstHalf?: TeamId;
};

const ATTACK_HAND_SIZE = 3;
const DEFENSE_HAND_SIZE = 3;
const ATTACK_ROUNDS_PER_HALF = 5;
const MAX_SUBSTITUTIONS = 3;
const PITCH_LENGTH = 100;
const PITCH_HEIGHT = 64;
const HOME_LABEL = "Blackflag City";
const AWAY_LABEL = "CPU Athletic";

const SLOT_ORDER: SlotId[] = ["GK", "LB", "LCB", "RCB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"];

const SLOT_TEMPLATE: Record<SlotId, { x: number; y: number; preferredRoles: RawPlayerRole[] }> = {
  GK: { x: 6, y: 32, preferredRoles: ["GK"] },
  LB: { x: 19, y: 10, preferredRoles: ["DEF", "MID"] },
  LCB: { x: 24, y: 23, preferredRoles: ["DEF", "MID"] },
  RCB: { x: 24, y: 41, preferredRoles: ["DEF", "MID"] },
  RB: { x: 19, y: 54, preferredRoles: ["DEF", "MID"] },
  LCM: { x: 41, y: 16, preferredRoles: ["MID", "DEF"] },
  CM: { x: 45, y: 32, preferredRoles: ["MID", "DEF"] },
  RCM: { x: 41, y: 48, preferredRoles: ["MID", "DEF"] },
  LW: { x: 63, y: 12, preferredRoles: ["FWD", "MID"] },
  ST: { x: 71, y: 32, preferredRoles: ["FWD", "MID"] },
  RW: { x: 63, y: 52, preferredRoles: ["FWD", "MID"] },
};

const TACTIC_LIST: MatchTacticId[] = ["BALANCED", "DIRECT", "WING_PLAY", "LOW_BLOCK"];

const TACTIC_MODIFIERS: Record<
  MatchTacticId,
  {
    pass: number;
    dribble: number;
    shot: number;
    width: number;
    depth: number;
    pressing: number;
  }
> = {
  BALANCED: { pass: 0, dribble: 0, shot: 0, width: 0, depth: 0, pressing: 0 },
  DIRECT: { pass: 4, dribble: -1, shot: 3, width: -2, depth: 6, pressing: 1 },
  WING_PLAY: { pass: 2, dribble: 2, shot: 0, width: 6, depth: 1, pressing: 0 },
  LOW_BLOCK: { pass: -1, dribble: -2, shot: -1, width: -3, depth: -6, pressing: 3 },
};

const ATTACK_CARDS: AttackCardDef[] = [
  {
    id: "SHORT_PASS",
    name: "Short Pass",
    kind: "PASS",
    description: "Quick circulation to a nearby teammate.",
    preferredMinDistance: 5,
    preferredMaxDistance: 18,
    accuracy: 8,
    flair: 1,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 0,
  },
  {
    id: "THREAD_PASS",
    name: "Thread Pass",
    kind: "PASS",
    description: "Splits a line if the lane is there.",
    preferredMinDistance: 10,
    preferredMaxDistance: 28,
    accuracy: 6,
    flair: 5,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 0,
  },
  {
    id: "SWITCH_PLAY",
    name: "Switch Play",
    kind: "PASS",
    description: "Long diagonal to the opposite side.",
    preferredMinDistance: 16,
    preferredMaxDistance: 40,
    accuracy: 5,
    flair: 4,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 0,
  },
  {
    id: "ONE_TWO",
    name: "One-Two",
    kind: "PASS",
    description: "Short give-and-go to unbalance the marker.",
    preferredMinDistance: 4,
    preferredMaxDistance: 16,
    accuracy: 7,
    flair: 3,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 1,
  },
  {
    id: "BODY_FEINT",
    name: "Body Feint",
    kind: "DRIBBLE",
    description: "Small touch, quick hips, keep moving.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 4,
    radius: 8,
    requiredStars: 2,
    shootingBoost: 0,
  },
  {
    id: "STEP_OVER",
    name: "Step Over",
    kind: "DRIBBLE",
    description: "Beat a defender with a sharper move.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 6,
    radius: 10,
    requiredStars: 3,
    shootingBoost: 0,
  },
  {
    id: "BURST_RUN",
    name: "Burst Run",
    kind: "DRIBBLE",
    description: "Knock and run into open grass.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 5,
    radius: 13,
    requiredStars: 1,
    shootingBoost: 0,
  },
  {
    id: "CUT_INSIDE",
    name: "Cut Inside",
    kind: "DRIBBLE",
    description: "Drive diagonally toward the middle.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 7,
    radius: 11,
    requiredStars: 4,
    shootingBoost: 1,
  },
  {
    id: "PLACED_SHOT",
    name: "Placed Shot",
    kind: "SHOT",
    description: "Guide it into the corner.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 0,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 6,
  },
  {
    id: "POWER_SHOT",
    name: "Power Shot",
    kind: "SHOT",
    description: "Hit through traffic with force.",
    preferredMinDistance: 0,
    preferredMaxDistance: 0,
    accuracy: 0,
    flair: 0,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 5,
  },
];

const DEFENSE_CARDS: DefenseCardDef[] = [
  { id: "LANE_BLOCK", name: "Lane Block", kind: "BLOCK", description: "Close the passing lane.", passStop: 7, dribbleStop: 1, shotStop: 2, longBallStop: 5 },
  { id: "SHOT_BLOCK", name: "Shot Block", kind: "BLOCK", description: "Sell out to smother the strike.", passStop: 1, dribbleStop: 0, shotStop: 9, longBallStop: 1 },
  { id: "LOW_BLOCK", name: "Low Block", kind: "BLOCK", description: "Protect the box and force patience.", passStop: 4, dribbleStop: 3, shotStop: 6, longBallStop: 4 },
  { id: "STAND_TACKLE", name: "Stand Tackle", kind: "TACKLE", description: "Step in at the right moment.", passStop: 1, dribbleStop: 8, shotStop: 2, longBallStop: 1 },
  { id: "SLIDE_TACKLE", name: "Slide Tackle", kind: "TACKLE", description: "Risky challenge with a high ceiling.", passStop: 0, dribbleStop: 10, shotStop: 1, longBallStop: 0 },
  { id: "DOUBLE_TEAM", name: "Double Team", kind: "TACKLE", description: "Collapse two defenders onto the ball.", passStop: 2, dribbleStop: 7, shotStop: 4, longBallStop: 1 },
  { id: "MAN_MARK", name: "Man Mark", kind: "MAN_MARK", description: "Stay touch-tight on runners.", passStop: 4, dribbleStop: 1, shotStop: 1, longBallStop: 9 },
  { id: "CUT_OFF_RUN", name: "Cut Off Run", kind: "MAN_MARK", description: "Track the run before the ball arrives.", passStop: 5, dribbleStop: 3, shotStop: 2, longBallStop: 8 },
  { id: "PRESS_TRAP", name: "Press Trap", kind: "MAN_MARK", description: "Invite the pass and spring the trap.", passStop: 6, dribbleStop: 5, shotStop: 2, longBallStop: 5 },
  { id: "SWEEP_COVER", name: "Sweep Cover", kind: "MAN_MARK", description: "Drop and guard the danger space.", passStop: 3, dribbleStop: 4, shotStop: 5, longBallStop: 6 },
];

const ATTACK_LOOKUP = new Map(ATTACK_CARDS.map((card) => [card.id, card]));
const DEFENSE_LOOKUP = new Map(DEFENSE_CARDS.map((card) => [card.id, card]));

const ATTACK_DECK_TEMPLATE = ATTACK_CARDS.flatMap((card) => [card.id, card.id, card.id]);
const DEFENSE_DECK_TEMPLATE = DEFENSE_CARDS.flatMap((card) => [card.id, card.id, card.id]);

const RAW_PLAYERS = (playersCollection.players as RawCollectionPlayer[]).map((player) => ({ ...player }));

export class CardFootballEngine {
  private readonly rng: RNG;
  private readonly state: MatchState;

  constructor(options: CardFootballEngineOptions = {}) {
    const seed = options.rngSeed ?? 1337;
    this.rng = new RNG(seed);
    const kickoffTeam = options.kickoffTeamFirstHalf ?? (this.rng.next() >= 0.5 ? "HOME" : "AWAY");
    const homeTeam = buildTeamRoster("HOME", HOME_LABEL, "LEFT", this.shuffle(RAW_PLAYERS, this.rng));
    const awayTeam = buildTeamRoster("AWAY", AWAY_LABEL, "RIGHT", this.shuffle(rotateArray(RAW_PLAYERS, 7), this.rng));

    this.state = {
      seed,
      phase: "LIVE",
      half: 1,
      kickoffTeamFirstHalf: kickoffTeam,
      currentRoundTeam: kickoffTeam,
      attackRoundsThisHalf: { HOME: 0, AWAY: 0 },
      score: { HOME: 0, AWAY: 0 },
      ball: {
        holderId: kickoffTeam === "HOME" ? homeTeam.lineup.CM.playerId : awayTeam.lineup.CM.playerId,
        teamId: kickoffTeam,
        x: 50,
        y: 32,
      },
      teams: {
        HOME: homeTeam,
        AWAY: awayTeam,
      },
      stats: {
        HOME: emptyStats(),
        AWAY: emptyStats(),
      },
      turnMode: "PLAYER_ATTACK",
      currentHand: [],
      cpuPendingAttack: null,
      winner: null,
      lastResolution: null,
      commentaryFeed: [],
    };

    this.repositionPlayers();
    this.startRound(kickoffTeam, `Coin toss: ${this.labelForTeam(kickoffTeam)} kick off the match.`);
  }

  getState(): MatchStateView {
    return {
      phase: this.state.phase,
      half: this.state.half,
      score: { ...this.state.score },
      turnMode: this.state.turnMode,
      possessionTeam: this.state.ball.teamId,
      currentRoundTeam: this.state.currentRoundTeam,
      attackRoundsThisHalf: { ...this.state.attackRoundsThisHalf },
      kickoffTeamFirstHalf: this.state.kickoffTeamFirstHalf,
      currentHand: this.state.currentHand.map((cardId) => this.toCardView(this.getCard(cardId))).filter(Boolean) as MatchCardView[],
      cpuPreviewCard: this.state.cpuPendingAttack ? this.toCardView(getAttackCard(this.state.cpuPendingAttack.cardId)) : null,
      teams: (["HOME", "AWAY"] as TeamId[]).map((teamId) => ({
        id: teamId,
        label: this.state.teams[teamId].label,
        tactic: this.state.teams[teamId].tactic,
        substitutionsUsed: this.state.teams[teamId].substitutionsUsed,
        lineup: SLOT_ORDER.map((slotId) => this.toLineupView(this.state.teams[teamId].lineup[slotId])),
        bench: this.state.teams[teamId].bench.map((player) => this.toLineupView(player)),
      })),
      pitchPlayers: this.getPitchPlayers(),
      ball: { ...this.state.ball },
      commentaryFeed: [...this.state.commentaryFeed],
      winner: this.state.winner,
      stats: {
        HOME: { ...this.state.stats.HOME },
        AWAY: { ...this.state.stats.AWAY },
      },
      halftime:
        this.state.phase === "HALFTIME"
          ? {
              canContinue: true,
              tactics: [...TACTIC_LIST],
              substitutionsRemaining: MAX_SUBSTITUTIONS - this.state.teams.HOME.substitutionsUsed,
            }
          : null,
    };
  }

  getLastResolution() {
    return this.state.lastResolution;
  }

  getPassTargets(cardId: string): PassTargetView[] {
    if (this.state.turnMode !== "PLAYER_ATTACK") {
      return [];
    }
    const card = getAttackCard(cardId);
    if (card.kind !== "PASS") {
      return [];
    }
    const ballHolder = this.getBallHolder();
    return this.getTeamPlayers("HOME")
      .filter((player) => player.playerId !== ballHolder.playerId)
      .map((target) => {
        const distanceValue = dist(ballHolder, target);
        const laneRisk = this.measureLaneRisk("HOME", ballHolder.x, ballHolder.y, target.x, target.y);
        const previewChance = this.previewPassChance(card, ballHolder, target, laneRisk);
        return {
          playerId: target.playerId,
          slotId: target.slotId,
          name: target.name,
          x: target.x,
          y: target.y,
          chance: previewChance,
          distance: round1(distanceValue),
          laneRisk: round1(laneRisk * 100),
        };
      })
      .sort((a, b) => b.chance - a.chance);
  }

  previewDribble(cardId: string, targetX: number, targetY: number): DribblePreviewView {
    const card = getAttackCard(cardId);
    if (card.kind !== "DRIBBLE") {
      throw new Error("Selected card is not a dribble card");
    }
    const holder = this.getBallHolder();
    const chance = this.resolveDribbleChance(card, holder, clamp(targetX, 0, PITCH_LENGTH), clamp(targetY, 0, PITCH_HEIGHT), null);
    return {
      radius: card.radius,
      chance,
    };
  }

  getShotSetup(cardId: string): ShotSetupView {
    const card = getAttackCard(cardId);
    if (card.kind !== "SHOT") {
      throw new Error("Selected card is not a shot card");
    }
    const shooter = this.getBallHolder();
    const opponents = this.getTeamPlayers("AWAY");
    const laneBlockers = opponents
      .filter((player) => player.slotId !== "GK")
      .filter((player) => this.distanceToShotLane(player, shooter) < 5.4)
      .sort((a, b) => this.distanceToShotLane(a, shooter) - this.distanceToShotLane(b, shooter))
      .slice(0, 4)
      .map((player) => this.toPitchPlayer(player));
    return {
      shooterId: shooter.playerId,
      shooterName: shooter.name,
      distanceTier: this.getDistanceTier(shooter),
      laneBlockers,
      keeper: this.toPitchPlayer(this.state.teams.AWAY.lineup.GK),
    };
  }

  playAttackCard(cardId: string, input: AttackActionInput): ActionResolutionView {
    if (this.state.turnMode !== "PLAYER_ATTACK") {
      throw new Error("It is not the player's attacking turn");
    }
    if (!this.state.currentHand.includes(cardId)) {
      throw new Error("Card is not currently in hand");
    }

    const attackingCard = getAttackCard(cardId);
    const defenseHand = this.drawCardsFor("AWAY", "DEFENSE", DEFENSE_HAND_SIZE);
    const defendingCard = this.chooseCpuDefenseCard(attackingCard, defenseHand);
    const before = this.capturePositions();

    let resolution: ActionResolutionView;
    if (attackingCard.kind === "PASS") {
      if (input.type !== "PASS") {
        throw new Error("Pass card requires a pass target");
      }
      resolution = this.resolvePass(attackingCard, defendingCard, input.targetPlayerId, before);
    } else if (attackingCard.kind === "DRIBBLE") {
      if (input.type !== "DRIBBLE") {
        throw new Error("Dribble card requires a dribble target");
      }
      resolution = this.resolveDribble(attackingCard, defendingCard, input.targetX, input.targetY, before);
    } else {
      if (input.type !== "SHOT") {
        throw new Error("Shot card requires shot input");
      }
      resolution = this.resolveShot(attackingCard, defendingCard, input.shot, before);
    }

    this.discardHand("HOME", "ATTACK", this.state.currentHand);
    this.discardHand("AWAY", "DEFENSE", defenseHand);
    this.afterAction(resolution);
    return resolution;
  }

  playDefenseCard(cardId: string): ActionResolutionView {
    if (this.state.turnMode !== "PLAYER_DEFENSE") {
      throw new Error("It is not the player's defending turn");
    }
    if (!this.state.currentHand.includes(cardId)) {
      throw new Error("Card is not currently in hand");
    }
    const cpuPending = this.state.cpuPendingAttack;
    if (!cpuPending) {
      throw new Error("CPU does not have a pending attack");
    }

    const attackingCard = getAttackCard(cpuPending.cardId);
    const defendingCard = getDefenseCard(cardId);
    const before = this.capturePositions();
    const resolution =
      attackingCard.kind === "PASS"
        ? this.resolveCpuPass(attackingCard, defendingCard, before)
        : attackingCard.kind === "DRIBBLE"
          ? this.resolveCpuDribble(attackingCard, defendingCard, before)
          : this.resolveCpuShot(attackingCard, defendingCard, before);

    this.discardHand("HOME", "DEFENSE", this.state.currentHand);
    this.discardHand("AWAY", "ATTACK", cpuPending.hand);
    this.state.cpuPendingAttack = null;
    this.afterAction(resolution);
    return resolution;
  }

  setHomeTactic(tactic: MatchTacticId) {
    if (this.state.phase !== "HALFTIME") {
      throw new Error("Tactics can only be changed at halftime");
    }
    this.state.teams.HOME.tactic = tactic;
    this.repositionPlayers();
  }

  makeHomeSubstitution(slotId: SlotId, benchPlayerId: string) {
    if (this.state.phase !== "HALFTIME") {
      throw new Error("Substitutions can only be made at halftime");
    }
    const team = this.state.teams.HOME;
    if (team.substitutionsUsed >= MAX_SUBSTITUTIONS) {
      throw new Error("No substitutions remaining");
    }
    const benchIndex = team.bench.findIndex((player) => player.playerId === benchPlayerId);
    if (benchIndex < 0) {
      throw new Error("Bench player not found");
    }

    const outgoing = team.lineup[slotId];
    const incoming = team.bench[benchIndex];
    team.lineup[slotId] = { ...incoming, slotId };
    team.bench[benchIndex] = { ...outgoing };
    team.substitutionsUsed += 1;
    this.repositionPlayers();
  }

  beginSecondHalf() {
    if (this.state.phase !== "HALFTIME") {
      throw new Error("Second half can only begin from halftime");
    }
    this.state.half = 2;
    this.state.phase = "LIVE";
    this.state.attackRoundsThisHalf = { HOME: 0, AWAY: 0 };
    this.state.teams.HOME.lineup = flipTeamSide(this.state.teams.HOME.lineup, "RIGHT");
    this.state.teams.AWAY.lineup = flipTeamSide(this.state.teams.AWAY.lineup, "LEFT");
    this.state.teams.HOME.bench = this.state.teams.HOME.bench.map((player) => ({ ...player, side: "RIGHT" }));
    this.state.teams.AWAY.bench = this.state.teams.AWAY.bench.map((player) => ({ ...player, side: "LEFT" }));
    this.repositionPlayers();
    this.startRound(oppositeTeam(this.state.kickoffTeamFirstHalf), "Second half. The teams switch ends and play restarts.");
  }

  private afterAction(resolution: ActionResolutionView) {
    this.state.commentaryFeed = resolution.commentary.slice(0, 4);
    this.state.lastResolution = resolution;

    if (this.state.phase === "FULLTIME" || this.state.phase === "HALFTIME") {
      this.state.turnMode = this.state.phase === "FULLTIME" ? "FULLTIME" : "HALFTIME";
      this.state.currentHand = [];
      this.state.cpuPendingAttack = null;
      return;
    }

    if (resolution.roundEnded) {
      const nextTeam = resolution.possessionAfter;
      if (this.state.attackRoundsThisHalf.HOME >= ATTACK_ROUNDS_PER_HALF && this.state.attackRoundsThisHalf.AWAY >= ATTACK_ROUNDS_PER_HALF) {
        if (this.state.half === 1) {
          this.state.phase = "HALFTIME";
          this.state.turnMode = "HALFTIME";
          this.state.currentHand = [];
          this.state.commentaryFeed = [
            "Halftime on the whistle.",
            "Make your tactical changes and use the bench.",
            "The team that did not start the first half will kick off the second.",
          ];
          this.autoAdjustCpuHalftime();
          return;
        }
        this.finishMatch();
        return;
      }
      this.startRound(nextTeam, resolution.summary);
      return;
    }

    this.prepareTurn();
  }

  private resolvePass(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, targetPlayerId: string, before: Map<string, { x: number; y: number }>) {
    const passer = this.getBallHolder();
    const target = this.findPlayer(targetPlayerId);
    if (!target || target.teamId !== "HOME") {
      throw new Error("Invalid pass target");
    }

    const laneRisk = this.measureLaneRisk("HOME", passer.x, passer.y, target.x, target.y);
    const previewChance = this.previewPassChance(attackingCard, passer, target, laneRisk);
    const defensePenalty = defendingCard.passStop + (dist(passer, target) > 22 ? defendingCard.longBallStop : 0);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pass - TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pressing;
    const chance = clamp(Math.round(previewChance + tacticBonus - defensePenalty), 5, 95);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.state.stats.HOME.successfulPasses += 1;
      this.state.ball.teamId = "HOME";
      this.state.ball.holderId = target.playerId;
      this.state.ball.x = target.x;
      this.state.ball.y = target.y;
      this.nudgeAttack("HOME", target.slotId, attackingCard.flair + 2);
      return this.buildResolution(before, {
        title: "Pass Complete",
        summary: `${passer.name} finds ${target.name}.`,
        commentary: [
          `${passer.name} scans the pitch and slides it into ${target.name}.`,
          `${target.name} checks toward the ball and takes it in stride.`,
          `${this.labelForTeam("HOME")} keep the move alive.`,
        ],
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const interceptor = this.pickInterceptor(target.x, target.y, "AWAY");
    this.state.stats.HOME.failedPasses += 1;
    this.state.stats.AWAY.interceptions += 1;
    this.state.ball.teamId = "AWAY";
    this.state.ball.holderId = interceptor.playerId;
    this.state.ball.x = interceptor.x;
    this.state.ball.y = interceptor.y;
    this.nudgeAttack("AWAY", interceptor.slotId, 2);
    return this.buildResolution(before, {
      title: "Intercepted",
      summary: `${target.name} cannot get there. ${interceptor.name} steps in.`,
      commentary: [
        `${passer.name} forces the pass and the lane closes in a heartbeat.`,
        `${interceptor.name} reads it and cuts the move out.`,
        `Turn over. ${this.labelForTeam("AWAY")} start a new attack.`,
      ],
      possessionAfter: "AWAY",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveCpuPass(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, before: Map<string, { x: number; y: number }>) {
    const passer = this.getBallHolder();
    const target = this.getCpuPassTargets(attackingCard)[0] ?? this.state.teams.AWAY.lineup.CM;
    const laneRisk = this.measureLaneRisk("AWAY", passer.x, passer.y, target.x, target.y);
    const previewChance = this.previewPassChance(attackingCard, passer, target, laneRisk);
    const defensePenalty = defendingCard.passStop + (dist(passer, target) > 22 ? defendingCard.longBallStop : 0);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pass - TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pressing;
    const chance = clamp(Math.round(previewChance + tacticBonus - defensePenalty), 5, 95);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.state.stats.AWAY.successfulPasses += 1;
      this.state.ball.teamId = "AWAY";
      this.state.ball.holderId = target.playerId;
      this.state.ball.x = target.x;
      this.state.ball.y = target.y;
      this.nudgeAttack("AWAY", target.slotId, attackingCard.flair + 2);
      return this.buildResolution(before, {
        title: "CPU Pass Complete",
        summary: `${passer.name} finds ${target.name}.`,
        commentary: [
          `The CPU spots the run and sends the pass into space.`,
          `${target.name} gets there cleanly before the press can land.`,
          `${this.labelForTeam("AWAY")} stay on the ball.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const interceptor = this.pickInterceptor(target.x, target.y, "HOME");
    this.state.stats.AWAY.failedPasses += 1;
    this.state.stats.HOME.interceptions += 1;
    this.state.ball.teamId = "HOME";
    this.state.ball.holderId = interceptor.playerId;
    this.state.ball.x = interceptor.x;
    this.state.ball.y = interceptor.y;
    this.nudgeAttack("HOME", interceptor.slotId, 2);
    return this.buildResolution(before, {
      title: "Interception",
      summary: `${interceptor.name} jumps the pass.`,
      commentary: [
        `The CPU tries to force it through traffic.`,
        `${interceptor.name} has read it the whole way and cuts in front.`,
        `Turn over. ${this.labelForTeam("HOME")} break the other way.`,
      ],
      possessionAfter: "HOME",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveDribble(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, targetX: number, targetY: number, before: Map<string, { x: number; y: number }>) {
    const holder = this.getBallHolder();
    const clampedTarget = clampDribbleTarget(holder, targetX, targetY, attackingCard.radius);
    const chance = this.resolveDribbleChance(attackingCard, holder, clampedTarget.x, clampedTarget.y, defendingCard);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.state.stats.HOME.successfulDribbles += 1;
      this.state.ball.x = clampedTarget.x;
      this.state.ball.y = clampedTarget.y;
      this.mutateLineupPlayer(holder.playerId, (player) => {
        player.x = clampedTarget.x;
        player.y = clampedTarget.y;
      });
      this.nudgeAttack("HOME", holder.slotId, attackingCard.flair + 3);
      return this.buildResolution(before, {
        title: "Dribble Won",
        summary: `${holder.name} skips away from the challenge.`,
        commentary: [
          `${holder.name} squares the defender up and goes.`,
          `A sharp touch opens a lane and the move keeps flowing.`,
          `${this.labelForTeam("HOME")} stay in command.`,
        ],
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const tackler = this.pickNearestDefender(clampedTarget.x, clampedTarget.y, "AWAY");
    this.state.stats.HOME.failedDribbles += 1;
    this.state.stats.AWAY.tacklesWon += 1;
    this.state.ball.teamId = "AWAY";
    this.state.ball.holderId = tackler.playerId;
    this.state.ball.x = tackler.x;
    this.state.ball.y = tackler.y;
    this.nudgeAttack("AWAY", tackler.slotId, 2);
    return this.buildResolution(before, {
      title: "Tackle Won",
      summary: `${tackler.name} strips the ball away.`,
      commentary: [
        `${holder.name} tries to force the dribble through traffic.`,
        `${tackler.name} times the challenge and wins it cleanly.`,
        `Turn over. ${this.labelForTeam("AWAY")} have the next round.`,
      ],
      possessionAfter: "AWAY",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveCpuDribble(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, before: Map<string, { x: number; y: number }>) {
    const holder = this.getBallHolder();
    const target = this.pickCpuDribbleTarget(holder, attackingCard);
    const chance = this.resolveDribbleChance(attackingCard, holder, target.x, target.y, defendingCard);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.state.stats.AWAY.successfulDribbles += 1;
      this.state.ball.x = target.x;
      this.state.ball.y = target.y;
      this.mutateLineupPlayer(holder.playerId, (player) => {
        player.x = target.x;
        player.y = target.y;
      });
      this.nudgeAttack("AWAY", holder.slotId, attackingCard.flair + 3);
      return this.buildResolution(before, {
        title: "CPU Dribble",
        summary: `${holder.name} beats the first challenge.`,
        commentary: [
          `${holder.name} faces up, shifts the ball, and drives into the gap.`,
          `The defensive line is scrambling back toward goal.`,
          `${this.labelForTeam("AWAY")} keep the round going.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const tackler = this.pickNearestDefender(target.x, target.y, "HOME");
    this.state.stats.AWAY.failedDribbles += 1;
    this.state.stats.HOME.tacklesWon += 1;
    this.state.ball.teamId = "HOME";
    this.state.ball.holderId = tackler.playerId;
    this.state.ball.x = tackler.x;
    this.state.ball.y = tackler.y;
    this.nudgeAttack("HOME", tackler.slotId, 2);
    return this.buildResolution(before, {
      title: "Turnover Won",
      summary: `${tackler.name} takes it away.`,
      commentary: [
        `The CPU tries to carry through pressure.`,
        `${tackler.name} steps in and leaves with the ball.`,
        `Turn over. ${this.labelForTeam("HOME")} get the next attack.`,
      ],
      possessionAfter: "HOME",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveShot(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, shot: ShotInput, before: Map<string, { x: number; y: number }>) {
    const shooter = this.getBallHolder();
    const keeper = this.state.teams.AWAY.lineup.GK;
    const laneBlockers = this.getTeamPlayers("AWAY").filter((player) => player.slotId !== "GK" && this.distanceToShotLane(player, shooter) < 5.6);
    const distanceTier = this.getDistanceTier(shooter);
    const distancePenalty = distanceTier === "CLOSE" ? 0 : distanceTier === "MID" ? 8 : 18;
    const blockerPenalty = laneBlockers.reduce((sum, player) => sum + player.blocking / 34, 0);
    const cardPenalty = defendingCard.shotStop + laneBlockers.length * (defendingCard.kind === "BLOCK" ? 1.6 : 0.5);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.HOME.tactic].shot - TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pressing;
    const raw =
      18 +
      shooter.stats.sho * 0.55 +
      shooter.agility * 0.18 +
      attackingCard.shootingBoost * 2.6 +
      clamp01(shot.aimQuality) * 18 +
      clamp01(shot.powerQuality) * 14 +
      tacticBonus * 2 -
      distancePenalty -
      blockerPenalty * 4 -
      cardPenalty * 3 -
      keeper.blocking * 0.38;
    const goalChance = clamp(Math.round(raw / 2.3), 4, 92);
    const onTargetChance = clamp(Math.round(goalChance + clamp01(shot.aimQuality) * 15 - 5), 10, 97);
    const onTarget = this.rng.int(1, 100) <= onTargetChance;
    const goal = onTarget && this.rng.int(1, 100) <= goalChance;
    this.state.stats.HOME.shots += 1;

    if (goal) {
      this.state.stats.HOME.shotsOnTarget += 1;
      this.state.stats.HOME.goals += 1;
      this.state.score.HOME += 1;
      return this.handleGoal(before, "HOME", shooter, attackingCard, defendingCard);
    }

    if (onTarget) {
      this.state.stats.HOME.shotsOnTarget += 1;
      this.state.ball.teamId = "AWAY";
      this.state.ball.holderId = keeper.playerId;
      this.state.ball.x = keeper.x;
      this.state.ball.y = keeper.y;
      this.nudgeAttack("AWAY", "GK", 1);
      return this.buildResolution(before, {
        title: "Saved",
        summary: `${keeper.name} gets behind it.`,
        commentary: [
          `${shooter.name} gets the shot away through bodies in the box.`,
          `${keeper.name} tracks it and beats it away to safety.`,
          `The attack is over. ${this.labelForTeam("AWAY")} take the next round.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.state.ball.teamId = "AWAY";
    this.state.ball.holderId = keeper.playerId;
    this.state.ball.x = keeper.x;
    this.state.ball.y = keeper.y;
    this.nudgeAttack("AWAY", "GK", 1);
    return this.buildResolution(before, {
      title: "Off Target",
      summary: `${shooter.name} cannot keep it down.`,
      commentary: [
        `${shooter.name} tries to whip it beyond the keeper.`,
        `Too much on it. The ball flies beyond the frame.`,
        `Goal kick feeling, and ${this.labelForTeam("AWAY")} restart the next round.`,
      ],
      possessionAfter: "AWAY",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveCpuShot(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, before: Map<string, { x: number; y: number }>) {
    const shooter = this.getBallHolder();
    const keeper = this.state.teams.HOME.lineup.GK;
    const laneBlockers = this.getTeamPlayers("HOME").filter((player) => player.slotId !== "GK" && this.distanceToShotLane(player, shooter) < 5.6);
    const distanceTier = this.getDistanceTier(shooter);
    const distancePenalty = distanceTier === "CLOSE" ? 0 : distanceTier === "MID" ? 8 : 18;
    const blockerPenalty = laneBlockers.reduce((sum, player) => sum + player.blocking / 34, 0);
    const cardPenalty = defendingCard.shotStop + laneBlockers.length * (defendingCard.kind === "BLOCK" ? 1.6 : 0.5);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].shot - TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pressing;
    const raw =
      18 +
      shooter.stats.sho * 0.55 +
      shooter.agility * 0.18 +
      attackingCard.shootingBoost * 2.6 +
      this.rng.next() * 18 +
      this.rng.next() * 12 +
      tacticBonus * 2 -
      distancePenalty -
      blockerPenalty * 4 -
      cardPenalty * 3 -
      keeper.blocking * 0.38;
    const goalChance = clamp(Math.round(raw / 2.3), 4, 92);
    const onTargetChance = clamp(Math.round(goalChance + 12), 10, 97);
    const onTarget = this.rng.int(1, 100) <= onTargetChance;
    const goal = onTarget && this.rng.int(1, 100) <= goalChance;
    this.state.stats.AWAY.shots += 1;

    if (goal) {
      this.state.stats.AWAY.shotsOnTarget += 1;
      this.state.stats.AWAY.goals += 1;
      this.state.score.AWAY += 1;
      return this.handleGoal(before, "AWAY", shooter, attackingCard, defendingCard);
    }

    if (onTarget) {
      this.state.stats.AWAY.shotsOnTarget += 1;
      this.state.ball.teamId = "HOME";
      this.state.ball.holderId = keeper.playerId;
      this.state.ball.x = keeper.x;
      this.state.ball.y = keeper.y;
      this.nudgeAttack("HOME", "GK", 1);
      return this.buildResolution(before, {
        title: "Save Made",
        summary: `${keeper.name} keeps it out.`,
        commentary: [
          `The CPU catches a glimpse of the goal and pulls the trigger.`,
          `${keeper.name} reads it and turns the shot away.`,
          `The round ends with ${this.labelForTeam("HOME")} back on the ball.`,
        ],
        possessionAfter: "HOME",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.state.ball.teamId = "HOME";
    this.state.ball.holderId = keeper.playerId;
    this.state.ball.x = keeper.x;
    this.state.ball.y = keeper.y;
    this.nudgeAttack("HOME", "GK", 1);
    return this.buildResolution(before, {
      title: "Missed",
      summary: `${shooter.name} drags it wide.`,
      commentary: [
        `The CPU goes for goal from range.`,
        `It never troubles the goalkeeper and whistles beyond the post.`,
        `The round ends. ${this.labelForTeam("HOME")} reset and attack next.`,
      ],
      possessionAfter: "HOME",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private handleGoal(
    before: Map<string, { x: number; y: number }>,
    scoringTeam: TeamId,
    shooter: TeamRosterPlayer,
    attackingCard: AttackCardDef,
    defendingCard: DefenseCardDef
  ) {
    const concedingTeam = oppositeTeam(scoringTeam);
    this.state.ball.teamId = concedingTeam;
    this.state.ball.holderId = this.state.teams[concedingTeam].lineup.CM.playerId;
    this.state.ball.x = 50;
    this.state.ball.y = 32;
    this.repositionPlayers();
    return this.buildResolution(before, {
      title: "Goal",
      summary: `${shooter.name} scores for ${this.labelForTeam(scoringTeam)}.`,
      commentary: [
        `${shooter.name} strikes it cleanly and the keeper is beaten.`,
        `Goal for ${this.labelForTeam(scoringTeam)}.`,
        `${this.labelForTeam(concedingTeam)} will kick off the next round.`,
      ],
      possessionAfter: concedingTeam,
      roundEnded: true,
      goalScored: true,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private buildResolution(
    before: Map<string, { x: number; y: number }>,
    data: Omit<ActionResolutionView, "animations" | "ball" | "cpuPreviewCard">
  ): ActionResolutionView {
    this.repositionPlayers();
    const animations = this.getPitchPlayers().map((player) => {
      const previous = before.get(player.playerId) ?? { x: player.x, y: player.y };
      return {
        playerId: player.playerId,
        fromX: previous.x,
        fromY: previous.y,
        toX: player.x,
        toY: player.y,
      };
    });
    return {
      ...data,
      cpuPreviewCard: this.state.cpuPendingAttack ? this.toCardView(getAttackCard(this.state.cpuPendingAttack.cardId)) : null,
      ball: { ...this.state.ball },
      animations,
    };
  }

  private startRound(teamId: TeamId, openingLine: string) {
    this.state.currentRoundTeam = teamId;
    this.state.attackRoundsThisHalf[teamId] += 1;
    this.state.ball.teamId = teamId;
    this.state.ball.holderId = this.state.teams[teamId].lineup.CM.playerId;
    this.state.ball.x = 50;
    this.state.ball.y = 32;
    this.repositionPlayers();
    this.state.commentaryFeed = [openingLine];
    this.prepareTurn();
  }

  private prepareTurn() {
    if (this.state.phase !== "LIVE") {
      return;
    }
    if (this.state.ball.teamId === "HOME") {
      this.state.turnMode = "PLAYER_ATTACK";
      this.state.currentHand = this.drawCardsFor("HOME", "ATTACK", ATTACK_HAND_SIZE);
      this.state.cpuPendingAttack = null;
      return;
    }
    this.state.turnMode = "PLAYER_DEFENSE";
    this.state.currentHand = this.drawCardsFor("HOME", "DEFENSE", DEFENSE_HAND_SIZE);
    const cpuHand = this.drawCardsFor("AWAY", "ATTACK", ATTACK_HAND_SIZE);
    this.state.cpuPendingAttack = {
      hand: cpuHand,
      cardId: this.chooseCpuAttackCard(cpuHand),
    };
  }

  private finishMatch() {
    this.state.phase = "FULLTIME";
    this.state.turnMode = "FULLTIME";
    this.state.currentHand = [];
    this.state.cpuPendingAttack = null;
    if (this.state.score.HOME > this.state.score.AWAY) {
      this.state.winner = "HOME";
    } else if (this.state.score.AWAY > this.state.score.HOME) {
      this.state.winner = "AWAY";
    } else {
      this.state.winner = "DRAW";
    }
    this.state.commentaryFeed = [
      "Full time.",
      `${this.labelForTeam("HOME")} ${this.state.score.HOME} - ${this.state.score.AWAY} ${this.labelForTeam("AWAY")}.`,
      this.state.winner === "DRAW" ? "It finishes level." : `${this.labelForTeam(this.state.winner)} take the match.`,
    ];
  }

  private autoAdjustCpuHalftime() {
    const cpuTeam = this.state.teams.AWAY;
    if (this.state.score.AWAY < this.state.score.HOME) {
      cpuTeam.tactic = "DIRECT";
    } else if (this.state.score.AWAY > this.state.score.HOME) {
      cpuTeam.tactic = "LOW_BLOCK";
    } else {
      cpuTeam.tactic = "BALANCED";
    }
  }

  private drawCardsFor(teamId: TeamId, family: CardFamily, amount: number) {
    const decks = this.state.teams[teamId].decks;
    const drawKey = family === "ATTACK" ? "attackDraw" : "defenseDraw";
    const discardKey = family === "ATTACK" ? "attackDiscard" : "defenseDiscard";
    while (decks[drawKey].length < amount) {
      if (decks[discardKey].length === 0) {
        break;
      }
      decks[drawKey] = this.shuffle(decks[discardKey], this.rng);
      decks[discardKey] = [];
    }
    return decks[drawKey].splice(0, amount);
  }

  private discardHand(teamId: TeamId, family: CardFamily, hand: string[]) {
    const decks = this.state.teams[teamId].decks;
    if (family === "ATTACK") {
      decks.attackDiscard.push(...hand);
      return;
    }
    decks.defenseDiscard.push(...hand);
  }

  private chooseCpuDefenseCard(attackingCard: AttackCardDef, hand: string[]) {
    const ranked = hand
      .map((cardId) => getDefenseCard(cardId))
      .sort((a, b) => this.scoreDefenseFit(b, attackingCard) - this.scoreDefenseFit(a, attackingCard));
    return ranked[0];
  }

  private chooseCpuAttackCard(hand: string[]) {
    const holder = this.getBallHolder();
    const distanceTier = this.getDistanceTier(holder);
    const ranked = hand
      .map((cardId) => getAttackCard(cardId))
      .sort((a, b) => this.scoreAttackFit(b, distanceTier, holder) - this.scoreAttackFit(a, distanceTier, holder));
    return ranked[0]?.id ?? hand[0];
  }

  private scoreDefenseFit(card: DefenseCardDef, attackCard: AttackCardDef) {
    if (attackCard.kind === "PASS") {
      return card.passStop + card.longBallStop;
    }
    if (attackCard.kind === "DRIBBLE") {
      return card.dribbleStop + (card.kind === "TACKLE" ? 3 : 0);
    }
    return card.shotStop + (card.kind === "BLOCK" ? 4 : 0);
  }

  private scoreAttackFit(card: AttackCardDef, distanceTier: DistanceTier, holder: TeamRosterPlayer) {
    if (card.kind === "SHOT") {
      return distanceTier === "CLOSE" ? 30 + card.shootingBoost : distanceTier === "MID" ? 18 + card.shootingBoost : 8 + card.shootingBoost;
    }
    if (card.kind === "DRIBBLE") {
      return holder.skillStars * 3 + card.flair + (distanceTier === "LONG" ? 3 : 1);
    }
    return card.accuracy + card.flair + (distanceTier === "LONG" ? 4 : 2);
  }

  private getCpuPassTargets(card: AttackCardDef) {
    const holder = this.getBallHolder();
    return this.getTeamPlayers("AWAY")
      .filter((player) => player.playerId !== holder.playerId)
      .map((player) => ({
        player,
        score: this.previewPassChance(card, holder, player, this.measureLaneRisk("AWAY", holder.x, holder.y, player.x, player.y)),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.player);
  }

  private resolveDribbleChance(
    card: AttackCardDef,
    holder: TeamRosterPlayer,
    targetX: number,
    targetY: number,
    defenseCard: DefenseCardDef | null
  ) {
    const distanceValue = distance(holder.x, holder.y, targetX, targetY);
    const defendingTeam = holder.teamId === "HOME" ? "AWAY" : "HOME";
    const nearestDefender = this.pickNearestDefender(targetX, targetY, defendingTeam);
    const attackDirection = this.getAttackDirection(holder.teamId);
    const progress = attackDirection === "RIGHT" ? targetX - holder.x : holder.x - targetX;
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams[holder.teamId].tactic].dribble - TACTIC_MODIFIERS[this.state.teams[defendingTeam].tactic].pressing;
    const defensePenalty = defenseCard ? defenseCard.dribbleStop * 3 : 0;
    const starPenalty = Math.max(0, card.requiredStars - holder.skillStars) * 8;
    const chance =
      34 +
      holder.stats.dri * 0.46 +
      holder.stats.pac * 0.25 +
      card.flair * 3 +
      progress * 1.4 +
      tacticBonus * 2 -
      distanceValue * 1.8 -
      nearestDefender.blocking * 0.32 -
      defensePenalty -
      starPenalty;
    return clamp(Math.round(chance / 2), 4, 95);
  }

  private previewPassChance(card: AttackCardDef, passer: TeamRosterPlayer, target: TeamRosterPlayer, laneRisk: number) {
    const distanceValue = dist(passer, target);
    const idealPenalty =
      distanceValue < card.preferredMinDistance
        ? (card.preferredMinDistance - distanceValue) * 1.8
        : distanceValue > card.preferredMaxDistance
          ? (distanceValue - card.preferredMaxDistance) * 1.8
          : 0;
    const chance =
      28 +
      passer.stats.pas * 0.42 +
      target.agility * 0.24 +
      card.accuracy * 2.5 +
      card.flair -
      idealPenalty -
      laneRisk * 100 * 0.48;
    return clamp(Math.round(chance / 2), 5, 95);
  }

  private measureLaneRisk(teamId: TeamId, fromX: number, fromY: number, toX: number, toY: number) {
    const defenders = this.getTeamPlayers(oppositeTeam(teamId)).filter((player) => player.slotId !== "GK");
    let risk = 0;
    for (const defender of defenders) {
      const proximity = distancePointToSegment(defender.x, defender.y, fromX, fromY, toX, toY);
      if (proximity > 8) continue;
      const alongLane = projectionOnSegment(defender.x, defender.y, fromX, fromY, toX, toY);
      if (alongLane <= 0.08 || alongLane >= 0.92) continue;
      risk += (1 - proximity / 8) * (defender.blocking / 100) * 0.34;
    }
    return clamp(risk, 0, 1);
  }

  private distanceToShotLane(player: TeamRosterPlayer, shooter: TeamRosterPlayer) {
    const goalX = this.getAttackDirection(shooter.teamId) === "RIGHT" ? 100 : 0;
    return distancePointToSegment(player.x, player.y, shooter.x, shooter.y, goalX, 32);
  }

  private pickNearestDefender(x: number, y: number, teamId: TeamId) {
    return this.getTeamPlayers(teamId)
      .filter((player) => player.slotId !== "GK")
      .slice()
      .sort((a, b) => distance(a.x, a.y, x, y) - distance(b.x, b.y, x, y))[0];
  }

  private pickInterceptor(targetX: number, targetY: number, teamId: TeamId) {
    const candidates = this.getTeamPlayers(teamId).filter((player) => player.slotId !== "GK");
    return (
      candidates
        .slice()
        .sort(
          (a, b) =>
            distance(a.x, a.y, targetX, targetY) - a.blocking * 0.08 - (distance(b.x, b.y, targetX, targetY) - b.blocking * 0.08)
        )[0] ?? this.state.teams[teamId].lineup.CM
    );
  }

  private pickCpuDribbleTarget(holder: TeamRosterPlayer, card: AttackCardDef) {
    const direction = this.getAttackDirection("AWAY") === "RIGHT" ? 1 : -1;
    const candidates = [
      { x: holder.x + direction * card.radius, y: holder.y },
      { x: holder.x + direction * (card.radius - 2), y: holder.y - 6 },
      { x: holder.x + direction * (card.radius - 2), y: holder.y + 6 },
    ]
      .map((point) => ({
        x: clamp(point.x, 2, 98),
        y: clamp(point.y, 4, 60),
      }))
      .map((point) => ({
        ...point,
        score: this.resolveDribbleChance(card, holder, point.x, point.y, null),
      }))
      .sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  private getDistanceTier(player: TeamRosterPlayer): DistanceTier {
    const attackDirection = this.getAttackDirection(player.teamId);
    const distanceToGoal = attackDirection === "RIGHT" ? 100 - player.x : player.x;
    if (distanceToGoal <= 16) return "CLOSE";
    if (distanceToGoal <= 31) return "MID";
    return "LONG";
  }

  private getAttackDirection(teamId: TeamId): SideId {
    const side = this.state.teams[teamId].lineup.GK.side;
    return side === "LEFT" ? "RIGHT" : "LEFT";
  }

  private nudgeAttack(teamId: TeamId, focalSlot: SlotId, intensity: number) {
    const player = this.state.teams[teamId].lineup[focalSlot];
    const direction = this.getAttackDirection(teamId) === "RIGHT" ? 1 : -1;
    this.state.ball.teamId = teamId;
    this.state.ball.holderId = player.playerId;
    this.state.ball.x = clamp(player.x + direction * Math.max(1, intensity * 0.35), 2, 98);
    this.state.ball.y = clamp(player.y, 4, 60);
  }

  private capturePositions() {
    return new Map(this.getPitchPlayers().map((player) => [player.playerId, { x: player.x, y: player.y }]));
  }

  private repositionPlayers() {
    const possessionTeam = this.state.ball.teamId;
    const ballSide = this.getAttackDirection(possessionTeam);
    const ballProgress = ballSide === "RIGHT" ? Math.max(0, this.state.ball.x - 50) / 50 : Math.max(0, 50 - this.state.ball.x) / 50;
    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      const team = this.state.teams[teamId];
      const attackDirection = this.getAttackDirection(teamId);
      const tactic = TACTIC_MODIFIERS[team.tactic];
      const onBall = teamId === possessionTeam;
      for (const slotId of SLOT_ORDER) {
        const player = team.lineup[slotId];
        const template = SLOT_TEMPLATE[slotId];
        const baseX = player.side === "LEFT" ? template.x : PITCH_LENGTH - template.x;
        const centeredY = template.y - 32;
        const widthAdjust = centeredY > 0 ? tactic.width : -tactic.width;
        let nextX = baseX;
        let nextY = template.y + widthAdjust * 0.25;

        if (slotId !== "GK") {
          if (onBall) {
            const push = ballProgress * (8 + tactic.depth * 0.5);
            nextX += attackDirection === "RIGHT" ? push : -push;
          } else {
            const squeeze = ballProgress * (6 + tactic.pressing * 0.5);
            nextX += attackDirection === "RIGHT" ? squeeze : -squeeze;
          }
        }

        player.x = round1(clamp(nextX, 4, 96));
        player.y = round1(clamp(nextY, 4, 60));
        player.hasBall = false;
      }
    }

    const holder = this.findPlayer(this.state.ball.holderId);
    if (holder) {
      holder.x = round1(this.state.ball.x);
      holder.y = round1(this.state.ball.y);
      holder.hasBall = true;
    }
  }

  private getPitchPlayers(): PitchPlayerView[] {
    return (["HOME", "AWAY"] as TeamId[]).flatMap((teamId) => SLOT_ORDER.map((slotId) => this.toPitchPlayer(this.state.teams[teamId].lineup[slotId])));
  }

  private getTeamPlayers(teamId: TeamId) {
    return SLOT_ORDER.map((slotId) => this.state.teams[teamId].lineup[slotId]);
  }

  private getBallHolder() {
    const holder = this.findPlayer(this.state.ball.holderId);
    if (!holder) {
      throw new Error("Ball holder not found");
    }
    return holder;
  }

  private findPlayer(playerId: string) {
    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      for (const slotId of SLOT_ORDER) {
        const player = this.state.teams[teamId].lineup[slotId];
        if (player.playerId === playerId) return player;
      }
      for (const player of this.state.teams[teamId].bench) {
        if (player.playerId === playerId) return player;
      }
    }
    return null;
  }

  private mutateLineupPlayer(playerId: string, updater: (player: TeamRosterPlayer) => void) {
    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      for (const slotId of SLOT_ORDER) {
        const player = this.state.teams[teamId].lineup[slotId];
        if (player.playerId !== playerId) continue;
        updater(player);
        return;
      }
    }
  }

  private getCard(cardId: string) {
    return ATTACK_LOOKUP.get(cardId) ?? DEFENSE_LOOKUP.get(cardId) ?? null;
  }

  private toCardView(card: MatchCardDef | null): MatchCardView | null {
    if (!card) return null;
    const family: CardFamily = ATTACK_LOOKUP.has(card.id) ? "ATTACK" : "DEFENSE";
    return {
      id: card.id,
      name: card.name,
      family,
      kind: card.kind,
      description: card.description,
      requiredStars: "requiredStars" in card ? card.requiredStars : 0,
      radius: "radius" in card ? card.radius : 0,
    };
  }

  private toPitchPlayer(player: TeamRosterPlayer): PitchPlayerView {
    return {
      playerId: player.playerId,
      teamId: player.teamId,
      name: player.name,
      role: player.role,
      slotId: player.slotId,
      x: player.x,
      y: player.y,
      hasBall: player.hasBall,
      stats: {
        ...player.stats,
        agility: player.agility,
        blocking: player.blocking,
        skillStars: player.skillStars,
      },
      tacticalIdentity: player.tacticalIdentity,
    };
  }

  private toLineupView(player: TeamRosterPlayer): LineupPlayerView {
    return {
      playerId: player.playerId,
      slotId: player.slotId,
      name: player.name,
      role: player.role,
      overall: Math.round((player.stats.pac + player.stats.sho + player.stats.pas + player.stats.dri + player.stats.def + player.stats.phy) / 6),
    };
  }

  private labelForTeam(teamId: TeamId) {
    return this.state.teams[teamId].label;
  }

  private shuffle<T>(values: readonly T[], rng: RNG) {
    const out = [...values];
    for (let index = out.length - 1; index > 0; index -= 1) {
      const swapIndex = rng.int(0, index);
      [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
    }
    return out;
  }
}

function getAttackCard(cardId: string) {
  const card = ATTACK_LOOKUP.get(cardId);
  if (!card) {
    throw new Error(`Unknown attack card ${cardId}`);
  }
  return card;
}

function getDefenseCard(cardId: string) {
  const card = DEFENSE_LOOKUP.get(cardId);
  if (!card) {
    throw new Error(`Unknown defense card ${cardId}`);
  }
  return card;
}

function buildTeamRoster(teamId: TeamId, label: string, side: SideId, rawPlayers: RawCollectionPlayer[]): TeamRosterState {
  const available = rawPlayers.map((player, index) => ({ ...player, uniqueKey: `${teamId}_${player.id}_${index}` }));
  const lineup = {} as Record<SlotId, TeamRosterPlayer>;
  for (const slotId of SLOT_ORDER) {
    const chosen = pickBestFit(available, SLOT_TEMPLATE[slotId].preferredRoles, slotId);
    lineup[slotId] = createRosterPlayer(teamId, slotId, chosen, side);
    available.splice(available.findIndex((player) => player.uniqueKey === chosen.uniqueKey), 1);
  }
  const bench = available.slice(0, 5).map((player) => createRosterPlayer(teamId, "CM", player, side));
  return {
    teamId,
    label,
    lineup,
    bench,
    tactic: teamId === "HOME" ? "BALANCED" : "WING_PLAY",
    substitutionsUsed: 0,
    decks: {
      attackDraw: shuffleArray(ATTACK_DECK_TEMPLATE),
      attackDiscard: [],
      defenseDraw: shuffleArray(DEFENSE_DECK_TEMPLATE),
      defenseDiscard: [],
    },
  };
}

function createRosterPlayer(
  teamId: TeamId,
  slotId: SlotId,
  rawPlayer: RawCollectionPlayer & { uniqueKey?: string },
  side: SideId
): TeamRosterPlayer {
  return {
    teamId,
    playerId: toPlayerId(teamId, slotId, rawPlayer.id),
    name: rawPlayer.name,
    role: rawPlayer.role,
    slotId,
    stats: { ...rawPlayer.stats },
    tacticalIdentity: rawPlayer.tacticalIdentity,
    agility: Math.round((rawPlayer.stats.pac + rawPlayer.stats.dri) / 2),
    blocking: Math.round((rawPlayer.stats.def + rawPlayer.stats.phy) / 2),
    skillStars: clamp(Math.round(rawPlayer.stats.dri / 18), 1, 5),
    side,
    x: 0,
    y: 0,
    hasBall: false,
  };
}

function pickBestFit(
  players: Array<RawCollectionPlayer & { uniqueKey: string }>,
  preferredRoles: RawPlayerRole[],
  slotId: SlotId
) {
  const scored = players
    .map((player) => ({
      player,
      score: roleFitScore(player.role, preferredRoles) + slotStatBonus(slotId, player),
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.player ?? players[0];
}

function roleFitScore(role: RawPlayerRole, preferredRoles: RawPlayerRole[]) {
  const index = preferredRoles.indexOf(role);
  if (index === 0) return 40;
  if (index === 1) return 24;
  return 10;
}

function slotStatBonus(slotId: SlotId, player: RawCollectionPlayer) {
  switch (slotId) {
    case "GK":
      return player.stats.def * 0.8 + player.stats.phy * 0.3;
    case "LB":
    case "RB":
      return player.stats.pac * 0.4 + player.stats.def * 0.45 + player.stats.pas * 0.15;
    case "LCB":
    case "RCB":
      return player.stats.def * 0.55 + player.stats.phy * 0.3 + player.stats.pas * 0.15;
    case "LCM":
    case "CM":
    case "RCM":
      return player.stats.pas * 0.35 + player.stats.dri * 0.25 + player.stats.def * 0.15 + player.stats.pac * 0.25;
    case "LW":
    case "RW":
      return player.stats.pac * 0.3 + player.stats.dri * 0.35 + player.stats.sho * 0.2 + player.stats.pas * 0.15;
    case "ST":
      return player.stats.sho * 0.45 + player.stats.dri * 0.2 + player.stats.pac * 0.2 + player.stats.phy * 0.15;
  }
}

function shuffleArray<T>(values: readonly T[]) {
  const rng = new RNG(values.length * 97 + 13);
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }
  return out;
}

function emptyStats(): MatchStats {
  return {
    successfulPasses: 0,
    failedPasses: 0,
    successfulDribbles: 0,
    failedDribbles: 0,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    tacklesWon: 0,
    interceptions: 0,
  };
}

function flipTeamSide(lineup: Record<SlotId, TeamRosterPlayer>, side: SideId) {
  const next = {} as Record<SlotId, TeamRosterPlayer>;
  for (const slotId of SLOT_ORDER) {
    next[slotId] = { ...lineup[slotId], side };
  }
  return next;
}

function toPlayerId(teamId: TeamId, slotId: SlotId, rawId?: string) {
  return `${teamId}_${slotId}_${rawId ?? slotId}`;
}

function rotateArray<T>(values: readonly T[], amount: number) {
  const offset = amount % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function oppositeTeam(teamId: TeamId): TeamId {
  return teamId === "HOME" ? "AWAY" : "HOME";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return distance(a.x, a.y, b.x, b.y);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function clampDribbleTarget(player: TeamRosterPlayer, targetX: number, targetY: number, radius: number) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy);
  if (length <= radius) {
    return {
      x: clamp(targetX, 0, PITCH_LENGTH),
      y: clamp(targetY, 0, PITCH_HEIGHT),
    };
  }
  const scale = radius / Math.max(length, 0.001);
  return {
    x: clamp(player.x + dx * scale, 0, PITCH_LENGTH),
    y: clamp(player.y + dy * scale, 0, PITCH_HEIGHT),
  };
}

function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return distance(px, py, ax, ay);
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return distance(px, py, projX, projY);
}

function projectionOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return 0;
  }
  return clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
