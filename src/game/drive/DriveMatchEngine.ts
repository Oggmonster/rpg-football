import type { CollectionPlayer } from "../profile/ProfileStore";
import type { TeamCommandType } from "../../sim/state/MatchState";
import { RNG } from "../../sim/math/RNG";

export type TeamId = "HOME" | "AWAY";
export type DeckKind = "OFFENSE" | "DEFENSE";
export type Lane = "LEFT" | "CENTER" | "RIGHT";
export type UtilityAction = never;
export type TokenId = "GK" | "LB" | "CB" | "RB" | "CM" | "LW" | "AM" | "RW" | "ST";

type OffenseKind = "PASS" | "DRIBBLE" | "CROSS" | "SHOT";
type DefenseKind = "PRESS" | "TACKLE" | "INTERCEPT" | "BLOCK" | "SHAPE";

export interface TeamRatings {
  offense: number;
  defense: number;
  identity: string;
  starNames: string[];
}

export interface MatchClockView {
  half: number;
  minute: number;
  turnsRemaining: number;
}

export interface TeamCommandState {
  id: TeamCommandType;
  label: string;
  description: string;
  used: boolean;
}

export interface PlayCardView {
  id: string;
  name: string;
  deck: DeckKind;
  lane: Lane | "ANY";
  description: string;
}

export interface TargetOption {
  id: TokenId;
  label: string;
  lane: Lane;
  zone: number;
  description: string;
  bonus: number;
}

export interface BoardToken {
  id: TokenId;
  teamId: TeamId;
  lane: Lane;
  zone: number;
  hasBall: boolean;
  roleLabel: string;
}

interface OffenseCardDef extends PlayCardView {
  deck: "OFFENSE";
  kind: OffenseKind;
  advance: number;
  risk: number;
  accuracy: number;
  craft: number;
  dribble: number;
  finishing: number;
  pressureResist: number;
  preferredLane?: Lane;
  targetLane?: Lane;
}

interface DefenseCardDef extends PlayCardView {
  deck: "DEFENSE";
  kind: DefenseKind;
  passStop: number;
  dribbleStop: number;
  shotStop: number;
  pressure: number;
  turnover: number;
}

export interface PlayResult {
  summary: string;
  detail: string;
  userDeck: DeckKind;
  offenseTeam: TeamId;
  offenseCardId: string;
  defenseCardId: string;
  userCardId: string;
  commandId: TeamCommandType | null;
  zoneBefore: number;
  zoneAfter: number;
  laneBefore: Lane;
  laneAfter: Lane;
  possessionBefore: TeamId;
  possessionAfter: TeamId;
  momentumBefore: number;
  momentumAfter: number;
  turnBefore: number;
  turnAfter: number;
  scoreBefore: Record<TeamId, number>;
  scoreAfter: Record<TeamId, number>;
  tags: string[];
}

export interface DriveMatchSetup {
  rngSeed?: number;
  homeLabel?: string;
  awayLabel?: string;
  homeRatings?: TeamRatings;
  awayRatings?: TeamRatings;
  teamCommands?: TeamCommandType[];
}

export interface DriveMatchState {
  homeLabel: string;
  awayLabel: string;
  score: Record<TeamId, number>;
  possession: TeamId;
  zone: number;
  lane: Lane;
  ballHolderId: TokenId;
  momentum: number;
  turn: number;
  userHands: Record<DeckKind, string[]>;
  userDraw: Record<DeckKind, string[]>;
  userDiscard: Record<DeckKind, string[]>;
  commands: TeamCommandState[];
  lastPlay: PlayResult | null;
  history: PlayResult[];
  ratings: Record<TeamId, TeamRatings>;
  winner: TeamId | "DRAW" | null;
}

type CommandBonus = {
  id: TeamCommandType;
  attack: number;
  defense: number;
  turnover: number;
  lane: Lane | "ANY";
  requiresWide?: boolean;
  requiresCenter?: boolean;
  requiresLate?: boolean;
};

const HAND_SIZE = 4;
const TOTAL_TURNS = 18;
const TURNS_PER_HALF = 9;
const MAX_MOMENTUM = 6;
const LAST_ZONE = 6;
const BOX_ZONE_HOME = 5;
const BOX_ZONE_AWAY = 1;

const OFFENSE_CARDS: OffenseCardDef[] = [
  {
    id: "SAFE_PASS",
    deck: "OFFENSE",
    name: "Safe Pass",
    lane: "ANY",
    kind: "PASS",
    advance: 1,
    risk: 1,
    accuracy: 7,
    craft: 4,
    dribble: 0,
    finishing: 0,
    pressureResist: 4,
    description: "Keep it simple, move the ball, keep the shape.",
  },
  {
    id: "THROUGH_BALL",
    deck: "OFFENSE",
    name: "Through Ball",
    lane: "CENTER",
    kind: "PASS",
    advance: 2,
    risk: 4,
    accuracy: 5,
    craft: 8,
    dribble: 0,
    finishing: 0,
    pressureResist: 1,
    preferredLane: "CENTER",
    targetLane: "CENTER",
    description: "Break lines if the lane is open. Deadly or reckless.",
  },
  {
    id: "SWITCH_LEFT",
    deck: "OFFENSE",
    name: "Switch Left",
    lane: "LEFT",
    kind: "PASS",
    advance: 1,
    risk: 2,
    accuracy: 6,
    craft: 5,
    dribble: 0,
    finishing: 0,
    pressureResist: 3,
    preferredLane: "LEFT",
    targetLane: "LEFT",
    description: "Whip the play into the left lane and stretch the block.",
  },
  {
    id: "SWITCH_RIGHT",
    deck: "OFFENSE",
    name: "Switch Right",
    lane: "RIGHT",
    kind: "PASS",
    advance: 1,
    risk: 2,
    accuracy: 6,
    craft: 5,
    dribble: 0,
    finishing: 0,
    pressureResist: 3,
    preferredLane: "RIGHT",
    targetLane: "RIGHT",
    description: "Drag the defense and hit the far wing before it recovers.",
  },
  {
    id: "DRIBBLE_LEFT",
    deck: "OFFENSE",
    name: "Dribble Left",
    lane: "LEFT",
    kind: "DRIBBLE",
    advance: 1,
    risk: 3,
    accuracy: 0,
    craft: 4,
    dribble: 7,
    finishing: 0,
    pressureResist: 5,
    preferredLane: "LEFT",
    targetLane: "LEFT",
    description: "Invite the duel and burst down the left channel.",
  },
  {
    id: "DRIBBLE_CENTER",
    deck: "OFFENSE",
    name: "Dribble Center",
    lane: "CENTER",
    kind: "DRIBBLE",
    advance: 1,
    risk: 3,
    accuracy: 0,
    craft: 5,
    dribble: 7,
    finishing: 0,
    pressureResist: 5,
    preferredLane: "CENTER",
    targetLane: "CENTER",
    description: "Carry through the middle and force the block to collapse.",
  },
  {
    id: "CROSS",
    deck: "OFFENSE",
    name: "Cross",
    lane: "ANY",
    kind: "CROSS",
    advance: 1,
    risk: 3,
    accuracy: 5,
    craft: 6,
    dribble: 0,
    finishing: 0,
    pressureResist: 2,
    targetLane: "CENTER",
    description: "Serve from wide areas into the danger lane.",
  },
  {
    id: "SNAP_SHOT",
    deck: "OFFENSE",
    name: "Snap Shot",
    lane: "ANY",
    kind: "SHOT",
    advance: 0,
    risk: 4,
    accuracy: 0,
    craft: 0,
    dribble: 0,
    finishing: 7,
    pressureResist: 0,
    description: "Hit it early before the keeper and block reset.",
  },
  {
    id: "CURLED_SHOT",
    deck: "OFFENSE",
    name: "Curled Shot",
    lane: "CENTER",
    kind: "SHOT",
    advance: 0,
    risk: 5,
    accuracy: 0,
    craft: 0,
    dribble: 0,
    finishing: 8,
    pressureResist: 0,
    preferredLane: "CENTER",
    description: "Open your body and bend one toward the far corner.",
  },
];

const DEFENSE_CARDS: DefenseCardDef[] = [
  {
    id: "PRESS_LEFT",
    deck: "DEFENSE",
    name: "Press Left",
    lane: "LEFT",
    kind: "PRESS",
    passStop: 3,
    dribbleStop: 4,
    shotStop: 1,
    pressure: 6,
    turnover: 2,
    description: "Swarm the left lane and choke the receiver's first touch.",
  },
  {
    id: "PRESS_CENTER",
    deck: "DEFENSE",
    name: "Press Center",
    lane: "CENTER",
    kind: "PRESS",
    passStop: 3,
    dribbleStop: 4,
    shotStop: 1,
    pressure: 6,
    turnover: 2,
    description: "Crowd the pivot and make central combinations ugly.",
  },
  {
    id: "PRESS_RIGHT",
    deck: "DEFENSE",
    name: "Press Right",
    lane: "RIGHT",
    kind: "PRESS",
    passStop: 3,
    dribbleStop: 4,
    shotStop: 1,
    pressure: 6,
    turnover: 2,
    description: "Shut the right touchline and trap the carrier there.",
  },
  {
    id: "STAND_TACKLE",
    deck: "DEFENSE",
    name: "Stand Tackle",
    lane: "ANY",
    kind: "TACKLE",
    passStop: 1,
    dribbleStop: 6,
    shotStop: 2,
    pressure: 3,
    turnover: 5,
    description: "Step in cleanly and try to win it outright.",
  },
  {
    id: "INTERCEPT",
    deck: "DEFENSE",
    name: "Intercept Lanes",
    lane: "CENTER",
    kind: "INTERCEPT",
    passStop: 6,
    dribbleStop: 1,
    shotStop: 1,
    pressure: 2,
    turnover: 5,
    description: "Read the passing lane and cut out the thread.",
  },
  {
    id: "DROP_BACK",
    deck: "DEFENSE",
    name: "Drop Back",
    lane: "ANY",
    kind: "SHAPE",
    passStop: 3,
    dribbleStop: 2,
    shotStop: 5,
    pressure: 1,
    turnover: 1,
    description: "Protect the box and force the attack wide or backwards.",
  },
  {
    id: "BLOCK_SHOT",
    deck: "DEFENSE",
    name: "Block Shot",
    lane: "ANY",
    kind: "BLOCK",
    passStop: 1,
    dribbleStop: 1,
    shotStop: 7,
    pressure: 2,
    turnover: 2,
    description: "Sell out to smother the release point.",
  },
];

const OFFENSE_LOOKUP = new Map(OFFENSE_CARDS.map((card) => [card.id, card]));
const DEFENSE_LOOKUP = new Map(DEFENSE_CARDS.map((card) => [card.id, card]));

const USER_OFFENSE_DECK = [
  "SAFE_PASS",
  "SAFE_PASS",
  "THROUGH_BALL",
  "SWITCH_LEFT",
  "SWITCH_RIGHT",
  "DRIBBLE_LEFT",
  "DRIBBLE_CENTER",
  "CROSS",
  "SNAP_SHOT",
  "CURLED_SHOT",
];

const USER_DEFENSE_DECK = [
  "PRESS_LEFT",
  "PRESS_CENTER",
  "PRESS_RIGHT",
  "STAND_TACKLE",
  "INTERCEPT",
  "DROP_BACK",
  "BLOCK_SHOT",
  "PRESS_CENTER",
  "STAND_TACKLE",
  "DROP_BACK",
];

const COMMAND_TEXT: Record<TeamCommandType, { label: string; description: string }> = {
  ALL_OUT_ATTACK: {
    label: "All Out Attack",
    description: "Push more bodies into the final third for one decisive action.",
  },
  PARK_THE_BUS: {
    label: "Park the Bus",
    description: "Pack the box and dare the opponent to find a clean look.",
  },
  FAST_COUNTER: {
    label: "Fast Counter",
    description: "Explode immediately after a regain before the CPU sets shape.",
  },
  HIGH_PRESS: {
    label: "High Press",
    description: "Turn the next defensive action into a trap up the pitch.",
  },
  SLOW_BUILD_UP: {
    label: "Slow Build-Up",
    description: "Trade tempo for cleaner circulation on the next attacking move.",
  },
  WING_OVERLOAD: {
    label: "Wing Overload",
    description: "Buff wide combinations and crosses on the next action.",
  },
  MIDFIELD_LOCKDOWN: {
    label: "Midfield Lockdown",
    description: "Crush central progression on the next defensive action.",
  },
  TARGET_MAN_PLAY: {
    label: "Target Man Play",
    description: "Lean into central deliveries and box occupation.",
  },
  FLUID_FORMATION: {
    label: "Fluid Formation",
    description: "Adaptive bonus that smooths over the next matchup.",
  },
  LAST_10_MINUTES_FURY: {
    label: "Last 10 Minutes Fury",
    description: "Late-game chaos. Higher upside, higher variance.",
  },
};

export class DriveMatchEngine {
  private readonly rng: RNG;
  private readonly state: DriveMatchState;

  constructor(setup: DriveMatchSetup = {}) {
    this.rng = new RNG(setup.rngSeed ?? 1337);
    this.state = {
      homeLabel: setup.homeLabel ?? "Blackflag Union",
      awayLabel: setup.awayLabel ?? "Division Rivals",
      score: { HOME: 0, AWAY: 0 },
      possession: "HOME",
      zone: 3,
      lane: "CENTER",
      ballHolderId: "CM",
      momentum: 0,
      turn: 0,
      userHands: { OFFENSE: [], DEFENSE: [] },
      userDraw: {
        OFFENSE: this.shuffle(USER_OFFENSE_DECK),
        DEFENSE: this.shuffle(USER_DEFENSE_DECK),
      },
      userDiscard: { OFFENSE: [], DEFENSE: [] },
      commands: (setup.teamCommands ?? [
        "ALL_OUT_ATTACK",
        "PARK_THE_BUS",
        "FAST_COUNTER",
        "HIGH_PRESS",
        "FLUID_FORMATION",
      ]).map((id) => ({
        id,
        used: false,
        label: COMMAND_TEXT[id].label,
        description: COMMAND_TEXT[id].description,
      })),
      lastPlay: null,
      history: [],
      ratings: {
        HOME: setup.homeRatings ?? defaultTeamRatings("Balanced", ["Captain", "Runner", "Playmaker"]),
        AWAY: setup.awayRatings ?? defaultTeamRatings("Reactive", ["Vex", "Crow", "Stone"]),
      },
      winner: null,
    };
    this.refillHand("OFFENSE");
    this.refillHand("DEFENSE");
  }

  getState() {
    return this.state;
  }

  getClockView(): MatchClockView {
    const minute = Math.min(90, this.state.turn * 5 + 1);
    return {
      half: this.state.turn < TURNS_PER_HALF ? 1 : 2,
      minute,
      turnsRemaining: Math.max(0, TOTAL_TURNS - this.state.turn),
    };
  }

  getUserDeckKind(): DeckKind {
    return this.state.possession === "HOME" ? "OFFENSE" : "DEFENSE";
  }

  getUserHand() {
    const deck = this.getUserDeckKind();
    const lookup = deck === "OFFENSE" ? OFFENSE_LOOKUP : DEFENSE_LOOKUP;
    return this.state.userHands[deck]
      .map((id) => lookup.get(id))
      .filter(Boolean) as PlayCardView[];
  }

  getTargetOptions(cardId: string): TargetOption[] {
    if (this.getUserDeckKind() !== "OFFENSE") return [];
    const card = OFFENSE_LOOKUP.get(cardId);
    if (!card) return [];
    return buildTargetOptions(this.state, card);
  }

  getBoardTokens() {
    return buildBoardTokens(this.state);
  }

  getCommandStates() {
    return this.state.commands;
  }

  canUseUtility(_action: UtilityAction) {
    return false;
  }

  playUserCard(cardId: string, commandId?: TeamCommandType, targetId?: TokenId) {
    if (this.state.winner) {
      throw new Error("Match already ended");
    }

    const userDeck = this.getUserDeckKind();
    if (!this.state.userHands[userDeck].includes(cardId)) {
      throw new Error(`Card ${cardId} is not in hand`);
    }

    if (userDeck === "OFFENSE") {
      const offenseCard = getOffenseCard(cardId);
      const defenseCard = this.chooseAiDefenseCard(offenseCard);
      const target = pickTargetOption(this.state, offenseCard, targetId);
      return this.resolvePlay(offenseCard, defenseCard, cardId, commandId, target);
    }

    const defenseCard = getDefenseCard(cardId);
    const offenseCard = this.chooseAiOffenseCard();
    return this.resolvePlay(offenseCard, defenseCard, cardId, commandId, null);
  }

  private resolvePlay(
    offenseCard: OffenseCardDef,
    defenseCard: DefenseCardDef,
    userCardId: string,
    commandId?: TeamCommandType,
    target: TargetOption | null = null
  ) {
    const offenseTeam = this.state.possession;
    const defenseTeam = oppositeTeam(offenseTeam);
    const userDeck = this.getUserDeckKind();
    const command = this.consumeCommand(commandId, userDeck, offenseCard, defenseCard);
    const scoreBefore = { ...this.state.score };
    const zoneBefore = this.state.zone;
    const laneBefore = this.state.lane;
    const possessionBefore = this.state.possession;
    const momentumBefore = this.state.momentum;
    const turnBefore = this.state.turn;
    const attackRating =
      (this.state.ratings[offenseTeam].offense - this.state.ratings[defenseTeam].defense) / 8;
    const momentumEdge = offenseTeam === "HOME" ? this.state.momentum : -this.state.momentum;
    const laneBonus = laneMatchBonus(this.state.lane, offenseCard, defenseCard, command, target);
    const situation = this.getSituationBonus(offenseCard, defenseCard, command, offenseTeam, target);
    const randomSwing = this.rng.int(-3, 3);
    const tags: string[] = [];

    let attackScore =
      Math.round(attackRating) +
      Math.round(momentumEdge * 0.5) +
      laneBonus +
      situation +
      randomSwing;
    if (offenseCard.kind === "PASS" || offenseCard.kind === "CROSS") {
      attackScore += offenseCard.accuracy + offenseCard.craft;
    } else if (offenseCard.kind === "DRIBBLE") {
      attackScore += offenseCard.dribble + offenseCard.craft;
    } else {
      attackScore += offenseCard.finishing;
    }

    let defenseScore = 0;
    if (offenseCard.kind === "PASS" || offenseCard.kind === "CROSS") {
      defenseScore += defenseCard.passStop + defenseCard.pressure;
    } else if (offenseCard.kind === "DRIBBLE") {
      defenseScore += defenseCard.dribbleStop + defenseCard.pressure;
    } else {
      defenseScore += defenseCard.shotStop + defenseCard.pressure;
    }
    defenseScore += command?.defense ?? 0;

    const margin = attackScore - defenseScore;
    let zoneAfter = this.state.zone;
    let laneAfter = this.state.lane;
    let possessionAfter = this.state.possession;
    let summary = "";
    let detail = `${offenseCard.name} meets ${defenseCard.name}.`;

    if (offenseCard.kind === "SHOT") {
      const shot = this.resolveShot(offenseCard, defenseCard, margin, offenseTeam, target);
      zoneAfter = shot.zoneAfter;
      laneAfter = shot.laneAfter;
      possessionAfter = shot.possessionAfter;
      summary = shot.summary;
      detail = shot.detail;
      tags.push(...shot.tags);
    } else {
      const progression = this.resolveProgression(offenseCard, defenseCard, margin, offenseTeam, target);
      zoneAfter = progression.zoneAfter;
      laneAfter = progression.laneAfter;
      possessionAfter = progression.possessionAfter;
      summary = progression.summary;
      detail = progression.detail;
      tags.push(...progression.tags);
    }

    this.state.zone = zoneAfter;
    this.state.lane = laneAfter;
    this.state.possession = possessionAfter;
    if (possessionAfter === offenseTeam) {
      this.state.ballHolderId = target?.id ?? defaultHolderFor(offenseCard, laneAfter);
    } else {
      this.state.ballHolderId = defensiveWinnerFor(defenseCard, laneAfter);
    }
    this.shiftMomentum(offenseTeam, possessionAfter === offenseTeam ? (tags.includes("big-chance") ? 2 : 1) : -2);
    this.advanceTurn();
    this.consumeUserCard(userDeck, userCardId);
    this.closeGameIfNeeded();

    const result: PlayResult = {
      summary,
      detail,
      userDeck,
      offenseTeam,
      offenseCardId: offenseCard.id,
      defenseCardId: defenseCard.id,
      userCardId,
      commandId: command?.id ?? null,
      zoneBefore,
      zoneAfter: this.state.zone,
      laneBefore,
      laneAfter: this.state.lane,
      possessionBefore,
      possessionAfter: this.state.possession,
      momentumBefore,
      momentumAfter: this.state.momentum,
      turnBefore,
      turnAfter: this.state.turn,
      scoreBefore,
      scoreAfter: { ...this.state.score },
      tags,
    };

    this.state.lastPlay = result;
    this.state.history.unshift(result);
    this.state.history = this.state.history.slice(0, 8);
    return result;
  }

  private resolveProgression(
    offenseCard: OffenseCardDef,
    defenseCard: DefenseCardDef,
    margin: number,
    offenseTeam: TeamId,
    target: TargetOption | null
  ) {
    const tags: string[] = [];
    const targetLane = target?.lane ?? offenseCard.targetLane ?? offenseCard.preferredLane ?? this.state.lane;
    let zoneAfter = this.state.zone;
    let laneAfter = targetLane;
    let possessionAfter = offenseTeam;
    let summary = "";
    let detail = "";

    if (margin >= 4) {
      zoneAfter = target ? target.zone : advanceZone(this.state.zone, offenseTeam, offenseCard.advance);
      summary = "Attack breaks the line";
      detail = target ? `${offenseCard.name} finds ${target.label} and the move jumps forward.` : `${offenseCard.name} lands cleanly and moves the ball forward.`;
      if (offenseCard.advance >= 2) tags.push("big-chance");
      if (offenseCard.kind === "CROSS") laneAfter = "CENTER";
    } else if (margin >= 1) {
      zoneAfter = target ? partialTargetZone(this.state.zone, target.zone) : advanceZone(this.state.zone, offenseTeam, Math.max(0, offenseCard.advance - 1));
      summary = "Attack keeps it alive";
      detail = target ? `${offenseCard.name} reaches ${target.label}, but the defense gets there quickly.` : `${offenseCard.name} sticks, but the defense slows it down.`;
      if (offenseCard.kind === "CROSS") laneAfter = "CENTER";
    } else {
      const turnoverChance = clamp(defenseCard.turnover * 8 + offenseCard.risk * 5 + Math.abs(margin) * 6, 18, 86);
      if (this.rng.int(1, 100) <= turnoverChance) {
        possessionAfter = oppositeTeam(offenseTeam);
        laneAfter = defenseCard.lane === "ANY" ? this.state.lane : defenseCard.lane;
        summary = `${labelForTeam(possessionAfter)} win it back`;
        detail = `${defenseCard.name} kills the move and steals possession.`;
        tags.push("turnover");
      } else {
        laneAfter = this.state.lane;
        summary = "Move fizzles out";
        detail = `${defenseCard.name} forces the ball backwards and the chance dies.`;
      }
    }

    if (possessionAfter !== offenseTeam) {
      zoneAfter = settleTurnoverZone(this.state.zone, possessionAfter);
    }

    return { zoneAfter, laneAfter, possessionAfter, summary, detail, tags };
  }

  private resolveShot(
    offenseCard: OffenseCardDef,
    defenseCard: DefenseCardDef,
    margin: number,
    offenseTeam: TeamId,
    target: TargetOption | null
  ) {
    const tags: string[] = ["shot"];
    const inRange = isShotRange(offenseTeam, this.state.zone);
    const boxBonus = isBoxShot(offenseTeam, this.state.zone) ? 4 : 0;
    const centralBonus = this.state.lane === "CENTER" ? 2 : 0;
    const shotScore = margin + boxBonus + centralBonus + this.rng.int(-2, 2) + offenseCard.finishing;

    if (inRange && shotScore >= 10) {
      this.state.score[offenseTeam] += 1;
      this.restartFromKickoff(oppositeTeam(offenseTeam));
      tags.push("goal");
      return {
        zoneAfter: this.state.zone,
        laneAfter: this.state.lane,
        possessionAfter: this.state.possession,
        summary: `${labelForTeam(offenseTeam)} score`,
        detail: `${target?.label ?? "The shooter"} converts with ${offenseCard.name.toLowerCase()} and beats the keeper.`,
        tags,
      };
    }

    const reboundHome = this.rng.int(1, 100) <= 26;
    if (inRange && shotScore >= 6 && reboundHome) {
      tags.push("big-chance");
      return {
        zoneAfter: this.state.zone,
        laneAfter: "CENTER" as Lane,
        possessionAfter: offenseTeam,
        summary: "Saved, still alive",
        detail: `${target?.label ?? "The attacker"} gets the shot off, but the rebound stays alive.`,
        tags,
      };
    }

    const newPossession = oppositeTeam(offenseTeam);
    return {
      zoneAfter: keeperRestartZone(newPossession),
      laneAfter: "CENTER" as Lane,
      possessionAfter: newPossession,
      summary: `${labelForTeam(newPossession)} survive`,
      detail: `${defenseCard.name} helps the keeper swallow the shot.`,
      tags,
    };
  }

  private getSituationBonus(
    offenseCard: OffenseCardDef,
    defenseCard: DefenseCardDef,
    command: CommandBonus | null,
    offenseTeam: TeamId,
    target: TargetOption | null
  ) {
    let bonus = 0;
    const attackingThird = isAttackingThird(offenseTeam, this.state.zone);
    if (attackingThird && offenseCard.kind === "SHOT") bonus += 3;
    if (attackingThird && offenseCard.kind === "CROSS" && this.state.lane !== "CENTER") bonus += 2;
    if (!attackingThird && offenseCard.kind === "CROSS") bonus -= 4;
    if (offenseCard.kind === "SHOT" && !isShotRange(offenseTeam, this.state.zone)) bonus -= 6;
    if (offenseCard.kind === "CROSS" && this.state.lane === "CENTER") bonus -= 3;
    if ((offenseCard.preferredLane ?? offenseCard.lane) === this.state.lane) bonus += 2;
    if (defenseCard.kind === "BLOCK" && offenseCard.kind === "SHOT") bonus -= 2;
    if (target) bonus += target.bonus;
    if (command) {
      if (command.requiresWide && this.state.lane === "CENTER") bonus -= 4;
      if (command.requiresCenter && this.state.lane !== "CENTER") bonus -= 4;
      if (!command.requiresWide || this.state.lane !== "CENTER") bonus += command.attack;
    }
    return bonus;
  }

  private chooseAiDefenseCard(offenseCard: OffenseCardDef) {
    const weights = DEFENSE_CARDS.map((card) => {
      let weight = 2;
      if (offenseCard.kind === "SHOT" && card.kind === "BLOCK") weight += 7;
      if ((offenseCard.kind === "PASS" || offenseCard.kind === "CROSS") && card.kind === "INTERCEPT") weight += 4;
      if (offenseCard.kind === "DRIBBLE" && card.kind === "TACKLE") weight += 5;
      if (card.lane !== "ANY" && (offenseCard.targetLane ?? offenseCard.preferredLane ?? this.state.lane) === card.lane) weight += 3;
      if (isBoxShot("HOME", this.state.zone) && card.kind === "SHAPE") weight += 4;
      return weight;
    });
    return chooseWeighted(DEFENSE_CARDS, weights, this.rng);
  }

  private chooseAiOffenseCard() {
    const attackingThird = isAttackingThird("AWAY", this.state.zone);
    const box = isBoxShot("AWAY", this.state.zone);
    const weights = OFFENSE_CARDS.map((card) => {
      let weight = 2;
      if (!attackingThird && (card.id === "SAFE_PASS" || card.id.startsWith("SWITCH"))) weight += 4;
      if (attackingThird && card.kind === "SHOT") weight += 4;
      if (attackingThird && this.state.lane !== "CENTER" && card.kind === "CROSS") weight += 5;
      if (box && card.kind === "SHOT") weight += 7;
      if (this.state.lane === "CENTER" && card.id === "THROUGH_BALL") weight += 3;
      return weight;
    });
    return chooseWeighted(OFFENSE_CARDS, weights, this.rng);
  }

  private consumeCommand(
    commandId: TeamCommandType | undefined,
    userDeck: DeckKind,
    offenseCard: OffenseCardDef,
    defenseCard: DefenseCardDef
  ) {
    if (!commandId) return null;
    const command = this.state.commands.find((item) => item.id === commandId);
    if (!command || command.used) {
      throw new Error(`Command ${commandId} is not available`);
    }

    const bonus = commandBonusFor(command.id, userDeck, this.state.turn, offenseCard, defenseCard);
    if (!bonus) {
      throw new Error(`${command.label} does not fit this action`);
    }
    command.used = true;
    return bonus;
  }

  private consumeUserCard(deck: DeckKind, cardId: string) {
    const hand = this.state.userHands[deck];
    const index = hand.indexOf(cardId);
    if (index >= 0) {
      hand.splice(index, 1);
      this.state.userDiscard[deck].push(cardId);
      this.refillHand(deck);
    }
  }

  private refillHand(deck: DeckKind) {
    while (this.state.userHands[deck].length < HAND_SIZE) {
      if (this.state.userDraw[deck].length === 0) {
        this.state.userDraw[deck] = this.shuffle(this.state.userDiscard[deck]);
        this.state.userDiscard[deck] = [];
      }
      const next = this.state.userDraw[deck].shift();
      if (!next) break;
      this.state.userHands[deck].push(next);
    }
  }

  private shiftMomentum(team: TeamId, delta: number) {
    const signed = team === "HOME" ? delta : -delta;
    this.state.momentum = clamp(this.state.momentum + signed, -MAX_MOMENTUM, MAX_MOMENTUM);
  }

  private restartFromKickoff(team: TeamId) {
    this.state.possession = team;
    this.state.zone = 3;
    this.state.lane = "CENTER";
    this.state.ballHolderId = "CM";
  }

  private advanceTurn() {
    this.state.turn += 1;
    if (this.state.turn === TURNS_PER_HALF) {
      this.state.zone = 3;
      this.state.lane = "CENTER";
      this.state.possession = "AWAY";
      this.state.ballHolderId = "CM";
    }
  }

  private closeGameIfNeeded() {
    if (this.state.turn < TOTAL_TURNS) return;
    if (this.state.score.HOME > this.state.score.AWAY) this.state.winner = "HOME";
    else if (this.state.score.AWAY > this.state.score.HOME) this.state.winner = "AWAY";
    else this.state.winner = "DRAW";
  }

  private shuffle<T>(values: readonly T[]) {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

export function buildHomeRatings(players: CollectionPlayer[]): TeamRatings {
  if (players.length === 0) return defaultTeamRatings("Balanced", ["Captain", "Runner", "Playmaker"]);
  const offense = average(
    players.map((player) => player.stats.pas * 0.3 + player.stats.sho * 0.25 + player.stats.dri * 0.25 + player.stats.pac * 0.2)
  );
  const defense = average(
    players.map((player) => player.stats.def * 0.42 + player.stats.phy * 0.28 + player.stats.pac * 0.14 + player.stats.pas * 0.16)
  );
  const starNames = [...players]
    .sort(
      (a, b) =>
        b.stats.pas + b.stats.sho + b.stats.dri + b.stats.pac - (a.stats.pas + a.stats.sho + a.stats.dri + a.stats.pac)
    )
    .slice(0, 3)
    .map((player) => player.name);
  return {
    offense: clamp(Math.round(offense), 50, 92),
    defense: clamp(Math.round(defense), 50, 92),
    identity: dominantIdentity(players),
    starNames,
  };
}

export function buildAwayRatings(division: number): TeamRatings {
  const scale = clamp(11 - division, 1, 10);
  return {
    offense: 56 + scale * 2,
    defense: 56 + scale * 2,
    identity: scale >= 7 ? "Pressing" : scale >= 4 ? "Balanced" : "Reactive",
    starNames: scale >= 7 ? ["Rami", "Costa", "Jules"] : ["Mika", "Rui", "Vega"],
  };
}

function commandBonusFor(
  id: TeamCommandType,
  userDeck: DeckKind,
  turn: number,
  offenseCard: OffenseCardDef,
  defenseCard: DefenseCardDef
): CommandBonus | null {
  switch (id) {
    case "ALL_OUT_ATTACK":
      if (userDeck !== "OFFENSE") return null;
      return { id, attack: 3, defense: 0, turnover: 0, lane: "ANY" };
    case "PARK_THE_BUS":
      if (userDeck !== "DEFENSE") return null;
      return { id, attack: 0, defense: 4, turnover: 1, lane: "ANY" };
    case "FAST_COUNTER":
      if (userDeck !== "OFFENSE") return null;
      return { id, attack: 3, defense: 0, turnover: 0, lane: "ANY" };
    case "HIGH_PRESS":
      if (userDeck !== "DEFENSE") return null;
      return { id, attack: 0, defense: 3, turnover: 2, lane: "ANY" };
    case "SLOW_BUILD_UP":
      if (userDeck !== "OFFENSE" || offenseCard.kind === "SHOT") return null;
      return { id, attack: 2, defense: 0, turnover: -1, lane: "ANY" };
    case "WING_OVERLOAD":
      if (userDeck !== "OFFENSE") return null;
      return { id, attack: 3, defense: 0, turnover: 0, lane: "ANY", requiresWide: true };
    case "MIDFIELD_LOCKDOWN":
      if (userDeck !== "DEFENSE" || defenseCard.lane === "ANY") return null;
      return { id, attack: 0, defense: 4, turnover: 1, lane: "CENTER", requiresCenter: true };
    case "TARGET_MAN_PLAY":
      if (userDeck !== "OFFENSE") return null;
      return { id, attack: 3, defense: 0, turnover: 0, lane: "CENTER", requiresCenter: true };
    case "FLUID_FORMATION":
      return { id, attack: 2, defense: 2, turnover: 0, lane: "ANY" };
    case "LAST_10_MINUTES_FURY":
      if (turn < TOTAL_TURNS - 2) return null;
      return { id, attack: 4, defense: 0, turnover: 1, lane: "ANY", requiresLate: true };
  }
}

function getOffenseCard(cardId: string) {
  const card = OFFENSE_LOOKUP.get(cardId);
  if (!card) {
    throw new Error(`Unknown offense card ${cardId}`);
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

function dominantIdentity(players: CollectionPlayer[]) {
  const counts = new Map<string, number>();
  for (const player of players) {
    counts.set(player.tacticalIdentity, (counts.get(player.tacticalIdentity) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Balanced";
}

function defaultTeamRatings(identity: string, starNames: string[]): TeamRatings {
  return {
    offense: 66,
    defense: 64,
    identity,
    starNames,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chooseWeighted<T>(items: readonly T[], weights: number[], rng: RNG) {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return items[0];
  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= Math.max(0, weights[i] ?? 0);
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function laneMatchBonus(
  ballLane: Lane,
  offenseCard: OffenseCardDef,
  defenseCard: DefenseCardDef,
  command: CommandBonus | null,
  target: TargetOption | null
) {
  let bonus = 0;
  const offenseLane = target?.lane ?? offenseCard.preferredLane ?? offenseCard.targetLane ?? ballLane;
  if (offenseLane === ballLane) bonus += 1;
  if (defenseCard.lane !== "ANY" && defenseCard.lane === offenseLane) bonus -= 3;
  if (defenseCard.lane !== "ANY" && defenseCard.lane !== offenseLane) bonus += 1;
  if (command && command.lane !== "ANY" && command.lane === offenseLane) bonus += 2;
  return bonus;
}

function buildTargetOptions(state: DriveMatchState, offenseCard: OffenseCardDef): TargetOption[] {
  const advance = Math.max(1, offenseCard.advance);
  const home = state.possession === "HOME";
  const nextZone = advanceZone(state.zone, state.possession, advance);
  const nearZone = advanceZone(state.zone, state.possession, Math.max(1, advance - 1));

  switch (offenseCard.id) {
    case "SAFE_PASS":
      return [
        { id: "LW", label: "Left Winger", lane: "LEFT", zone: nearZone, description: "Safe outlet wide.", bonus: 1 },
        { id: "AM", label: "Playmaker", lane: "CENTER", zone: nearZone, description: "Keep it central.", bonus: 2 },
        { id: "RW", label: "Right Winger", lane: "RIGHT", zone: nearZone, description: "Switch to the far side.", bonus: 1 },
      ];
    case "THROUGH_BALL":
      return [
        { id: "ST", label: "Striker Run", lane: "CENTER", zone: nextZone, description: "Split the center-backs.", bonus: 3 },
        { id: "LW", label: "Left Channel Run", lane: "LEFT", zone: nextZone, description: "Slip the wide run behind.", bonus: 2 },
        { id: "RW", label: "Right Channel Run", lane: "RIGHT", zone: nextZone, description: "Punch the pass into space.", bonus: 2 },
      ];
    case "SWITCH_LEFT":
      return [{ id: "LW", label: "Left Winger", lane: "LEFT", zone: nearZone, description: "Stretch play to the touchline.", bonus: 2 }];
    case "SWITCH_RIGHT":
      return [{ id: "RW", label: "Right Winger", lane: "RIGHT", zone: nearZone, description: "Stretch play to the touchline.", bonus: 2 }];
    case "CROSS":
      return [
        { id: "ST", label: "Striker", lane: "CENTER", zone: home ? 6 : 0, description: "Attack the near-post space.", bonus: 3 },
        { id: "AM", label: "Late Runner", lane: "CENTER", zone: home ? 5 : 1, description: "Arrive on the cut-back.", bonus: 2 },
      ];
    case "SNAP_SHOT":
    case "CURLED_SHOT":
      return [
        { id: "ST", label: "Striker", lane: "CENTER", zone: state.zone, description: "Hit it off the striker.", bonus: 3 },
        { id: "AM", label: "Playmaker", lane: "CENTER", zone: state.zone, description: "Shoot with the creator.", bonus: 2 },
      ];
    default:
      return [];
  }
}

function pickTargetOption(state: DriveMatchState, offenseCard: OffenseCardDef, targetId: TokenId | undefined) {
  const options = buildTargetOptions(state, offenseCard);
  if (options.length === 0) return null;
  if (!targetId) {
    throw new Error(`Pick a target for ${offenseCard.name}`);
  }
  const chosen = options.find((option) => option.id === targetId);
  if (!chosen) {
    throw new Error(`Target ${targetId} is not available for ${offenseCard.name}`);
  }
  return chosen;
}

function partialTargetZone(fromZone: number, targetZone: number) {
  if (targetZone === fromZone) return fromZone;
  return fromZone + Math.sign(targetZone - fromZone);
}

function defaultHolderFor(offenseCard: OffenseCardDef, lane: Lane): TokenId {
  if (offenseCard.kind === "SHOT") return lane === "CENTER" ? "ST" : lane === "LEFT" ? "LW" : "RW";
  if (offenseCard.kind === "DRIBBLE") return lane === "CENTER" ? "AM" : lane === "LEFT" ? "LW" : "RW";
  return lane === "CENTER" ? "AM" : lane === "LEFT" ? "LW" : "RW";
}

function defensiveWinnerFor(defenseCard: DefenseCardDef, lane: Lane): TokenId {
  if (defenseCard.kind === "BLOCK") return "CB";
  if (defenseCard.kind === "INTERCEPT") return "CM";
  if (lane === "LEFT") return "LB";
  if (lane === "RIGHT") return "RB";
  return "CB";
}

function buildBoardTokens(state: DriveMatchState): BoardToken[] {
  const homeBase: Record<TokenId, { zone: number; lane: Lane }> = {
    GK: { zone: 0, lane: "CENTER" },
    LB: { zone: 1, lane: "LEFT" },
    CB: { zone: 1, lane: "CENTER" },
    RB: { zone: 1, lane: "RIGHT" },
    CM: { zone: 2, lane: "CENTER" },
    LW: { zone: 3, lane: "LEFT" },
    AM: { zone: 3, lane: "CENTER" },
    RW: { zone: 3, lane: "RIGHT" },
    ST: { zone: 4, lane: "CENTER" },
  };
  const awayBase: Record<TokenId, { zone: number; lane: Lane }> = {
    GK: { zone: 6, lane: "CENTER" },
    LB: { zone: 5, lane: "LEFT" },
    CB: { zone: 5, lane: "CENTER" },
    RB: { zone: 5, lane: "RIGHT" },
    CM: { zone: 4, lane: "CENTER" },
    LW: { zone: 3, lane: "LEFT" },
    AM: { zone: 3, lane: "CENTER" },
    RW: { zone: 3, lane: "RIGHT" },
    ST: { zone: 2, lane: "CENTER" },
  };

  const tokens: BoardToken[] = [];
  for (const [id, homePos] of Object.entries(homeBase) as [TokenId, { zone: number; lane: Lane }][]) {
    const awayPos = awayBase[id];
    tokens.push({
      id,
      teamId: "HOME",
      zone: state.possession === "HOME" && state.ballHolderId === id ? state.zone : homePos.zone,
      lane: state.possession === "HOME" && state.ballHolderId === id ? state.lane : homePos.lane,
      hasBall: state.possession === "HOME" && state.ballHolderId === id,
      roleLabel: id,
    });
    tokens.push({
      id,
      teamId: "AWAY",
      zone: state.possession === "AWAY" && state.ballHolderId === id ? state.zone : awayPos.zone,
      lane: state.possession === "AWAY" && state.ballHolderId === id ? state.lane : awayPos.lane,
      hasBall: state.possession === "AWAY" && state.ballHolderId === id,
      roleLabel: id,
    });
  }
  return tokens;
}

function advanceZone(zone: number, team: TeamId, amount: number) {
  return team === "HOME" ? clamp(zone + amount, 0, LAST_ZONE) : clamp(zone - amount, 0, LAST_ZONE);
}

function settleTurnoverZone(zone: number, newPossession: TeamId) {
  return newPossession === "HOME" ? Math.max(1, zone - 1) : Math.min(LAST_ZONE - 1, zone + 1);
}

function keeperRestartZone(team: TeamId) {
  return team === "HOME" ? 1 : 5;
}

function isAttackingThird(team: TeamId, zone: number) {
  return team === "HOME" ? zone >= 4 : zone <= 2;
}

function isShotRange(team: TeamId, zone: number) {
  return team === "HOME" ? zone >= 4 : zone <= 2;
}

function isBoxShot(team: TeamId, zone: number) {
  return team === "HOME" ? zone >= BOX_ZONE_HOME : zone <= BOX_ZONE_AWAY;
}

function oppositeTeam(team: TeamId): TeamId {
  return team === "HOME" ? "AWAY" : "HOME";
}

function labelForTeam(team: TeamId) {
  return team === "HOME" ? "Home" : "Away";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
