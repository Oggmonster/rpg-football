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
export type MatchPlaystyleId = "CONTROL" | "DIRECT" | "WIDE" | "PRESSING";
export type MatchRestartType = "CORNER" | "THROW_IN" | "GOAL_KICK" | "REBOUND";
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
  archetypeName?: string;
  traits?: string[];
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
  archetypeName: string;
  traits: string[];
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
  playstyle: MatchPlaystyleId;
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

type RestartState = {
  type: MatchRestartType;
  teamId: TeamId;
  label: string;
  x: number;
  y: number;
};

type ComboState = {
  teamId: TeamId;
  lastCardId: string;
  chain: number;
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
  pressure: Record<TeamId, number>;
  restart: RestartState | null;
  teams: Record<TeamId, TeamRosterState>;
  stats: Record<TeamId, MatchStats>;
  turnMode: TurnMode;
  currentHand: string[];
  cpuPendingAttack: CpuPendingAttack | null;
  winner: TeamId | "DRAW" | null;
  lastResolution: ActionResolutionView | null;
  commentaryFeed: string[];
  comboState: ComboState | null;
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
  archetypeName: string;
  traits: string[];
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
    playstyle: MatchPlaystyleId;
    substitutionsUsed: number;
    lineup: LineupPlayerView[];
    bench: LineupPlayerView[];
  }[];
  pitchPlayers: PitchPlayerView[];
  ball: BallState;
  pressure: Record<TeamId, number>;
  restart: RestartState | null;
  commentaryFeed: string[];
  winner: TeamId | "DRAW" | null;
  stats: Record<TeamId, MatchStats>;
  combo: {
    teamId: TeamId;
    lastCardId: string;
    lastCardName: string;
    chain: number;
  } | null;
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
  insights: {
    combo: string | null;
    trait: string | null;
    trap: string | null;
  };
  possessionAfter: TeamId;
  roundEnded: boolean;
  goalScored: boolean;
  attackingCard: MatchCardView | null;
  defendingCard: MatchCardView | null;
  cpuPreviewCard: MatchCardView | null;
  ball: BallState;
  restart: RestartState | null;
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

type MovementPlan = {
  positions: Map<string, { x: number; y: number }>;
};

type PressureCandidate = {
  player: TeamRosterPlayer;
  proximity: number;
};

const ATTACK_HAND_SIZE = 3;
const DEFENSE_HAND_SIZE = 3;
const ATTACK_ROUNDS_PER_HALF = 10;
const MAX_SUBSTITUTIONS = 3;
const PITCH_LENGTH = 100;
const PITCH_HEIGHT = 64;
const HOME_LABEL = "Blackflag City";
const AWAY_LABEL = "CPU Athletic";
const PASS_PRESSURE_RADIUS = 2.6;
const DRIBBLE_PRESSURE_RADIUS = 3;
const PASS_PRESSURE_WEIGHT = 0.68;
const DRIBBLE_PRESSURE_WEIGHT = 24;
const PLAYSTYLE_LIST: MatchPlaystyleId[] = ["CONTROL", "DIRECT", "WIDE", "PRESSING"];

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
    id: "THROUGH_BALL",
    name: "Through Ball",
    kind: "PASS",
    description: "Slip it behind the line for a runner.",
    preferredMinDistance: 14,
    preferredMaxDistance: 32,
    accuracy: 6,
    flair: 6,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 1,
  },
  {
    id: "CROSS",
    name: "Cross",
    kind: "PASS",
    description: "Whip a ball into the danger area.",
    preferredMinDistance: 16,
    preferredMaxDistance: 30,
    accuracy: 5,
    flair: 5,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 2,
  },
  {
    id: "HOLD_UP_PLAY",
    name: "Hold-Up Play",
    kind: "PASS",
    description: "Set it back and bring runners into the move.",
    preferredMinDistance: 4,
    preferredMaxDistance: 14,
    accuracy: 8,
    flair: 2,
    radius: 0,
    requiredStars: 0,
    shootingBoost: 2,
  },
  {
    id: "OVERLAP_RUN",
    name: "Overlap Run",
    kind: "PASS",
    description: "Release a runner around the outside.",
    preferredMinDistance: 10,
    preferredMaxDistance: 24,
    accuracy: 7,
    flair: 4,
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
  { id: "FORCE_WIDE", name: "Force Wide", kind: "MAN_MARK", description: "Show the attack toward the touchline.", passStop: 5, dribbleStop: 3, shotStop: 2, longBallStop: 6 },
  { id: "PROTECT_MIDDLE", name: "Protect Middle", kind: "BLOCK", description: "Seal the inside lane and crowd the box.", passStop: 4, dribbleStop: 2, shotStop: 7, longBallStop: 4 },
  { id: "DOUBLE_PRESS", name: "Double Press", kind: "TACKLE", description: "Jump the ball with two defenders.", passStop: 3, dribbleStop: 8, shotStop: 3, longBallStop: 2 },
  { id: "DROP_OFF", name: "Drop Off", kind: "MAN_MARK", description: "Retreat into shape and deny the direct ball.", passStop: 3, dribbleStop: 3, shotStop: 5, longBallStop: 8 },
  { id: "TRACK_RUNNER", name: "Track Runner", kind: "MAN_MARK", description: "Shadow the runner instead of diving to the ball.", passStop: 6, dribbleStop: 2, shotStop: 3, longBallStop: 8 },
];

const ATTACK_LOOKUP = new Map(ATTACK_CARDS.map((card) => [card.id, card]));
const DEFENSE_LOOKUP = new Map(DEFENSE_CARDS.map((card) => [card.id, card]));

const ATTACK_DECK_TEMPLATE = ATTACK_CARDS.flatMap((card) => [card.id, card.id, card.id]);
const DEFENSE_DECK_TEMPLATE = DEFENSE_CARDS.flatMap((card) => [card.id, card.id, card.id]);

const RAW_PLAYERS = (playersCollection.players as RawCollectionPlayer[]).map((player) => ({ ...player }));
const CPU_NAMES = [
  "I. Petrov",
  "D. Morel",
  "K. Varga",
  "T. Ndlovu",
  "O. Sato",
  "P. Duarte",
  "N. Silva",
  "E. Novak",
  "B. Haddad",
  "Y. Costa",
  "C. Jensen",
  "M. Okoro",
  "R. Bianchi",
  "L. Popov",
  "A. Farah",
  "V. Nowak",
  "S. Romero",
  "J. Diallo",
  "F. Kovac",
  "H. Tanaka",
];

export class CardFootballEngine {
  private readonly rng: RNG;
  private readonly state: MatchState;

  constructor(options: CardFootballEngineOptions = {}) {
    const seed = options.rngSeed ?? 1337;
    this.rng = new RNG(seed);
    const kickoffTeam = options.kickoffTeamFirstHalf ?? (this.rng.next() >= 0.5 ? "HOME" : "AWAY");
    const homeTeam = buildTeamRoster("HOME", HOME_LABEL, "LEFT", this.shuffle(RAW_PLAYERS, this.rng), "CONTROL");
    const awayTeam = buildTeamRoster(
      "AWAY",
      AWAY_LABEL,
      "RIGHT",
      this.shuffle(buildCpuPlayerPool(rotateArray(RAW_PLAYERS, 7)), this.rng),
      PLAYSTYLE_LIST[this.rng.int(0, PLAYSTYLE_LIST.length - 1)]
    );

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
      pressure: { HOME: 0, AWAY: 0 },
      restart: null,
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
      comboState: null,
    };

    this.repositionPlayers();
    this.startRound(kickoffTeam, `Coin toss: ${this.labelForTeam(kickoffTeam)} kick off the match.`, true);
  }

  getState(): MatchStateView {
    const comboCardName = this.state.comboState ? this.getCard(this.state.comboState.lastCardId)?.name ?? this.state.comboState.lastCardId : null;
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
        playstyle: this.state.teams[teamId].playstyle,
        substitutionsUsed: this.state.teams[teamId].substitutionsUsed,
        lineup: SLOT_ORDER.map((slotId) => this.toLineupView(this.state.teams[teamId].lineup[slotId])),
        bench: this.state.teams[teamId].bench.map((player) => this.toLineupView(player)),
      })),
      pitchPlayers: this.getPitchPlayers(),
      ball: { ...this.state.ball },
      pressure: { ...this.state.pressure },
      restart: this.state.restart ? { ...this.state.restart } : null,
      commentaryFeed: [...this.state.commentaryFeed],
      winner: this.state.winner,
      stats: {
        HOME: { ...this.state.stats.HOME },
        AWAY: { ...this.state.stats.AWAY },
      },
      combo: this.state.comboState
        ? {
            teamId: this.state.comboState.teamId,
            lastCardId: this.state.comboState.lastCardId,
            lastCardName: comboCardName ?? this.state.comboState.lastCardId,
            chain: this.state.comboState.chain,
          }
        : null,
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

  getComboPreview(cardId: string, teamId: TeamId = this.state.currentRoundTeam) {
    const current = this.state.comboState;
    if (!current || current.teamId !== teamId) {
      return null;
    }
    const preview = this.getComboContext(teamId, cardId);
    if (preview.bonus <= 0) {
      return null;
    }
    const sourceCardName = this.getCard(current.lastCardId)?.name ?? current.lastCardId;
    return {
      teamId,
      sourceCardId: current.lastCardId,
      sourceCardName,
      bonus: preview.bonus,
      line: preview.line,
    };
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
    this.state.restart = null;
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
    this.state.restart = null;
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
    this.startRound(oppositeTeam(this.state.kickoffTeamFirstHalf), "Second half. The teams switch ends and play restarts.", true);
  }

  private afterAction(resolution: ActionResolutionView) {
    this.state.commentaryFeed = resolution.commentary.slice(0, 4);
    this.state.lastResolution = resolution;

    if (this.state.phase === "FULLTIME" || this.state.phase === "HALFTIME") {
      this.clearComboState();
      this.state.turnMode = this.state.phase === "FULLTIME" ? "FULLTIME" : "HALFTIME";
      this.state.currentHand = [];
      this.state.cpuPendingAttack = null;
      this.state.restart = null;
      return;
    }

    if (resolution.roundEnded) {
      const nextTeam = resolution.possessionAfter;
      if (this.state.attackRoundsThisHalf.HOME >= ATTACK_ROUNDS_PER_HALF && this.state.attackRoundsThisHalf.AWAY >= ATTACK_ROUNDS_PER_HALF) {
        if (this.state.half === 1) {
          this.state.phase = "HALFTIME";
          this.state.turnMode = "HALFTIME";
          this.state.currentHand = [];
          this.state.restart = null;
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
      this.startRound(nextTeam, resolution.summary, false);
      return;
    }

    this.prepareTurn();
  }

  private clearComboState(teamId?: TeamId) {
    if (!this.state.comboState) {
      return;
    }
    if (!teamId || this.state.comboState.teamId === teamId) {
      this.state.comboState = null;
    }
  }

  private extendComboState(teamId: TeamId, cardId: string) {
    const current = this.state.comboState;
    if (current?.teamId === teamId) {
      this.state.comboState = {
        teamId,
        lastCardId: cardId,
        chain: Math.min(current.chain + 1, 4),
      };
      return;
    }
    this.state.comboState = { teamId, lastCardId: cardId, chain: 1 };
  }

  private getComboContext(teamId: TeamId, cardId: string) {
    const current = this.state.comboState;
    if (!current || current.teamId !== teamId) {
      return { bonus: 0, line: null as string | null };
    }

    let bonus = 0;
    let line: string | null = null;
    if (current.lastCardId === "OVERLAP_RUN" && cardId === "CROSS") {
      bonus = 10;
      line = "The overlap is still on, so the cross arrives before the shape can reset.";
    } else if ((current.lastCardId === "THREAD_PASS" || current.lastCardId === "THROUGH_BALL") && (cardId === "PLACED_SHOT" || cardId === "POWER_SHOT")) {
      bonus = 9;
      line = "The runner hits the shot in rhythm off the threaded pass.";
    } else if ((current.lastCardId === "ONE_TWO" || current.lastCardId === "HOLD_UP_PLAY") && (cardId === "PLACED_SHOT" || cardId === "POWER_SHOT")) {
      bonus = 8;
      line = "The give-and-go opens the lane for the finish.";
    } else if ((current.lastCardId === "BODY_FEINT" || current.lastCardId === "STEP_OVER") && (cardId === "PLACED_SHOT" || cardId === "POWER_SHOT")) {
      bonus = 6;
      line = "The defender is still recovering from the move, so the shot comes cleaner.";
    } else if ((current.lastCardId === "SHORT_PASS" || current.lastCardId === "ONE_TWO") && (cardId === "THREAD_PASS" || cardId === "THROUGH_BALL")) {
      bonus = 5;
      line = "The quick circulation draws the line out before the killer ball.";
    }

    if (bonus > 0) {
      bonus += Math.max(0, current.chain - 1);
    }
    return { bonus, line };
  }

  private playerKeywords(player: TeamRosterPlayer) {
    return [player.archetypeName, player.tacticalIdentity, ...player.traits].join(" ").toLowerCase();
  }

  private playerMatches(player: TeamRosterPlayer, tags: string[]) {
    const haystack = this.playerKeywords(player);
    return tags.some((tag) => haystack.includes(tag));
  }

  private getPassTraitContext(passer: TeamRosterPlayer, target: TeamRosterPlayer, card: AttackCardDef) {
    let bonus = 0;
    let line: string | null = null;

    if (
      this.playerMatches(passer, ["playmaker", "creator", "distributor", "quarterback", "link-up", "pocket"]) &&
      ["SHORT_PASS", "THREAD_PASS", "THROUGH_BALL", "ONE_TWO", "HOLD_UP_PLAY"].includes(card.id)
    ) {
      bonus += card.id === "THREAD_PASS" || card.id === "THROUGH_BALL" ? 6 : 4;
      line ??= `${passer.name}'s ${passer.archetypeName.toLowerCase()} instincts sharpen the pass.`;
    }
    if (this.playerMatches(passer, ["crosser", "classic winger", "overlapping fullback"]) && card.id === "CROSS") {
      bonus += 6;
      line ??= `${passer.name} whips it in with a natural crosser's shape.`;
    }
    if (this.playerMatches(target, ["speedster", "wide runner", "counter attack specialist", "ghost runner", "overlap runner", "touchline runner"]) && ["THROUGH_BALL", "OVERLAP_RUN", "SWITCH_PLAY"].includes(card.id)) {
      bonus += 5;
      line ??= `${target.name} reads the run early and gets a half-step on the line.`;
    }
    if (this.playerMatches(target, ["target man", "hold-up specialist", "false nine"]) && ["HOLD_UP_PLAY", "ONE_TWO", "CROSS"].includes(card.id)) {
      bonus += 4;
      line ??= `${target.name} makes the link play feel natural in traffic.`;
    }

    return { bonus, line };
  }

  private getDribbleTraitContext(holder: TeamRosterPlayer, card: AttackCardDef) {
    let bonus = 0;
    let line: string | null = null;

    if (this.playerMatches(holder, ["press-resistant", "ball magnet", "calm under pressure"]) && (card.id === "BODY_FEINT" || card.id === "STEP_OVER")) {
      bonus += 5;
      line ??= `${holder.name} stays composed and keeps the ball glued under pressure.`;
    }
    if (this.playerMatches(holder, ["speedster", "counter attack specialist", "touchline runner", "engine"]) && card.id === "BURST_RUN") {
      bonus += 6;
      line ??= `${holder.name} turns the burst into a true footrace.`;
    }
    if (this.playerMatches(holder, ["inside cutter", "shadow striker", "inverted"]) && card.id === "CUT_INSIDE") {
      bonus += 5;
      line ??= `${holder.name} attacks the half-space with a natural inside lane.`;
    }

    return { bonus, line };
  }

  private getShotTraitContext(shooter: TeamRosterPlayer, keeper: TeamRosterPlayer, card: AttackCardDef, distanceTier: DistanceTier) {
    let attackBonus = 0;
    let blockPenalty = 0;
    let keeperGoalPenalty = 0;
    let keeperSpillPenalty = 0;
    let line: string | null = null;

    if (this.playerMatches(shooter, ["poacher", "fox in the box", "shadow striker", "target man", "false nine", "first-time finisher"]) && distanceTier !== "LONG") {
      attackBonus += 6;
      line ??= `${shooter.name} finds the finish like a natural scorer.`;
    }
    if (this.playerMatches(shooter, ["inside cutter", "creator", "false nine"]) && card.id === "PLACED_SHOT") {
      attackBonus += 4;
      line ??= `${shooter.name} opens the body and picks the corner early.`;
    }
    if (this.playerMatches(shooter, ["long shot threat", "shadow striker"]) && card.id === "POWER_SHOT" && distanceTier !== "CLOSE") {
      attackBonus += 5;
      line ??= `${shooter.name} relishes the strike from just outside the crowd.`;
    }
    if (this.playerMatches(keeper, ["shot stopper", "reflex master", "shot barrier"])) {
      keeperGoalPenalty += 5;
      keeperSpillPenalty += 6;
    }
    if (this.playerMatches(keeper, ["sweeper keeper", "rushing keeper"])) {
      keeperGoalPenalty += 2;
      keeperSpillPenalty += 4;
    }
    if (this.playerMatches(shooter, ["target man", "aerial dominance"]) && card.id === "POWER_SHOT") {
      blockPenalty += 1.5;
    }

    return { attackBonus, blockPenalty, keeperGoalPenalty, keeperSpillPenalty, line };
  }

  private choosePressureWinner(pressure: PressureCandidate[], target: TeamRosterPlayer | null = null) {
    return pressure
      .slice()
      .sort((a, b) => {
        const aTargetBias = target ? distance(a.player.x, a.player.y, target.x, target.y) * 0.22 : 0;
        const bTargetBias = target ? distance(b.player.x, b.player.y, target.x, target.y) * 0.22 : 0;
        const aPressBias = this.playerMatches(a.player, ["pressing monster", "destroyer", "brick wall", "tackle machine", "enforcer"]) ? -0.7 : 0;
        const bPressBias = this.playerMatches(b.player, ["pressing monster", "destroyer", "brick wall", "tackle machine", "enforcer"]) ? -0.7 : 0;
        return a.proximity + aTargetBias + aPressBias - (b.proximity + bTargetBias + bPressBias);
      })[0]?.player;
  }

  private getPassTrapContext(defendingCard: DefenseCardDef, attackingCard: AttackCardDef, pressure: PressureCandidate[], target: TeamRosterPlayer, passDistance: number) {
    let penalty = 0;
    let title: string | null = null;
    let line: string | null = null;
    let interceptor = pressure[0]?.player ?? null;

    if (pressure.length === 0) {
      return { penalty, title, line, interceptor };
    }

    if (defendingCard.id === "PRESS_TRAP") {
      penalty += 8;
      interceptor = this.choosePressureWinner(pressure, target) ?? interceptor;
      title = "Trap Sprung";
      line = `${interceptor?.name ?? "The defense"} bait the lane and jump the pass at the trigger.`;
    } else if (defendingCard.id === "TRACK_RUNNER" && (attackingCard.id === "THROUGH_BALL" || attackingCard.id === "OVERLAP_RUN" || passDistance > 18)) {
      penalty += 7;
      interceptor = this.choosePressureWinner(pressure, target) ?? interceptor;
      title = "Run Tracked";
      line = `${interceptor?.name ?? "The defense"} stay with ${target.name} and squeeze the window shut.`;
    } else if (defendingCard.id === "DROP_OFF" && passDistance > 20) {
      penalty += 4;
    }

    return { penalty, title, line, interceptor };
  }

  private getDribbleTrapContext(defendingCard: DefenseCardDef, pressure: PressureCandidate[], holder: TeamRosterPlayer) {
    let penalty = 0;
    let cleanWindowBonus = 0;
    let title: string | null = null;
    let line: string | null = null;
    let tackler = pressure[0]?.player ?? null;

    if (pressure.length === 0) {
      return { penalty, cleanWindowBonus, title, line, tackler };
    }

    if (defendingCard.id === "DOUBLE_TEAM" || defendingCard.id === "DOUBLE_PRESS") {
      penalty += 8;
      cleanWindowBonus = 0.35;
      tackler = this.choosePressureWinner(pressure, holder) ?? tackler;
      title = "Swarmed";
      line = `${holder.name} is crowded out as two defenders close the trap around the dribble.`;
    } else if (defendingCard.id === "PRESS_TRAP") {
      penalty += 5;
      cleanWindowBonus = 0.18;
      tackler = this.choosePressureWinner(pressure, holder) ?? tackler;
      title = "Trap Closed";
      line = `${tackler?.name ?? "The defense"} wait for the heavy touch and spring the pressure.`;
    }

    return { penalty, cleanWindowBonus, title, line, tackler };
  }

  private resolvePass(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, targetPlayerId: string, before: Map<string, { x: number; y: number }>) {
    const passer = this.getBallHolder();
    const target = this.findPlayer(targetPlayerId);
    if (!target || target.teamId !== "HOME") {
      throw new Error("Invalid pass target");
    }

    const plan = this.simulateMovementPhase("HOME", {
      kind: "PASS",
      ballHolderId: passer.playerId,
      targetX: target.x,
      targetY: target.y,
      targetPlayerId: target.playerId,
      attackingCard,
      defendingCard,
    });
    const movedPasser = this.getMovedPoint(plan, passer);
    const movedTarget = this.getMovedPoint(plan, target);
    const pressure = this.findPassPressure("AWAY", movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y, plan);
    const laneRisk = clamp(
      pressure.reduce((sum, candidate) => sum + (1 - candidate.proximity / PASS_PRESSURE_RADIUS) * (candidate.player.blocking / 100) * PASS_PRESSURE_WEIGHT, 0),
      0,
      1
    );
    const combo = this.getComboContext("HOME", attackingCard.id);
    const trait = this.getPassTraitContext(passer, target, attackingCard);
    const previewChance = this.previewPassChance(attackingCard, passer, target, laneRisk, movedPasser, movedTarget);
    const passDistance = distance(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y);
    const trap = this.getPassTrapContext(defendingCard, attackingCard, pressure, target, passDistance);
    const defensePenalty = defendingCard.passStop + (distance(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y) > 22 ? defendingCard.longBallStop : 0);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pass - TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pressing;
    const pressureBoost = this.state.pressure.HOME * 0.12;
    const chance = clamp(Math.round(previewChance + tacticBonus + pressureBoost + combo.bonus + trait.bonus - defensePenalty - trap.penalty), 5, 95);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.applyMovementPlan(plan);
      this.extendComboState("HOME", attackingCard.id);
      this.state.stats.HOME.successfulPasses += 1;
      this.raisePressure("HOME", this.getPassPressureGain(attackingCard, movedPasser, movedTarget));
      this.state.ball.teamId = "HOME";
      this.state.ball.holderId = target.playerId;
      this.state.ball.x = movedTarget.x;
      this.state.ball.y = movedTarget.y;
      return this.buildResolution(before, {
        title: "Pass Complete",
        summary: `${passer.name} finds ${target.name}.`,
        commentary: [
          `${passer.name} scans the pitch and slides it into ${target.name}.`,
          combo.line ?? trait.line ?? `${target.name} checks toward the ball and takes it in stride.`,
          `${this.labelForTeam("HOME")} keep the move alive.`,
        ],
        insights: {
          combo: combo.line,
          trait: trait.line,
        },
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.clearComboState("HOME");
    this.applyMovementPlan(plan);
    this.state.stats.HOME.failedPasses += 1;
    this.state.ball.teamId = "AWAY";
    if (pressure.length > 0) {
      if (this.shouldAwardAttackingThrowIn(attackingCard, movedTarget, pressure[0].proximity)) {
        const throwInPoint = this.getTouchlineRestartPoint(movedTarget.x, movedTarget.y);
        this.setRestart("THROW_IN", "HOME", "Throw-in to Blackflag City", throwInPoint.x, throwInPoint.y, this.getThrowInSlots(throwInPoint.y));
        this.raisePressure("HOME", 8);
        return this.buildResolution(before, {
          title: "Throw-In Won",
          summary: `${target.name} cannot reach it, but the deflection keeps the attack alive.`,
          commentary: [
            `${passer.name} tries to force the lane and the defender only gets a touch.`,
            `The ball skids out on the flank. Throw-in to ${this.labelForTeam("HOME")}.`,
            `${this.labelForTeam("HOME")} keep the round going from the restart.`,
          ],
          possessionAfter: "HOME",
          roundEnded: false,
          goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }
      const interceptor = trap.interceptor ?? pressure[0].player;
      this.state.stats.AWAY.interceptions += 1;
      this.resetPressure();
      this.state.ball.holderId = interceptor.playerId;
      this.state.ball.x = interceptor.x;
      this.state.ball.y = interceptor.y;
      return this.buildResolution(before, {
        title: trap.title ?? "Intercepted",
        summary:
          trap.title === "Run Tracked"
            ? `${interceptor.name} stays with the run and cuts it out.`
            : trap.title === "Trap Sprung"
              ? `${interceptor.name} reads the bait and steals it.`
              : `${target.name} cannot get there. ${interceptor.name} steps in.`,
        commentary: [
          `${passer.name} forces the pass and the lane closes in a heartbeat.`,
          trap.line ?? `${interceptor.name} is close enough to cut across the ball and take it.`,
          `Turn over. ${this.labelForTeam("AWAY")} start a new attack.`,
        ],
        insights: {
          trap: trap.line,
        },
        possessionAfter: "AWAY",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const looseBall = this.projectLoosePassPoint(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y);
    if (this.isNearTouchline(looseBall.y)) {
      this.setRestart("THROW_IN", "AWAY", "Throw-in to CPU Athletic", looseBall.x, looseBall.y, this.getThrowInSlots(looseBall.y));
      this.resetPressure();
      return this.buildResolution(before, {
        title: "Pass Out Of Play",
        summary: `${passer.name} sends it out on the touchline.`,
        commentary: [
          `${passer.name} gets the weight wrong and the ball races away from everyone.`,
          `It rolls out near the sideline. Throw-in to ${this.labelForTeam("AWAY")}.`,
          `Turn over. ${this.labelForTeam("AWAY")} start from the restart spot.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const collector = this.pickLooseBallWinner(looseBall.x, looseBall.y, "AWAY");
    this.placeBallWithPlayer(collector, looseBall.x, looseBall.y);
    if (collector.teamId === "HOME") {
      this.raisePressure("HOME", 7);
      return this.buildResolution(before, {
        title: "Loose Ball Kept Alive",
        summary: `${passer.name} misses the target, but ${collector.name} reacts first.`,
        commentary: [
          `${passer.name} overhits the first idea and the ball spills into space.`,
          `${collector.name} is quickest to the second ball and keeps the move alive.`,
          `${this.labelForTeam("HOME")} stay in the round.`,
        ],
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.resetPressure();
    return this.buildResolution(before, {
      title: "Pass Misplayed",
      summary: `${passer.name} overhits it and the move dies.`,
      commentary: [
        `${passer.name} shapes the pass, but nobody can reach the ball in time.`,
        `It skids loose near ${collector.name}, who gathers it for ${this.labelForTeam("AWAY")}.`,
        `Turn over. The defense were not close enough to intercept, but the attack still breaks down.`,
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
    const plan = this.simulateMovementPhase("AWAY", {
      kind: "PASS",
      ballHolderId: passer.playerId,
      targetX: target.x,
      targetY: target.y,
      targetPlayerId: target.playerId,
      attackingCard,
      defendingCard,
    });
    const movedPasser = this.getMovedPoint(plan, passer);
    const movedTarget = this.getMovedPoint(plan, target);
    const pressure = this.findPassPressure("HOME", movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y, plan);
    const laneRisk = clamp(
      pressure.reduce((sum, candidate) => sum + (1 - candidate.proximity / PASS_PRESSURE_RADIUS) * (candidate.player.blocking / 100) * PASS_PRESSURE_WEIGHT, 0),
      0,
      1
    );
    const combo = this.getComboContext("AWAY", attackingCard.id);
    const trait = this.getPassTraitContext(passer, target, attackingCard);
    const previewChance = this.previewPassChance(attackingCard, passer, target, laneRisk, movedPasser, movedTarget);
    const passDistance = distance(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y);
    const trap = this.getPassTrapContext(defendingCard, attackingCard, pressure, target, passDistance);
    const defensePenalty = defendingCard.passStop + (distance(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y) > 22 ? defendingCard.longBallStop : 0);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pass - TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pressing;
    const pressureBoost = this.state.pressure.AWAY * 0.12;
    const chance = clamp(Math.round(previewChance + tacticBonus + pressureBoost + combo.bonus + trait.bonus - defensePenalty - trap.penalty), 5, 95);
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.applyMovementPlan(plan);
      this.extendComboState("AWAY", attackingCard.id);
      this.state.stats.AWAY.successfulPasses += 1;
      this.raisePressure("AWAY", this.getPassPressureGain(attackingCard, movedPasser, movedTarget));
      this.state.ball.teamId = "AWAY";
      this.state.ball.holderId = target.playerId;
      this.state.ball.x = movedTarget.x;
      this.state.ball.y = movedTarget.y;
      return this.buildResolution(before, {
        title: "CPU Pass Complete",
        summary: `${passer.name} finds ${target.name}.`,
        commentary: [
          `The CPU spots the run and sends the pass into space.`,
          combo.line ?? trait.line ?? `${target.name} gets there cleanly before the press can land.`,
          `${this.labelForTeam("AWAY")} stay on the ball.`,
        ],
        insights: {
          combo: combo.line,
          trait: trait.line,
        },
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.clearComboState("AWAY");
    this.applyMovementPlan(plan);
    this.state.stats.AWAY.failedPasses += 1;
    this.state.ball.teamId = "HOME";
    if (pressure.length > 0) {
      if (this.shouldAwardAttackingThrowIn(attackingCard, movedTarget, pressure[0].proximity)) {
        const throwInPoint = this.getTouchlineRestartPoint(movedTarget.x, movedTarget.y);
        this.setRestart("THROW_IN", "AWAY", "Throw-in to CPU Athletic", throwInPoint.x, throwInPoint.y, this.getThrowInSlots(throwInPoint.y));
        this.raisePressure("AWAY", 8);
        return this.buildResolution(before, {
          title: "CPU Throw-In Won",
          summary: `The pressure only glances the pass away.`,
          commentary: [
            `The CPU force the pass and a touch sends it spinning toward the line.`,
            `Throw-in to ${this.labelForTeam("AWAY")}. They keep the round alive.`,
            `${this.labelForTeam("HOME")} must reset quickly.`,
          ],
          possessionAfter: "AWAY",
          roundEnded: false,
          goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }
      const interceptor = trap.interceptor ?? pressure[0].player;
      this.state.stats.HOME.interceptions += 1;
      this.resetPressure();
      this.state.ball.holderId = interceptor.playerId;
      this.state.ball.x = interceptor.x;
      this.state.ball.y = interceptor.y;
      return this.buildResolution(before, {
        title: trap.title ?? "Interception",
        summary:
          trap.title === "Run Tracked"
            ? `${interceptor.name} follows the runner and takes it away.`
            : trap.title === "Trap Sprung"
              ? `${interceptor.name} lures the pass and steps in.`
              : `${interceptor.name} jumps the pass.`,
        commentary: [
          `The CPU tries to force it through traffic.`,
          trap.line ?? `${interceptor.name} is close enough to step across the lane and steal it.`,
          `Turn over. ${this.labelForTeam("HOME")} break the other way.`,
        ],
        insights: {
          trap: trap.line,
        },
        possessionAfter: "HOME",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const looseBall = this.projectLoosePassPoint(movedPasser.x, movedPasser.y, movedTarget.x, movedTarget.y);
    if (this.isNearTouchline(looseBall.y)) {
      this.setRestart("THROW_IN", "HOME", "Throw-in to Blackflag City", looseBall.x, looseBall.y, this.getThrowInSlots(looseBall.y));
      this.resetPressure();
      return this.buildResolution(before, {
        title: "CPU Pass Out",
        summary: `${passer.name} plays it straight into touch.`,
        commentary: [
          `The CPU have the picture, but not the weight of pass.`,
          `It runs out on the line. Throw-in to ${this.labelForTeam("HOME")}.`,
          `Turn over. You restart from the flank.`,
        ],
        possessionAfter: "HOME",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const collector = this.pickLooseBallWinner(looseBall.x, looseBall.y, "HOME");
    this.placeBallWithPlayer(collector, looseBall.x, looseBall.y);
    if (collector.teamId === "AWAY") {
      this.raisePressure("AWAY", 7);
      return this.buildResolution(before, {
        title: "CPU Recover The Loose Ball",
        summary: `${passer.name} misses the target, but the attack survives.`,
        commentary: [
          `The CPU misjudge the first pass and it skips into space.`,
          `${collector.name} is first to the second ball and keeps the move alive.`,
          `${this.labelForTeam("AWAY")} stay on the front foot.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.resetPressure();
    return this.buildResolution(before, {
      title: "CPU Misplays It",
      summary: `${passer.name} sends it out of reach.`,
      commentary: [
        `The CPU sees the pass, but the weight is wrong.`,
        `${collector.name} is nearest to the loose ball and sweeps it up for ${this.labelForTeam("HOME")}.`,
        `Turn over. Your team start a fresh attack.`,
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
    const plan = this.simulateMovementPhase("HOME", {
      kind: "DRIBBLE",
      ballHolderId: holder.playerId,
      targetX: clampedTarget.x,
      targetY: clampedTarget.y,
      attackingCard,
      defendingCard,
    });
    const movedHolder = this.getMovedPoint(plan, holder);
    const pressure = this.findDribblePressure("AWAY", holder.x, holder.y, movedHolder.x, movedHolder.y, plan);
    const closestPressure = pressure[0];
    const combo = this.getComboContext("HOME", attackingCard.id);
    const trait = this.getDribbleTraitContext(holder, attackingCard);
    const trap = this.getDribbleTrapContext(defendingCard, pressure, holder);
    const progress = this.getAttackDirection("HOME") === "RIGHT" ? movedHolder.x - holder.x : holder.x - movedHolder.x;
    const chance =
      clamp(
        Math.round(
          (34 +
            holder.stats.dri * 0.44 +
            holder.stats.pac * 0.22 +
            attackingCard.flair * 3 +
            combo.bonus +
            trait.bonus +
            progress * 1.6 +
            (TACTIC_MODIFIERS[this.state.teams.HOME.tactic].dribble - TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pressing) * 2 -
            Math.max(0, attackingCard.requiredStars - holder.skillStars) * 8 -
            defendingCard.dribbleStop * 2.8 -
            trap.penalty -
            (closestPressure ? (1 - closestPressure.proximity / DRIBBLE_PRESSURE_RADIUS) * DRIBBLE_PRESSURE_WEIGHT : -6)) / 2
        ),
        4,
        97
      );
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.applyMovementPlan(plan);
      this.extendComboState("HOME", attackingCard.id);
      this.state.stats.HOME.successfulDribbles += 1;
      this.raisePressure("HOME", this.getDribblePressureGain(attackingCard, movedHolder, holder));
      this.state.ball.x = movedHolder.x;
      this.state.ball.y = movedHolder.y;
      return this.buildResolution(before, {
        title: "Dribble Won",
        summary: `${holder.name} skips away from the challenge.`,
        commentary: [
          `${holder.name} squares the defender up and goes.`,
          combo.line ?? trait.line ?? `A sharp touch opens a lane and the move keeps flowing.`,
          `${this.labelForTeam("HOME")} stay in command.`,
        ],
        insights: {
          combo: combo.line,
          trait: trait.line,
        },
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.clearComboState("HOME");
    this.applyMovementPlan(plan);
    this.state.stats.HOME.failedDribbles += 1;
    if (pressure.length > 0 && this.isCleanTackleWindow(pressure[0], defendingCard, trap.cleanWindowBonus)) {
      const tackler = trap.tackler ?? pressure[0].player;
      this.state.stats.AWAY.tacklesWon += 1;
      this.resetPressure();
      this.state.ball.teamId = "AWAY";
      this.state.ball.holderId = tackler.playerId;
      this.state.ball.x = tackler.x;
      this.state.ball.y = tackler.y;
      return this.buildResolution(before, {
        title: trap.title ?? "Tackle Won",
        summary: `${tackler.name} strips the ball away.`,
        commentary: [
          `${holder.name} tries to force the dribble through traffic.`,
          trap.line ?? `${tackler.name} gets close enough during the movement phase and wins it cleanly.`,
          `Turn over. ${this.labelForTeam("AWAY")} have the next round.`,
        ],
        insights: {
          trap: trap.line,
        },
        possessionAfter: "AWAY",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const looseBall = {
      x: round1(clamp((holder.x + movedHolder.x) / 2 + this.randomBetween(-1.4, 1.4), 2, 98)),
      y: round1(clamp((holder.y + movedHolder.y) / 2 + this.randomBetween(-1.8, 1.8), 4, 60)),
    };
    const collector = this.pickLooseBallWinner(looseBall.x, looseBall.y, pressure.length > 0 ? "AWAY" : "HOME");
    this.placeBallWithPlayer(collector, looseBall.x, looseBall.y);
    if (collector.teamId === "HOME") {
      this.raisePressure("HOME", 5);
      return this.buildResolution(before, {
        title: "Ricochet Won",
        summary: `${holder.name} loses the clean touch, but a teammate keeps it alive.`,
        commentary: [
          `${holder.name} knocks it too far and the ball ricochets into a crowded lane.`,
          `${collector.name} reacts first to the loose touch and restores the move.`,
          `${this.labelForTeam("HOME")} stay in possession.`,
        ],
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.resetPressure();
    return this.buildResolution(before, {
      title: "Loose Ball Lost",
      summary: `${holder.name} loses the bounce and the move is gone.`,
      commentary: [
        `${holder.name} gets the dribble wrong and the ball runs away into pressure.`,
        `${collector.name} wins the scramble and turns play around for ${this.labelForTeam("AWAY")}.`,
        `Turn over. ${this.labelForTeam("AWAY")} take the next round.`,
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
    const plan = this.simulateMovementPhase("AWAY", {
      kind: "DRIBBLE",
      ballHolderId: holder.playerId,
      targetX: target.x,
      targetY: target.y,
      attackingCard,
      defendingCard,
    });
    const movedHolder = this.getMovedPoint(plan, holder);
    const pressure = this.findDribblePressure("HOME", holder.x, holder.y, movedHolder.x, movedHolder.y, plan);
    const closestPressure = pressure[0];
    const combo = this.getComboContext("AWAY", attackingCard.id);
    const trait = this.getDribbleTraitContext(holder, attackingCard);
    const trap = this.getDribbleTrapContext(defendingCard, pressure, holder);
    const progress = this.getAttackDirection("AWAY") === "RIGHT" ? movedHolder.x - holder.x : holder.x - movedHolder.x;
    const chance =
      clamp(
        Math.round(
          (34 +
            holder.stats.dri * 0.44 +
            holder.stats.pac * 0.22 +
            attackingCard.flair * 3 +
            combo.bonus +
            trait.bonus +
            progress * 1.6 +
            (TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].dribble - TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pressing) * 2 -
            Math.max(0, attackingCard.requiredStars - holder.skillStars) * 8 -
            defendingCard.dribbleStop * 2.8 -
            trap.penalty -
            (closestPressure ? (1 - closestPressure.proximity / DRIBBLE_PRESSURE_RADIUS) * DRIBBLE_PRESSURE_WEIGHT : -6)) / 2
        ),
        4,
        97
      );
    const success = this.rng.int(1, 100) <= chance;

    if (success) {
      this.applyMovementPlan(plan);
      this.extendComboState("AWAY", attackingCard.id);
      this.state.stats.AWAY.successfulDribbles += 1;
      this.raisePressure("AWAY", this.getDribblePressureGain(attackingCard, movedHolder, holder));
      this.state.ball.x = movedHolder.x;
      this.state.ball.y = movedHolder.y;
      return this.buildResolution(before, {
        title: "CPU Dribble",
        summary: `${holder.name} beats the first challenge.`,
        commentary: [
          `${holder.name} faces up, shifts the ball, and drives into the gap.`,
          combo.line ?? trait.line ?? `The defensive line is scrambling back toward goal.`,
          `${this.labelForTeam("AWAY")} keep the round going.`,
        ],
        insights: {
          combo: combo.line,
          trait: trait.line,
        },
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.clearComboState("AWAY");
    this.applyMovementPlan(plan);
    this.state.stats.AWAY.failedDribbles += 1;
    if (pressure.length > 0 && this.isCleanTackleWindow(pressure[0], defendingCard, trap.cleanWindowBonus)) {
      const tackler = trap.tackler ?? pressure[0].player;
      this.state.stats.HOME.tacklesWon += 1;
      this.resetPressure();
      this.state.ball.teamId = "HOME";
      this.state.ball.holderId = tackler.playerId;
      this.state.ball.x = tackler.x;
      this.state.ball.y = tackler.y;
      return this.buildResolution(before, {
        title: trap.title ?? "Turnover Won",
        summary: `${tackler.name} takes it away.`,
        commentary: [
          `The CPU tries to carry through pressure.`,
          trap.line ?? `${tackler.name} gets close enough during the movement phase and wins the ball.`,
          `Turn over. ${this.labelForTeam("HOME")} get the next attack.`,
        ],
        insights: {
          trap: trap.line,
        },
        possessionAfter: "HOME",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    const looseBall = {
      x: round1(clamp((holder.x + movedHolder.x) / 2 + this.randomBetween(-1.4, 1.4), 2, 98)),
      y: round1(clamp((holder.y + movedHolder.y) / 2 + this.randomBetween(-1.8, 1.8), 4, 60)),
    };
    const collector = this.pickLooseBallWinner(looseBall.x, looseBall.y, pressure.length > 0 ? "HOME" : "AWAY");
    this.placeBallWithPlayer(collector, looseBall.x, looseBall.y);
    if (collector.teamId === "AWAY") {
      this.raisePressure("AWAY", 5);
      return this.buildResolution(before, {
        title: "CPU Keep The Scrap",
        summary: `${holder.name} stumbles, but the CPU win the second ball.`,
        commentary: [
          `The dribble gets messy and the ball spills out of the tackle window.`,
          `${collector.name} reacts first and the attack survives.`,
          `${this.labelForTeam("AWAY")} keep the round alive.`,
        ],
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    this.resetPressure();
    return this.buildResolution(before, {
      title: "CPU Lose The Scrap",
      summary: `${holder.name} cannot recover the heavy touch.`,
      commentary: [
        `The CPU overcarry the dribble and the ball pops loose in traffic.`,
        `${collector.name} wins the second ball and turns play around.`,
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
    const goalX = this.getAttackDirection("HOME") === "RIGHT" ? 100 : 0;
    const plan = this.simulateMovementPhase("HOME", {
      kind: "SHOT",
      ballHolderId: shooter.playerId,
      targetX: goalX,
      targetY: 32,
      attackingCard,
      defendingCard,
    });
    const movedShooter = this.getMovedPoint(plan, shooter);
    const keeper = this.state.teams.AWAY.lineup.GK;
    const laneBlockers = this.getMovedTeamPlayers("AWAY", plan).filter((player) => player.slotId !== "GK" && this.distanceToShotLane(player, { ...shooter, ...movedShooter }) < 3.8);
    const distanceTier = this.getDistanceTier({ ...shooter, ...movedShooter });
    const combo = this.getComboContext("HOME", attackingCard.id);
    const shotTrait = this.getShotTraitContext(shooter, keeper, attackingCard, distanceTier);
    const distancePenalty = distanceTier === "CLOSE" ? 0 : distanceTier === "MID" ? 8 : 18;
    const blockerPenalty = laneBlockers.reduce((sum, player) => sum + player.blocking / 34, 0);
    const cardPenalty = defendingCard.shotStop + laneBlockers.length * (defendingCard.kind === "BLOCK" ? 1.6 : 0.5);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.HOME.tactic].shot - TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].pressing;
    const pressureBoost = this.state.pressure.HOME * 0.18;
    const raw =
      18 +
      shooter.stats.sho * 0.55 +
      shooter.agility * 0.18 +
      attackingCard.shootingBoost * 2.6 +
      clamp01(shot.aimQuality) * 18 +
      clamp01(shot.powerQuality) * 14 +
      combo.bonus +
      shotTrait.attackBonus +
      pressureBoost +
      tacticBonus * 2 -
      distancePenalty -
      blockerPenalty * 4 -
      cardPenalty * 3 -
      keeper.blocking * 0.38 -
      shotTrait.keeperGoalPenalty;
    const goalChance = clamp(Math.round(raw / 2.3), 4, 92);
    const onTargetChance = clamp(Math.round(goalChance + clamp01(shot.aimQuality) * 15 - 5), 10, 97);
    const onTarget = this.rng.int(1, 100) <= onTargetChance;
    const goal = onTarget && this.rng.int(1, 100) <= goalChance;
    const shotInsights = {
      combo: combo.line,
      trait: shotTrait.line,
      trap: null,
    };
    this.clearComboState("HOME");
    this.state.stats.HOME.shots += 1;
    this.applyMovementPlan(plan);

    const blockChance =
      laneBlockers.length === 0
        ? 0
        : clamp(
            Math.round(
              12 +
                laneBlockers.length * 8 +
                blockerPenalty * 5 +
                defendingCard.shotStop * 3 +
                (defendingCard.id === "PROTECT_MIDDLE" ? 8 : 0) +
                (defendingCard.kind === "BLOCK" ? 6 : 0) -
                shotTrait.blockPenalty * 3
            ),
            0,
            64
          );
    const blocked = laneBlockers.length > 0 && this.rng.int(1, 100) <= blockChance;

    if (blocked) {
      const blocker = laneBlockers[0];
      const deflectPoint = {
        x: round1(clamp(blocker.x + (goalX > blocker.x ? -1.6 : 1.6), 2, 98)),
        y: round1(clamp(blocker.y + this.randomBetween(-3.4, 3.4), 4, 60)),
      };
      if (this.shouldAwardCorner("HOME", deflectPoint)) {
        const corner = this.getCornerPoint("HOME", deflectPoint.y);
        this.setRestart("CORNER", "HOME", "Corner to Blackflag City", corner.x, corner.y, [deflectPoint.y < 32 ? "LW" : "RW", "LCM", "RCM"]);
        this.raisePressure("HOME", 14);
        return this.buildResolution(before, {
          title: "Shot Blocked For Corner",
          summary: `${blocker.name} blocks it behind.`,
        commentary: [
          `${shooter.name} lets it go through traffic and ${blocker.name} throws a body in the way.`,
          combo.line ?? shotTrait.line ?? `The finish was set, but the lane never fully opens.`,
          `The deflection spins behind the goal. Corner to ${this.labelForTeam("HOME")}.`,
        ],
        insights: shotInsights,
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }

      const collector = this.pickLooseBallWinner(deflectPoint.x, deflectPoint.y, "AWAY");
      this.placeBallWithPlayer(collector, deflectPoint.x, deflectPoint.y);
      if (collector.teamId === "HOME") {
        this.state.restart = { type: "REBOUND", teamId: "HOME", label: "Rebound for Blackflag City", x: deflectPoint.x, y: deflectPoint.y };
        this.raisePressure("HOME", 12);
        return this.buildResolution(before, {
          title: "Rebound Falls Kindly",
          summary: `${blocker.name} blocks it, but the rebound stays alive.`,
        commentary: [
          `${blocker.name} gets in the way, but the block drops loose inside the area.`,
          combo.line ?? shotTrait.line ?? `${shooter.name} had the picture, and the chance is still alive.`,
          `${collector.name} is first to the rebound for ${this.labelForTeam("HOME")}.`,
        ],
        insights: shotInsights,
        possessionAfter: "HOME",
        roundEnded: false,
        goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }

      this.resetPressure();
      return this.buildResolution(before, {
        title: "Shot Blocked",
        summary: `${blocker.name} gets the block and the danger is cleared.`,
        commentary: [
          `${shooter.name} hits it and ${blocker.name} steps right into the lane.`,
          combo.line ?? shotTrait.line ?? `The release is there, but the block kills the clean strike.`,
          `${collector.name} wins the second ball and clears the danger for ${this.labelForTeam("AWAY")}.`,
        ],
        insights: shotInsights,
        possessionAfter: "AWAY",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    if (goal) {
      this.state.stats.HOME.shotsOnTarget += 1;
      this.state.stats.HOME.goals += 1;
      this.state.score.HOME += 1;
      this.resetPressure();
      return this.handleGoal(before, "HOME", shooter, attackingCard, defendingCard, shotInsights);
    }

    if (onTarget) {
      this.state.stats.HOME.shotsOnTarget += 1;
      const spill =
        this.rng.int(1, 100) <=
        clamp(Math.round(18 + this.state.pressure.HOME * 0.3 + attackingCard.shootingBoost * 2 - keeper.blocking * 0.16 - shotTrait.keeperSpillPenalty), 6, 42);
      if (spill) {
        const reboundPoint = {
          x: round1(clamp(keeper.x + (goalX === 100 ? -2.4 : 2.4), 2, 98)),
          y: round1(clamp(keeper.y + this.randomBetween(-5.2, 5.2), 4, 60)),
        };
        const collector = this.pickLooseBallWinner(reboundPoint.x, reboundPoint.y, "HOME");
        this.placeBallWithPlayer(collector, reboundPoint.x, reboundPoint.y);
        if (collector.teamId === "HOME") {
          this.state.restart = { type: "REBOUND", teamId: "HOME", label: "Rebound for Blackflag City", x: reboundPoint.x, y: reboundPoint.y };
          this.raisePressure("HOME", 18);
          return this.buildResolution(before, {
            title: "Save Spilled",
            summary: `${keeper.name} cannot hold it.`,
            commentary: [
              `${shooter.name} gets the shot through and ${keeper.name} can only parry it away.`,
              combo.line ?? shotTrait.line ?? `The first strike lands with enough venom to keep the area alive.`,
              `${collector.name} reacts quickest to the rebound for ${this.labelForTeam("HOME")}.`,
            ],
            insights: shotInsights,
            possessionAfter: "HOME",
            roundEnded: false,
            goalScored: false,
            attackingCard: this.toCardView(attackingCard),
            defendingCard: this.toCardView(defendingCard),
          });
        }
      }

      this.state.ball.teamId = "AWAY";
      this.state.ball.holderId = keeper.playerId;
      this.state.ball.x = keeper.x;
      this.state.ball.y = keeper.y;
      this.resetPressure();
      this.nudgeAttack("AWAY", "GK", 1);
      return this.buildResolution(before, {
        title: "Saved",
        summary: `${keeper.name} gets behind it.`,
        commentary: [
          `${shooter.name} gets the shot away through bodies in the box.`,
          shotTrait.line ?? `${keeper.name} tracks it and beats it away to safety.`,
          `The attack is over. ${this.labelForTeam("AWAY")} take the next round.`,
        ],
        insights: shotInsights,
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
    this.setRestart("GOAL_KICK", "AWAY", "Goal kick to CPU Athletic", keeper.x, keeper.y, ["GK"]);
    this.resetPressure();
    this.nudgeAttack("AWAY", "GK", 1);
    return this.buildResolution(before, {
      title: "Off Target",
      summary: `${shooter.name} cannot keep it down.`,
      commentary: [
        `${shooter.name} tries to whip it beyond the keeper.`,
        combo.line ?? shotTrait.line ?? `Too much on it. The ball flies beyond the frame.`,
        `Goal kick feeling, and ${this.labelForTeam("AWAY")} restart the next round.`,
      ],
      insights: shotInsights,
      possessionAfter: "AWAY",
      roundEnded: true,
      goalScored: false,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private resolveCpuShot(attackingCard: AttackCardDef, defendingCard: DefenseCardDef, before: Map<string, { x: number; y: number }>) {
    const shooter = this.getBallHolder();
    const goalX = this.getAttackDirection("AWAY") === "RIGHT" ? 100 : 0;
    const plan = this.simulateMovementPhase("AWAY", {
      kind: "SHOT",
      ballHolderId: shooter.playerId,
      targetX: goalX,
      targetY: 32,
      attackingCard,
      defendingCard,
    });
    const movedShooter = this.getMovedPoint(plan, shooter);
    const keeper = this.state.teams.HOME.lineup.GK;
    const laneBlockers = this.getMovedTeamPlayers("HOME", plan).filter((player) => player.slotId !== "GK" && this.distanceToShotLane(player, { ...shooter, ...movedShooter }) < 3.8);
    const distanceTier = this.getDistanceTier({ ...shooter, ...movedShooter });
    const combo = this.getComboContext("AWAY", attackingCard.id);
    const shotTrait = this.getShotTraitContext(shooter, keeper, attackingCard, distanceTier);
    const distancePenalty = distanceTier === "CLOSE" ? 0 : distanceTier === "MID" ? 8 : 18;
    const blockerPenalty = laneBlockers.reduce((sum, player) => sum + player.blocking / 34, 0);
    const cardPenalty = defendingCard.shotStop + laneBlockers.length * (defendingCard.kind === "BLOCK" ? 1.6 : 0.5);
    const tacticBonus = TACTIC_MODIFIERS[this.state.teams.AWAY.tactic].shot - TACTIC_MODIFIERS[this.state.teams.HOME.tactic].pressing;
    const pressureBoost = this.state.pressure.AWAY * 0.18;
    const raw =
      18 +
      shooter.stats.sho * 0.55 +
      shooter.agility * 0.18 +
      attackingCard.shootingBoost * 2.6 +
      this.rng.next() * 18 +
      this.rng.next() * 12 +
      combo.bonus +
      shotTrait.attackBonus +
      pressureBoost +
      tacticBonus * 2 -
      distancePenalty -
      blockerPenalty * 4 -
      cardPenalty * 3 -
      keeper.blocking * 0.38 -
      shotTrait.keeperGoalPenalty;
    const goalChance = clamp(Math.round(raw / 2.3), 4, 92);
    const onTargetChance = clamp(Math.round(goalChance + 12), 10, 97);
    const onTarget = this.rng.int(1, 100) <= onTargetChance;
    const goal = onTarget && this.rng.int(1, 100) <= goalChance;
    const shotInsights = {
      combo: combo.line,
      trait: shotTrait.line,
      trap: null,
    };
    this.clearComboState("AWAY");
    this.state.stats.AWAY.shots += 1;
    this.applyMovementPlan(plan);

    const blockChance =
      laneBlockers.length === 0
        ? 0
        : clamp(
            Math.round(
              12 +
                laneBlockers.length * 8 +
                blockerPenalty * 5 +
                defendingCard.shotStop * 3 +
                (defendingCard.id === "PROTECT_MIDDLE" ? 8 : 0) +
                (defendingCard.kind === "BLOCK" ? 6 : 0) -
                shotTrait.blockPenalty * 3
            ),
            0,
            64
          );
    const blocked = laneBlockers.length > 0 && this.rng.int(1, 100) <= blockChance;

    if (blocked) {
      const blocker = laneBlockers[0];
      const deflectPoint = {
        x: round1(clamp(blocker.x + (goalX > blocker.x ? -1.6 : 1.6), 2, 98)),
        y: round1(clamp(blocker.y + this.randomBetween(-3.4, 3.4), 4, 60)),
      };
      if (this.shouldAwardCorner("AWAY", deflectPoint)) {
        const corner = this.getCornerPoint("AWAY", deflectPoint.y);
        this.setRestart("CORNER", "AWAY", "Corner to CPU Athletic", corner.x, corner.y, [deflectPoint.y < 32 ? "LW" : "RW", "LCM", "RCM"]);
        this.raisePressure("AWAY", 14);
        return this.buildResolution(before, {
          title: "CPU Win A Corner",
          summary: `${blocker.name} blocks it behind.`,
        commentary: [
          `The CPU strike and ${blocker.name} only manages to turn it behind.`,
          combo.line ?? shotTrait.line ?? `The pattern play gets them clean enough for a dangerous effort.`,
          `Corner to ${this.labelForTeam("AWAY")}. The pressure stays on.`,
        ],
        insights: shotInsights,
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }

      const collector = this.pickLooseBallWinner(deflectPoint.x, deflectPoint.y, "HOME");
      this.placeBallWithPlayer(collector, deflectPoint.x, deflectPoint.y);
      if (collector.teamId === "AWAY") {
        this.state.restart = { type: "REBOUND", teamId: "AWAY", label: "Rebound for CPU Athletic", x: deflectPoint.x, y: deflectPoint.y };
        this.raisePressure("AWAY", 12);
        return this.buildResolution(before, {
          title: "CPU Rebound",
          summary: `${blocker.name} blocks it, but the rebound stays alive.`,
        commentary: [
          `${blocker.name} gets a piece of it, but not enough to clear danger.`,
          combo.line ?? shotTrait.line ?? `The CPU hit it in stride and keep the box alive.`,
          `${collector.name} is first to the rebound and the attack continues.`,
        ],
        insights: shotInsights,
        possessionAfter: "AWAY",
        roundEnded: false,
        goalScored: false,
          attackingCard: this.toCardView(attackingCard),
          defendingCard: this.toCardView(defendingCard),
        });
      }

      this.resetPressure();
      return this.buildResolution(before, {
        title: "Block And Clear",
        summary: `${blocker.name} blocks it and your side clear.`,
        commentary: [
          `The CPU get the shot off, but ${blocker.name} stands up to the strike.`,
          combo.line ?? shotTrait.line ?? `The move is there, but the shot never gets clean daylight.`,
          `${collector.name} gathers the second ball and takes the danger out of the area.`,
        ],
        insights: shotInsights,
        possessionAfter: "HOME",
        roundEnded: true,
        goalScored: false,
        attackingCard: this.toCardView(attackingCard),
        defendingCard: this.toCardView(defendingCard),
      });
    }

    if (goal) {
      this.state.stats.AWAY.shotsOnTarget += 1;
      this.state.stats.AWAY.goals += 1;
      this.state.score.AWAY += 1;
      this.resetPressure();
      return this.handleGoal(before, "AWAY", shooter, attackingCard, defendingCard, shotInsights);
    }

    if (onTarget) {
      this.state.stats.AWAY.shotsOnTarget += 1;
      const spill =
        this.rng.int(1, 100) <=
        clamp(Math.round(18 + this.state.pressure.AWAY * 0.3 + attackingCard.shootingBoost * 2 - keeper.blocking * 0.16 - shotTrait.keeperSpillPenalty), 6, 42);
      if (spill) {
        const reboundPoint = {
          x: round1(clamp(keeper.x + (goalX === 100 ? -2.4 : 2.4), 2, 98)),
          y: round1(clamp(keeper.y + this.randomBetween(-5.2, 5.2), 4, 60)),
        };
        const collector = this.pickLooseBallWinner(reboundPoint.x, reboundPoint.y, "AWAY");
        this.placeBallWithPlayer(collector, reboundPoint.x, reboundPoint.y);
        if (collector.teamId === "AWAY") {
          this.state.restart = { type: "REBOUND", teamId: "AWAY", label: "Rebound for CPU Athletic", x: reboundPoint.x, y: reboundPoint.y };
          this.raisePressure("AWAY", 18);
          return this.buildResolution(before, {
            title: "CPU Rebound Alive",
            summary: `${keeper.name} spills it into danger.`,
            commentary: [
              `The CPU force the save and ${keeper.name} cannot hold the shot.`,
              combo.line ?? shotTrait.line ?? `The sequence keeps the goalkeeper under real stress.`,
              `${collector.name} pounces on the rebound and the attack is still alive.`,
            ],
            insights: shotInsights,
            possessionAfter: "AWAY",
            roundEnded: false,
            goalScored: false,
            attackingCard: this.toCardView(attackingCard),
            defendingCard: this.toCardView(defendingCard),
          });
        }
      }

      this.state.ball.teamId = "HOME";
      this.state.ball.holderId = keeper.playerId;
      this.state.ball.x = keeper.x;
      this.state.ball.y = keeper.y;
      this.resetPressure();
      this.nudgeAttack("HOME", "GK", 1);
      return this.buildResolution(before, {
        title: "Save Made",
        summary: `${keeper.name} keeps it out.`,
        commentary: [
          `The CPU catches a glimpse of the goal and pulls the trigger.`,
          shotTrait.line ?? `${keeper.name} reads it and turns the shot away.`,
          `The round ends with ${this.labelForTeam("HOME")} back on the ball.`,
        ],
        insights: shotInsights,
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
    this.setRestart("GOAL_KICK", "HOME", "Goal kick to Blackflag City", keeper.x, keeper.y, ["GK"]);
    this.resetPressure();
    this.nudgeAttack("HOME", "GK", 1);
    return this.buildResolution(before, {
      title: "Missed",
      summary: `${shooter.name} drags it wide.`,
      commentary: [
        `The CPU goes for goal from range.`,
        combo.line ?? shotTrait.line ?? `It never troubles the goalkeeper and whistles beyond the post.`,
        `The round ends. ${this.labelForTeam("HOME")} reset and attack next.`,
      ],
      insights: shotInsights,
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
    defendingCard: DefenseCardDef,
    insights: { combo: string | null; trait: string | null; trap: string | null }
  ) {
    const concedingTeam = oppositeTeam(scoringTeam);
    this.state.restart = null;
    this.resetPressure();
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
      insights,
      possessionAfter: concedingTeam,
      roundEnded: true,
      goalScored: true,
      attackingCard: this.toCardView(attackingCard),
      defendingCard: this.toCardView(defendingCard),
    });
  }

  private buildResolution(
    before: Map<string, { x: number; y: number }>,
    data: Omit<ActionResolutionView, "animations" | "ball" | "cpuPreviewCard" | "restart" | "insights"> & {
      insights?: Partial<ActionResolutionView["insights"]>;
    }
  ): ActionResolutionView {
    const { insights, ...rest } = data;
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
      ...rest,
      insights: {
        combo: insights?.combo ?? null,
        trait: insights?.trait ?? null,
        trap: insights?.trap ?? null,
      },
      cpuPreviewCard: this.state.cpuPendingAttack ? this.toCardView(getAttackCard(this.state.cpuPendingAttack.cardId)) : null,
      ball: { ...this.state.ball },
      restart: this.state.restart ? { ...this.state.restart } : null,
      animations,
    };
  }

  private startRound(teamId: TeamId, openingLine: string, resetToCenter: boolean) {
    this.state.currentRoundTeam = teamId;
    this.state.attackRoundsThisHalf[teamId] += 1;
    this.state.restart = null;
    this.clearComboState();
    this.resetPressure();
    if (resetToCenter) {
      this.state.ball.teamId = teamId;
      this.state.ball.holderId = this.state.teams[teamId].lineup.CM.playerId;
      this.state.ball.x = 50;
      this.state.ball.y = 32;
      this.repositionPlayers();
    } else {
      this.syncBallHolderState();
    }
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
    this.state.restart = null;
    this.clearComboState();
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
      cpuTeam.playstyle = "PRESSING";
    } else if (this.state.score.AWAY > this.state.score.HOME) {
      cpuTeam.tactic = "LOW_BLOCK";
      cpuTeam.playstyle = "CONTROL";
    } else {
      cpuTeam.tactic = cpuTeam.playstyle === "WIDE" ? "WING_PLAY" : "BALANCED";
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
    const playstyle = this.state.teams.AWAY.playstyle;
    const ranked = hand
      .map((cardId) => getDefenseCard(cardId))
      .sort((a, b) => this.scoreDefenseFit(b, attackingCard, playstyle) - this.scoreDefenseFit(a, attackingCard, playstyle));
    return ranked[0];
  }

  private chooseCpuAttackCard(hand: string[]) {
    const holder = this.getBallHolder();
    const distanceTier = this.getDistanceTier(holder);
    const playstyle = this.state.teams.AWAY.playstyle;
    const ranked = hand
      .map((cardId) => getAttackCard(cardId))
      .sort((a, b) => this.scoreAttackFit(b, distanceTier, holder, playstyle) - this.scoreAttackFit(a, distanceTier, holder, playstyle));
    return ranked[0]?.id ?? hand[0];
  }

  private scoreDefenseFit(card: DefenseCardDef, attackCard: AttackCardDef, playstyle: MatchPlaystyleId) {
    if (attackCard.kind === "PASS") {
      return card.passStop + card.longBallStop + this.getDefenseStyleBias(card, attackCard, playstyle);
    }
    if (attackCard.kind === "DRIBBLE") {
      return card.dribbleStop + (card.kind === "TACKLE" ? 3 : 0) + this.getDefenseStyleBias(card, attackCard, playstyle);
    }
    return card.shotStop + (card.kind === "BLOCK" ? 4 : 0) + this.getDefenseStyleBias(card, attackCard, playstyle);
  }

  private scoreAttackFit(card: AttackCardDef, distanceTier: DistanceTier, holder: TeamRosterPlayer, playstyle: MatchPlaystyleId = "CONTROL") {
    const pressure = this.state.pressure[holder.teamId];
    if (card.kind === "SHOT") {
      return (
        (distanceTier === "CLOSE" ? 30 + card.shootingBoost : distanceTier === "MID" ? 18 + card.shootingBoost : 8 + card.shootingBoost) +
        pressure * 0.25 +
        this.getAttackStyleBias(card, playstyle, holder, distanceTier)
      );
    }
    if (card.kind === "DRIBBLE") {
      return holder.skillStars * 3 + card.flair + (distanceTier === "LONG" ? 3 : 1) + this.getAttackStyleBias(card, playstyle, holder, distanceTier);
    }
    return card.accuracy + card.flair + (distanceTier === "LONG" ? 4 : 2) + this.getAttackStyleBias(card, playstyle, holder, distanceTier);
  }

  private getAttackStyleBias(card: AttackCardDef, playstyle: MatchPlaystyleId, holder: TeamRosterPlayer, distanceTier: DistanceTier) {
    switch (playstyle) {
      case "DIRECT":
        if (card.id === "THROUGH_BALL" || card.id === "POWER_SHOT") return 10;
        if (card.id === "SWITCH_PLAY" || card.id === "CROSS") return 5;
        return distanceTier === "LONG" && card.kind === "PASS" ? 4 : 0;
      case "WIDE":
        if (card.id === "CROSS" || card.id === "OVERLAP_RUN" || card.id === "SWITCH_PLAY") return 10;
        if (holder.slotId === "LW" || holder.slotId === "RW") return 3;
        return 0;
      case "PRESSING":
        if (card.kind === "DRIBBLE") return 6;
        if (card.id === "ONE_TWO" || card.id === "THROUGH_BALL") return 5;
        return 0;
      case "CONTROL":
      default:
        if (card.id === "SHORT_PASS" || card.id === "ONE_TWO" || card.id === "HOLD_UP_PLAY") return 9;
        return card.kind === "PASS" ? 2 : 0;
    }
  }

  private getDefenseStyleBias(card: DefenseCardDef, attackCard: AttackCardDef, playstyle: MatchPlaystyleId) {
    switch (playstyle) {
      case "PRESSING":
        return card.id === "DOUBLE_PRESS" || card.id === "PRESS_TRAP" || card.kind === "TACKLE" ? 7 : 0;
      case "DIRECT":
        return attackCard.kind === "PASS" && (card.id === "TRACK_RUNNER" || card.id === "DROP_OFF") ? 5 : 0;
      case "WIDE":
        return card.id === "FORCE_WIDE" || card.id === "TRACK_RUNNER" ? 6 : 0;
      case "CONTROL":
      default:
        return card.id === "PROTECT_MIDDLE" || card.id === "SWEEP_COVER" ? 5 : 0;
    }
  }

  private getSupportBias(player: TeamRosterPlayer, cardId: string, ballHolder: TeamRosterPlayer, _ballX: number, ballY: number) {
    if (cardId === "CROSS") {
      if (player.slotId === "ST") return { x: 3.8, y: ballY < 32 ? 4 : -4 };
      if (player.slotId === "LW" || player.slotId === "RW") return { x: 2.4, y: player.slotId === "LW" ? -4.2 : 4.2 };
    }
    if (cardId === "OVERLAP_RUN") {
      if (player.slotId === "LB" || player.slotId === "RB") return { x: 4.2, y: player.slotId === "LB" ? -2.4 : 2.4 };
      if (player.slotId === "LW" || player.slotId === "RW") return { x: 1.5, y: 0 };
    }
    if (cardId === "THROUGH_BALL") {
      if (player.slotId === "ST" || player.slotId === "LW" || player.slotId === "RW") return { x: 4.6, y: 0 };
    }
    if (cardId === "HOLD_UP_PLAY") {
      if (player.slotId === "CM" || player.slotId === "LCM" || player.slotId === "RCM") {
        return { x: -1.2, y: mix(player.y, ballY, 0.2) - player.y };
      }
    }
    if (cardId === "SWITCH_PLAY") {
      const onLowSide = ballHolder.y < 32;
      if (player.slotId === (onLowSide ? "RW" : "LW")) return { x: 3.2, y: onLowSide ? 5.8 : -5.8 };
    }
    return { x: 0, y: 0 };
  }

  private getTargetRunnerBias(cardId: string, player: TeamRosterPlayer, ballHolder: TeamRosterPlayer, currentBallY: number) {
    if (cardId === "THROUGH_BALL") {
      return {
        x: player.slotId === "ST" || player.slotId === "LW" || player.slotId === "RW" ? 4.4 : 1.2,
        y: player.slotId === "LW" ? -2 : player.slotId === "RW" ? 2 : 0,
      };
    }
    if (cardId === "CROSS") {
      return {
        x: player.slotId === "ST" ? 2.6 : 0.8,
        y: player.slotId === "ST" ? (currentBallY < 32 ? 3.2 : -3.2) : 0,
      };
    }
    if (cardId === "HOLD_UP_PLAY") {
      return {
        x: ballHolder.slotId === "ST" ? -2.6 : -1,
        y: 0,
      };
    }
    if (cardId === "OVERLAP_RUN") {
      return {
        x: player.slotId === "LB" || player.slotId === "RB" ? 4 : 1,
        y: player.slotId === "LB" ? -2.4 : player.slotId === "RB" ? 2.4 : 0,
      };
    }
    return { x: 0, y: 0 };
  }

  private getPassLead(cardId: string, _player: TeamRosterPlayer, _ballX: number, ballY: number) {
    if (cardId === "HOLD_UP_PLAY") return { x: -0.6, y: 0.06 };
    if (cardId === "THROUGH_BALL") return { x: 1.3, y: 0.08 };
    if (cardId === "CROSS") return { x: 0.8, y: Math.abs(ballY - 32) * 0.008 };
    return { x: 0, y: 0 };
  }

  private getDefenseShapeBias(cardId: string, player: TeamRosterPlayer, pressRank: number, currentBallY: number, targetPlayerId?: string) {
    if (cardId === "FORCE_WIDE") {
      return { press: -0.05, cover: 0.08, lateral: player.y < currentBallY ? -1.8 : 1.8 };
    }
    if (cardId === "PROTECT_MIDDLE") {
      return { press: -0.08, cover: 0.12, lateral: player.y < 32 ? 1.1 : -1.1 };
    }
    if (cardId === "DOUBLE_PRESS") {
      return { press: pressRank <= 1 ? 0.14 : 0, cover: 0.02, lateral: 0 };
    }
    if (cardId === "DROP_OFF") {
      return { press: -0.12, cover: -0.08, lateral: 0 };
    }
    if (cardId === "TRACK_RUNNER" && targetPlayerId) {
      return { press: pressRank === 0 ? 0.02 : -0.04, cover: 0.06, lateral: player.slotId === "LB" || player.slotId === "LCB" ? -0.4 : 0.4 };
    }
    return { press: 0, cover: 0, lateral: 0 };
  }

  private getCpuPassTargets(card: AttackCardDef) {
    const holder = this.getBallHolder();
    return this.getTeamPlayers("AWAY")
      .filter((player) => player.playerId !== holder.playerId)
      .map((player) => ({
        player,
        score:
          this.previewPassChance(card, holder, player, this.measureLaneRisk("AWAY", holder.x, holder.y, player.x, player.y)) +
          this.getCpuTargetBias(card, holder, player),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.player);
  }

  private getCpuTargetBias(card: AttackCardDef, holder: TeamRosterPlayer, target: TeamRosterPlayer) {
    const forward = this.getAttackDirection("AWAY") === "RIGHT" ? target.x > holder.x : target.x < holder.x;
    if (card.id === "THROUGH_BALL") {
      return forward && (target.slotId === "ST" || target.slotId === "LW" || target.slotId === "RW") ? 12 : -4;
    }
    if (card.id === "CROSS") {
      return target.slotId === "ST" || (target.slotId === "LW" && holder.slotId === "RW") || (target.slotId === "RW" && holder.slotId === "LW") ? 10 : -2;
    }
    if (card.id === "OVERLAP_RUN") {
      return (holder.y < 32 && target.y < 32) || (holder.y >= 32 && target.y >= 32) ? 6 : -1;
    }
    if (card.id === "HOLD_UP_PLAY") {
      return target.slotId === "CM" || target.slotId === "LCM" || target.slotId === "RCM" ? 8 : 0;
    }
    return 0;
  }

  private resolveDribbleChance(card: AttackCardDef, holder: TeamRosterPlayer, targetX: number, targetY: number, defenseCard: DefenseCardDef | null) {
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

  private previewPassChance(
    card: AttackCardDef,
    passer: TeamRosterPlayer,
    target: TeamRosterPlayer,
    laneRisk: number,
    fromPoint: { x: number; y: number } = passer,
    toPoint: { x: number; y: number } = target
  ) {
    const distanceValue = distance(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
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
      laneRisk * 100 * 0.48 +
      this.getPassCardBias(card, passer, target, distanceValue);
    return clamp(Math.round(chance / 2), 5, 95);
  }

  private getPassCardBias(card: AttackCardDef, passer: TeamRosterPlayer, target: TeamRosterPlayer, distanceValue: number) {
    if (card.id === "THROUGH_BALL") {
      const forwardRun = this.getAttackDirection(passer.teamId) === "RIGHT" ? target.x > passer.x : target.x < passer.x;
      return forwardRun && (target.slotId === "ST" || target.slotId === "LW" || target.slotId === "RW") ? 10 : -4;
    }
    if (card.id === "CROSS") {
      const widePasser = passer.slotId === "LW" || passer.slotId === "RW" || passer.slotId === "LB" || passer.slotId === "RB";
      return widePasser && (target.slotId === "ST" || target.slotId === "LW" || target.slotId === "RW") ? 9 : -3;
    }
    if (card.id === "SWITCH_PLAY") {
      return Math.abs(target.y - passer.y) > 20 && distanceValue > 18 ? 8 : -2;
    }
    if (card.id === "HOLD_UP_PLAY") {
      return target.slotId === "CM" || target.slotId === "LCM" || target.slotId === "RCM" ? 8 : 0;
    }
    if (card.id === "OVERLAP_RUN") {
      const sameFlank = (passer.y < 32 && target.y < 32) || (passer.y >= 32 && target.y >= 32);
      return sameFlank && (target.slotId === "LB" || target.slotId === "RB" || target.slotId === "LW" || target.slotId === "RW") ? 7 : -2;
    }
    if (card.id === "ONE_TWO") {
      return distanceValue < 15 ? 6 : -3;
    }
    return 0;
  }

  private simulateMovementPhase(
    offenseTeam: TeamId,
    context: {
      kind: AttackCardKind;
      ballHolderId: string;
      targetX: number;
      targetY: number;
      targetPlayerId?: string;
      attackingCard: AttackCardDef;
      defendingCard: DefenseCardDef;
    }
  ): MovementPlan {
    const positions = new Map<string, { x: number; y: number }>();
    const ballHolder = this.findPlayer(context.ballHolderId);
    if (!ballHolder) return { positions };
    const currentBallX = ballHolder.x;
    const currentBallY = ballHolder.y;

    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      for (const slotId of SLOT_ORDER) {
        const player = this.state.teams[teamId].lineup[slotId];
        const desired = this.getMovementTarget(player, offenseTeam, context, ballHolder, currentBallX, currentBallY);
        const budget = this.getMovementBudget(player, context.kind, teamId === offenseTeam, player.playerId === ballHolder.playerId);
        positions.set(player.playerId, moveToward(player, desired, budget));
      }
    }

    if (context.kind === "DRIBBLE") {
      positions.set(ballHolder.playerId, { x: round1(context.targetX), y: round1(context.targetY) });
    }

    if (context.kind === "PASS" && context.targetPlayerId) {
      const target = this.findPlayer(context.targetPlayerId);
      if (target) {
        const current = positions.get(target.playerId) ?? { x: target.x, y: target.y };
        positions.set(target.playerId, {
          x: round1(clamp((current.x + context.targetX) / 2, 2, 98)),
          y: round1(clamp((current.y + context.targetY) / 2, 4, 60)),
        });
      }
    }

    return { positions };
  }

  private getMovementTarget(
    player: TeamRosterPlayer,
    offenseTeam: TeamId,
    context: {
      kind: AttackCardKind;
      targetX: number;
      targetY: number;
      targetPlayerId?: string;
      attackingCard: AttackCardDef;
      defendingCard: DefenseCardDef;
    },
    ballHolder: TeamRosterPlayer,
    currentBallX: number,
    currentBallY: number
  ) {
    if (player.role === "GK") {
      return this.getGoalkeeperTarget(player, offenseTeam, ballHolder, context, currentBallX, currentBallY);
    }

    const teamTactic = TACTIC_MODIFIERS[this.state.teams[player.teamId].tactic];
    const teamStyle = this.state.teams[player.teamId].playstyle;
    const attackDirection = this.getAttackDirection(player.teamId) === "RIGHT" ? 1 : -1;
    const baseAnchor = this.getShapeAnchor(player, offenseTeam, currentBallX, currentBallY);
    const lateralBias =
      player.slotId === "LW" || player.slotId === "LB" || player.slotId === "LCM"
        ? -1
        : player.slotId === "RW" || player.slotId === "RB" || player.slotId === "RCM"
          ? 1
          : 0;
    const lineIndex = this.getLineIndex(player.slotId);

    if (player.teamId === offenseTeam) {
      if (player.playerId === ballHolder.playerId) {
        if (context.kind === "PASS") {
          const passLead = this.getPassLead(context.attackingCard.id, player, currentBallX, currentBallY);
          return {
            x: player.x + attackDirection * (1.4 + passLead.x),
            y: player.y + (context.targetY - player.y) * (0.14 + passLead.y),
          };
        }
        if (context.kind === "DRIBBLE") {
          return { x: context.targetX, y: context.targetY };
        }
        return {
          x: player.x + attackDirection * 2.1,
          y: player.y + (32 - player.y) * 0.16,
        };
      }

      if (context.targetPlayerId && player.playerId === context.targetPlayerId) {
        const runnerBias = this.getTargetRunnerBias(context.attackingCard.id, player, ballHolder, currentBallY);
        const receiveX = mix(baseAnchor.x, context.targetX + attackDirection * (lineIndex >= 2 ? 1.8 : 1) + runnerBias.x, 0.48);
        const receiveY = mix(baseAnchor.y, context.targetY + lateralBias * 1.5 + runnerBias.y, 0.2);
        return {
          x: round1(clamp(receiveX, 2, 98)),
          y: round1(clamp(receiveY, 4, 60)),
        };
      }

      const supportBias = this.getSupportBias(player, context.attackingCard.id, ballHolder, currentBallX, currentBallY);
      const styleDepth = teamStyle === "DIRECT" ? 1.8 : teamStyle === "WIDE" ? 0.8 : teamStyle === "PRESSING" ? 1.2 : 0.5;
      const supportPush = lineIndex === 0 ? -0.8 : lineIndex === 1 ? 1.4 : 3.2;
      const supportX = baseAnchor.x + attackDirection * (supportPush + Math.max(0, teamTactic.depth) * 0.12 + styleDepth + supportBias.x);
      const supportY = mix(baseAnchor.y, currentBallY, 0.06) + lateralBias * (2.2 + teamTactic.width * 0.1) + supportBias.y;
      return {
        x: round1(clamp(supportX, 2, 98)),
        y: round1(clamp(supportY, 4, 60)),
      };
    }

    const pressRank = this.getPressRank(player, currentBallX, currentBallY);
    const defenseBias = this.getDefenseShapeBias(context.defendingCard.id, player, pressRank, currentBallY, context.targetPlayerId);
    const pressPull =
      pressRank === 0
        ? (context.defendingCard.kind === "TACKLE" ? 0.7 : context.defendingCard.kind === "MAN_MARK" ? 0.54 : 0.46) + defenseBias.press
        : pressRank === 1
          ? 0.34 + defenseBias.press * 0.6
          : 0.14 + defenseBias.press * 0.2;
    const coverTargetX = mix(baseAnchor.x, currentBallX - attackDirection * (lineIndex === 0 ? 8 : lineIndex === 1 ? 6 : 4), 0.26 + defenseBias.cover);
    const coverTargetY = mix(baseAnchor.y, currentBallY, pressRank <= 1 ? 0.16 : 0.05 + defenseBias.cover * 0.08);
    const markBias = context.targetPlayerId && pressRank <= 1 ? (player.y < currentBallY ? 0.7 : -0.7) : lateralBias * -0.6 + defenseBias.lateral;
    return {
      x: round1(clamp(mix(coverTargetX, currentBallX, pressPull), 2, 98)),
      y: round1(clamp(mix(coverTargetY, currentBallY + markBias, pressPull), 4, 60)),
    };
  }

  private getMovementBudget(player: TeamRosterPlayer, kind: AttackCardKind, isOffense: boolean, isBallHolder: boolean) {
    const paceFactor = (player.stats.pac - 40) / 60;
    let budget = 2.2 + paceFactor * 4.1;
    if (isOffense) budget += 0.6;
    if (isBallHolder && kind === "DRIBBLE") budget += 2.8;
    if (kind === "SHOT") budget -= 0.4;
    return clamp(round1(budget), 1.6, 8.8);
  }

  private getGoalkeeperTarget(
    player: TeamRosterPlayer,
    offenseTeam: TeamId,
    ballHolder: TeamRosterPlayer,
    context: {
      kind: AttackCardKind;
      targetX: number;
      targetY: number;
    },
    currentBallX: number,
    currentBallY: number
  ) {
    const template = SLOT_TEMPLATE.GK;
    const baseX = player.side === "LEFT" ? template.x : PITCH_LENGTH - template.x;
    const baseY = template.y;
    const attackDirection = this.getAttackDirection(player.teamId) === "RIGHT" ? 1 : -1;
    const ownGoalX = attackDirection === 1 ? 0 : 100;
    const sweepAnchorX = ownGoalX + (currentBallX - ownGoalX) * 0.08;
    const sweepAnchorY = mix(baseY, currentBallY, 0.16);

    if (player.teamId === offenseTeam && player.playerId === ballHolder.playerId) {
      if (context.kind === "DRIBBLE") {
        return {
          x: round1(clamp(context.targetX, baseX - 6, baseX + 12)),
          y: round1(clamp(context.targetY, 18, 46)),
        };
      }

      return {
        x: round1(clamp(player.x + attackDirection * 1.2, baseX - 4, baseX + 10)),
        y: round1(clamp(player.y + (context.targetY - player.y) * 0.18, 18, 46)),
      };
    }

    return {
      x: round1(clamp(mix(player.x, sweepAnchorX, 0.45), baseX - 2, baseX + 6)),
      y: round1(clamp(mix(player.y, sweepAnchorY, 0.4), 20, 44)),
    };
  }

  private getShapeAnchor(player: TeamRosterPlayer, offenseTeam: TeamId, ballX: number, ballY: number) {
    const template = SLOT_TEMPLATE[player.slotId];
    const attackDirection = this.getAttackDirection(player.teamId) === "RIGHT" ? 1 : -1;
    const ownGoalX = attackDirection === 1 ? 0 : 100;
    const teamTactic = TACTIC_MODIFIERS[this.state.teams[player.teamId].tactic];
    const playstyle = this.state.teams[player.teamId].playstyle;
    const baseX = player.side === "LEFT" ? template.x : PITCH_LENGTH - template.x;
    const centeredY = template.y - 32;
    const styleWidth = playstyle === "WIDE" ? 4.8 : playstyle === "CONTROL" ? 1.2 : -0.8;
    const styleDepth = playstyle === "DIRECT" ? 3.2 : playstyle === "PRESSING" ? 1.8 : 0.4;
    const widthAdjust = centeredY > 0 ? teamTactic.width + styleWidth : -(teamTactic.width + styleWidth);
    const baseY = template.y + widthAdjust * 0.3;
    const lineIndex = this.getLineIndex(player.slotId);

    if (player.teamId === offenseTeam) {
      const ballProgress = attackDirection === 1 ? clamp01(ballX / 100) : clamp01((100 - ballX) / 100);
      const linePush = (lineIndex === 0 ? 3.2 : lineIndex === 1 ? 7.5 : 12.5) + styleDepth;
      return {
        x: round1(clamp(baseX + attackDirection * (ballProgress * (linePush + teamTactic.depth * 0.4)), 2, 98)),
        y: round1(clamp(baseY + (ballY - baseY) * (lineIndex === 2 ? 0.1 : 0.06), 4, 60)),
      };
    }

    const styleDrop = playstyle === "PRESSING" ? 0.05 : playstyle === "CONTROL" ? -0.03 : 0;
    const lineRatio = (lineIndex === 0 ? 0.54 : lineIndex === 1 ? 0.67 : 0.78) + styleDrop;
    const coverX = ownGoalX + (ballX - ownGoalX) * lineRatio;
    return {
      x: round1(clamp(mix(baseX, coverX, 0.58), 2, 98)),
      y: round1(clamp(baseY + (ballY - baseY) * (lineIndex === 0 ? 0.06 : 0.1), 4, 60)),
    };
  }

  private getLineIndex(slotId: SlotId) {
    if (slotId === "LB" || slotId === "LCB" || slotId === "RCB" || slotId === "RB") return 0;
    if (slotId === "LCM" || slotId === "CM" || slotId === "RCM") return 1;
    return 2;
  }

  private getPressRank(player: TeamRosterPlayer, ballX: number, ballY: number) {
    const defenders = this.getTeamPlayers(player.teamId)
      .filter((candidate) => candidate.slotId !== "GK")
      .slice()
      .sort((a, b) => distance(a.x, a.y, ballX, ballY) - distance(b.x, b.y, ballX, ballY));
    return defenders.findIndex((candidate) => candidate.playerId === player.playerId);
  }

  private applyMovementPlan(plan: MovementPlan) {
    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      for (const slotId of SLOT_ORDER) {
        const player = this.state.teams[teamId].lineup[slotId];
        const point = plan.positions.get(player.playerId);
        if (!point) continue;
        player.x = point.x;
        player.y = point.y;
      }
    }
  }

  private getMovedPoint(plan: MovementPlan, player: TeamRosterPlayer) {
    return plan.positions.get(player.playerId) ?? { x: player.x, y: player.y };
  }

  private getMovedTeamPlayers(teamId: TeamId, plan: MovementPlan) {
    return this.getTeamPlayers(teamId).map((player) => {
      const point = this.getMovedPoint(plan, player);
      return { ...player, x: point.x, y: point.y };
    });
  }

  private findPassPressure(teamId: TeamId, fromX: number, fromY: number, toX: number, toY: number, plan: MovementPlan) {
    const candidates: PressureCandidate[] = [];
    for (const defender of this.getTeamPlayers(teamId).filter((player) => player.slotId !== "GK")) {
      const end = this.getMovedPoint(plan, defender);
      const proximity = Math.min(
        distancePointToSegment(defender.x, defender.y, fromX, fromY, toX, toY),
        distancePointToSegment(end.x, end.y, fromX, fromY, toX, toY),
        distanceSegmentToSegment(defender.x, defender.y, end.x, end.y, fromX, fromY, toX, toY)
      );
      const alongLane = projectionOnSegment(end.x, end.y, fromX, fromY, toX, toY);
      if (proximity > PASS_PRESSURE_RADIUS || alongLane <= 0.1 || alongLane >= 0.9) continue;
      candidates.push({ player: defender, proximity });
    }
    return candidates.sort((a, b) => a.proximity - b.proximity || b.player.blocking - a.player.blocking);
  }

  private findDribblePressure(teamId: TeamId, fromX: number, fromY: number, toX: number, toY: number, plan: MovementPlan) {
    const candidates: PressureCandidate[] = [];
    for (const defender of this.getTeamPlayers(teamId).filter((player) => player.slotId !== "GK")) {
      const end = this.getMovedPoint(plan, defender);
      const proximity = Math.min(
        distance(defender.x, defender.y, toX, toY),
        distance(end.x, end.y, toX, toY),
        distanceSegmentToSegment(defender.x, defender.y, end.x, end.y, fromX, fromY, toX, toY)
      );
      if (proximity > DRIBBLE_PRESSURE_RADIUS) continue;
      candidates.push({ player: defender, proximity });
    }
    return candidates.sort((a, b) => a.proximity - b.proximity || b.player.blocking - a.player.blocking);
  }

  private measureLaneRisk(teamId: TeamId, fromX: number, fromY: number, toX: number, toY: number) {
    const plan: MovementPlan = { positions: new Map() };
    const pressure = this.findPassPressure(oppositeTeam(teamId), fromX, fromY, toX, toY, plan);
    return clamp(
      pressure.reduce((sum, candidate) => sum + (1 - candidate.proximity / PASS_PRESSURE_RADIUS) * (candidate.player.blocking / 100) * PASS_PRESSURE_WEIGHT, 0),
      0,
      1
    );
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
        score: this.resolveDribbleChance(card, holder, point.x, point.y, null) + this.getCpuDribbleBias(card, holder, point.x, point.y),
      }))
      .sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  private getCpuDribbleBias(card: AttackCardDef, holder: TeamRosterPlayer, x: number, y: number) {
    if (card.id === "CUT_INSIDE") {
      return 8 - Math.abs(y - 32);
    }
    if (card.id === "BURST_RUN") {
      return this.getAttackDirection("AWAY") === "RIGHT" ? x - holder.x : holder.x - x;
    }
    if (card.id === "BODY_FEINT") {
      return 5 - Math.abs(y - holder.y);
    }
    return 0;
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

  private syncBallHolderState() {
    for (const teamId of ["HOME", "AWAY"] as TeamId[]) {
      for (const slotId of SLOT_ORDER) {
        this.state.teams[teamId].lineup[slotId].hasBall = false;
      }
    }

    const holder = this.findPlayer(this.state.ball.holderId);
    if (!holder) {
      return;
    }

    holder.hasBall = true;
    holder.x = round1(this.state.ball.x);
    holder.y = round1(this.state.ball.y);
  }

  private projectLoosePassPoint(fromX: number, fromY: number, toX: number, toY: number) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy) || 1;
    const overshoot = Math.min(4.5, Math.max(1.5, length * 0.16));
    return {
      x: round1(clamp(toX + (dx / length) * overshoot, 2, 98)),
      y: round1(clamp(toY + (dy / length) * overshoot, 4, 60)),
    };
  }

  private pickLooseBallWinner(x: number, y: number, favoredTeam: TeamId | null = null) {
    return this.getPitchPlayers()
      .map((player) => this.findPlayer(player.playerId)!)
      .slice()
      .sort((a, b) => this.looseBallRecoveryScore(a, x, y, favoredTeam) - this.looseBallRecoveryScore(b, x, y, favoredTeam))[0];
  }

  private looseBallRecoveryScore(player: TeamRosterPlayer, x: number, y: number, favoredTeam: TeamId | null) {
    let score = distance(player.x, player.y, x, y) - player.stats.pac * 0.025 - player.agility * 0.01;
    if (favoredTeam && player.teamId === favoredTeam) score -= 1.1;
    if (player.slotId === "GK") score += 3;
    return score;
  }

  private placeBallWithPlayer(player: TeamRosterPlayer, x: number, y: number) {
    this.state.ball.teamId = player.teamId;
    this.state.ball.holderId = player.playerId;
    this.state.ball.x = round1(clamp(x, 2, 98));
    this.state.ball.y = round1(clamp(y, 4, 60));
    player.x = this.state.ball.x;
    player.y = this.state.ball.y;
    this.syncBallHolderState();
  }

  private setRestart(type: MatchRestartType, teamId: TeamId, label: string, x: number, y: number, preferredSlots: SlotId[]) {
    const taker = this.pickRestartTaker(teamId, preferredSlots, x, y);
    this.state.restart = { type, teamId, label, x: round1(clamp(x, 2, 98)), y: round1(clamp(y, 4, 60)) };
    this.placeBallWithPlayer(taker, x, y);
  }

  private pickRestartTaker(teamId: TeamId, preferredSlots: SlotId[], x: number, y: number) {
    const preferred = preferredSlots.map((slotId) => this.state.teams[teamId].lineup[slotId]).filter(Boolean);
    const pool = preferred.length > 0 ? preferred : this.getTeamPlayers(teamId);
    return pool.slice().sort((a, b) => distance(a.x, a.y, x, y) - distance(b.x, b.y, x, y))[0];
  }

  private raisePressure(teamId: TeamId, amount: number) {
    this.state.pressure[teamId] = clamp(Math.round(this.state.pressure[teamId] + amount), 0, 100);
    const otherTeam = oppositeTeam(teamId);
    this.state.pressure[otherTeam] = clamp(Math.round(this.state.pressure[otherTeam] - amount * 0.45), 0, 100);
  }

  private resetPressure() {
    this.state.pressure.HOME = 0;
    this.state.pressure.AWAY = 0;
  }

  private getPassPressureGain(attackingCard: AttackCardDef, from: { x: number; y: number }, to: { x: number; y: number }) {
    const distanceValue = distance(from.x, from.y, to.x, to.y);
    if (attackingCard.id === "THROUGH_BALL") return 13;
    if (attackingCard.id === "CROSS") return 12;
    if (attackingCard.id === "OVERLAP_RUN") return 11;
    return distanceValue > 18 ? 9 : 6;
  }

  private getDribblePressureGain(attackingCard: AttackCardDef, movedHolder: { x: number; y: number }, holder: TeamRosterPlayer) {
    const progress = this.getAttackDirection(holder.teamId) === "RIGHT" ? movedHolder.x - holder.x : holder.x - movedHolder.x;
    return clamp(Math.round(7 + progress * 0.8 + attackingCard.flair * 0.4), 5, 16);
  }

  private shouldAwardAttackingThrowIn(attackingCard: AttackCardDef, movedTarget: { x: number; y: number }, proximity: number) {
    return (attackingCard.id === "SWITCH_PLAY" || attackingCard.id === "CROSS" || attackingCard.id === "OVERLAP_RUN") && this.isNearTouchline(movedTarget.y) && proximity < 1.35;
  }

  private isNearTouchline(y: number) {
    return y < 8 || y > 56;
  }

  private getTouchlineRestartPoint(x: number, y: number) {
    return {
      x: round1(clamp(x, 4, 96)),
      y: y < 32 ? 4 : 60,
    };
  }

  private getCornerPoint(teamId: TeamId, y: number) {
    const attackDirection = this.getAttackDirection(teamId);
    return {
      x: attackDirection === "RIGHT" ? 100 : 0,
      y: y < 32 ? 4 : 60,
    };
  }

  private shouldAwardCorner(teamId: TeamId, point: { x: number; y: number }) {
    const attackDirection = this.getAttackDirection(teamId);
    return attackDirection === "RIGHT" ? point.x > 92 : point.x < 8;
  }

  private getThrowInSlots(y: number): SlotId[] {
    return y < 32 ? ["LB", "LW", "LCM"] : ["RB", "RW", "RCM"];
  }

  private isCleanTackleWindow(pressure: PressureCandidate, defendingCard: DefenseCardDef, extraWindow = 0) {
    return pressure.proximity < 1.3 + extraWindow || defendingCard.id === "DOUBLE_PRESS" || defendingCard.id === "DOUBLE_TEAM" || defendingCard.kind === "TACKLE";
  }

  private randomBetween(min: number, max: number) {
    return min + this.rng.next() * (max - min);
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
      archetypeName: player.archetypeName,
      traits: [...player.traits],
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

function buildTeamRoster(teamId: TeamId, label: string, side: SideId, rawPlayers: RawCollectionPlayer[], playstyle: MatchPlaystyleId): TeamRosterState {
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
    tactic: teamId === "HOME" ? "BALANCED" : playstyle === "WIDE" ? "WING_PLAY" : playstyle === "DIRECT" ? "DIRECT" : "BALANCED",
    playstyle,
    substitutionsUsed: 0,
    decks: {
      attackDraw: shuffleArray(ATTACK_DECK_TEMPLATE),
      attackDiscard: [],
      defenseDraw: shuffleArray(DEFENSE_DECK_TEMPLATE),
      defenseDiscard: [],
    },
  };
}

function buildCpuPlayerPool(rawPlayers: RawCollectionPlayer[]) {
  return rawPlayers.map((player, index) => ({
    ...player,
    id: `CPU_${player.id}_${index + 1}`,
    name: CPU_NAMES[index % CPU_NAMES.length],
  }));
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
    archetypeName: rawPlayer.archetypeName ?? "Balanced",
    traits: [...(rawPlayer.traits ?? [])],
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

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
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

function moveToward(from: { x: number; y: number }, to: { x: number; y: number }, maxDistance: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= maxDistance || length < 0.0001) {
    return {
      x: round1(clamp(to.x, 2, 98)),
      y: round1(clamp(to.y, 4, 60)),
    };
  }
  const scale = maxDistance / length;
  return {
    x: round1(clamp(from.x + dx * scale, 2, 98)),
    y: round1(clamp(from.y + dy * scale, 4, 60)),
  };
}

function distanceSegmentToSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
) {
  return Math.min(
    distancePointToSegment(ax, ay, cx, cy, dx, dy),
    distancePointToSegment(bx, by, cx, cy, dx, dy),
    distancePointToSegment(cx, cy, ax, ay, bx, by),
    distancePointToSegment(dx, dy, ax, ay, bx, by)
  );
}
