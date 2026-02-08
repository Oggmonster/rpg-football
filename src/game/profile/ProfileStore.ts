import attackCatalog from "../../data/cards.attack.json";
import defenseCatalog from "../../data/cards.defense.json";
import teamCommandCatalog from "../../data/cards.team_commands.json";
import playersCollection from "../../data/players.collection.json";
import { DECK_SIZE, SQUAD_SIZE } from "../../sim/config/MatchConfig";
import type { CardDef } from "../../sim/cards/types";
import type { PlayerRole, PlayerStats, TeamCommandType } from "../../sim/state/MatchState";
import type { EventModifierId } from "../events/EventCatalog";

const PROFILE_KEY = "pocket-gaffer-profile-v1";

export interface PlayerPerkSlots {
  total: number;
  unlocked: number;
}

export interface CollectionPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  rarity: "Common" | "Rare" | "Epic";
  archetypeId: string;
  archetypeName: string;
  tacticalIdentity: "CONTROL" | "PRESS" | "COUNTER" | "WIDE" | "BALANCED";
  traits: string[];
  perkSlots: PlayerPerkSlots;
  growthCaps: PlayerStats;
  stats: PlayerStats;
  level: number;
  xp: number;
  bonusTraits: string[];
}

export interface ManagerProgress {
  level: number;
  xp: number;
  coins: number;
  season: number;
  division: number;
  seasonMatches: number;
  seasonPoints: number;
  weekIndex: number;
  activeEventId: EventModifierId;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface TeamCommandCardDef {
  id: string;
  type: TeamCommandType;
  label: string;
  starter: boolean;
  description: string;
}

export interface StarterPreset {
  id: "balanced_starter" | "press_counter" | "control_wings";
  label: string;
  description: string;
  attackDeckIds: string[];
  defenseDeckIds: string[];
  teamCommandDeckIds: TeamCommandType[];
}

export interface SavedProfile {
  attackDeckIds: string[];
  defenseDeckIds: string[];
  teamCommandDeckIds: TeamCommandType[];
  collection: CollectionPlayer[];
  squadIds: string[];
  manager: ManagerProgress;
}

function hasWindowStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function defaultManager(): ManagerProgress {
  return {
    level: 1,
    xp: 0,
    coins: 0,
    season: 1,
    division: 10,
    seasonMatches: 0,
    seasonPoints: 0,
    weekIndex: 0,
    activeEventId: "BALANCED",
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };
}

function hydrateCollection(rawCollection: Partial<CollectionPlayer>[]): CollectionPlayer[] {
  return rawCollection.map((p) => ({
    id: p.id ?? "",
    name: p.name ?? "Unknown",
    role: (p.role ?? "MID") as PlayerRole,
    rarity: (p.rarity ?? "Common") as "Common" | "Rare" | "Epic",
    archetypeId: p.archetypeId ?? "ARC_GENERIC",
    archetypeName: p.archetypeName ?? "Generic",
    tacticalIdentity: (p.tacticalIdentity ?? "BALANCED") as "CONTROL" | "PRESS" | "COUNTER" | "WIDE" | "BALANCED",
    traits: Array.isArray(p.traits) ? p.traits : [],
    perkSlots: {
      total: p.perkSlots?.total ?? 3,
      unlocked: p.perkSlots?.unlocked ?? 1,
    },
    growthCaps: p.growthCaps ?? p.stats ?? { pac: 75, sho: 75, pas: 75, dri: 75, def: 75, phy: 75 },
    stats: p.stats ?? { pac: 55, sho: 55, pas: 55, dri: 55, def: 55, phy: 55 },
    level: p.level ?? 1,
    xp: p.xp ?? 0,
    bonusTraits: Array.isArray(p.bonusTraits) ? p.bonusTraits : [],
  }));
}

function pickDefaultSquad(collection: CollectionPlayer[]): string[] {
  const gk = collection.find((p) => p.role === "GK");
  const outfield = collection.filter((p) => p.role !== "GK").slice(0, SQUAD_SIZE - 1);
  const ids = [gk?.id, ...outfield.map((p) => p.id)].filter(Boolean) as string[];
  return ids.slice(0, SQUAD_SIZE);
}

function getTeamCommandCatalogRaw(): TeamCommandCardDef[] {
  return teamCommandCatalog.commands as TeamCommandCardDef[];
}

function defaultTeamCommands(): TeamCommandType[] {
  return getTeamCommandCatalogRaw()
    .filter((cmd) => cmd.starter)
    .map((cmd) => cmd.type)
    .slice(0, 5);
}

function defaultProfile(): SavedProfile {
  const attackIds = (attackCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  const defenseIds = (defenseCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  const collection = hydrateCollection(playersCollection.players as Partial<CollectionPlayer>[]);
  const squadIds = pickDefaultSquad(collection);
  return {
    attackDeckIds: attackIds,
    defenseDeckIds: defenseIds,
    teamCommandDeckIds: defaultTeamCommands(),
    collection,
    squadIds,
    manager: defaultManager(),
  };
}

function normalizeDeck(ids: string[], fallback: string[]) {
  const clean = ids.filter((x) => fallback.includes(x));
  if (clean.length !== DECK_SIZE) return [...fallback];
  return clean;
}

function normalizeTeamCommandDeck(ids: TeamCommandType[] | string[] | undefined, fallback: TeamCommandType[]) {
  const allowed = new Set(getTeamCommandCatalogRaw().map((c) => c.type));
  const unique: TeamCommandType[] = [];
  for (const id of ids ?? []) {
    const typed = id as TeamCommandType;
    if (!allowed.has(typed)) continue;
    if (unique.includes(typed)) continue;
    unique.push(typed);
    if (unique.length === 5) break;
  }
  if (unique.length === 5) return unique;

  const merged = [...unique];
  for (const next of fallback) {
    if (merged.includes(next)) continue;
    merged.push(next);
    if (merged.length === 5) break;
  }
  return merged.slice(0, 5);
}

function normalizeManager(candidate: Partial<ManagerProgress> | undefined, fallback: ManagerProgress): ManagerProgress {
  if (!candidate) return fallback;
  const allowedEvents = new Set<EventModifierId>(["BALANCED", "COUNTER_SURGE", "PRESS_FEVER", "CONTROL_CLINIC"]);
  const activeEventId = allowedEvents.has(candidate.activeEventId as EventModifierId)
    ? (candidate.activeEventId as EventModifierId)
    : fallback.activeEventId;
  return {
    level: candidate.level ?? fallback.level,
    xp: candidate.xp ?? fallback.xp,
    coins: candidate.coins ?? fallback.coins,
    season: candidate.season ?? fallback.season,
    division: candidate.division ?? fallback.division,
    seasonMatches: candidate.seasonMatches ?? fallback.seasonMatches,
    seasonPoints: candidate.seasonPoints ?? fallback.seasonPoints,
    weekIndex: candidate.weekIndex ?? fallback.weekIndex,
    activeEventId,
    matchesPlayed: candidate.matchesPlayed ?? fallback.matchesPlayed,
    wins: candidate.wins ?? fallback.wins,
    draws: candidate.draws ?? fallback.draws,
    losses: candidate.losses ?? fallback.losses,
  };
}

function makePreset(id: StarterPreset["id"], attackDeckIds: string[], defenseDeckIds: string[]): StarterPreset {
  if (id === "press_counter") {
    return {
      id,
      label: "Press + Counter",
      description: "Forces turnovers high and attacks quickly after regain.",
      attackDeckIds,
      defenseDeckIds,
      teamCommandDeckIds: ["HIGH_PRESS", "FAST_COUNTER", "ALL_OUT_ATTACK", "MIDFIELD_LOCKDOWN", "LAST_10_MINUTES_FURY"],
    };
  }
  if (id === "control_wings") {
    return {
      id,
      label: "Control + Wings",
      description: "Controls tempo and creates overloads through wide lanes.",
      attackDeckIds,
      defenseDeckIds,
      teamCommandDeckIds: ["SLOW_BUILD_UP", "PARK_THE_BUS", "WING_OVERLOAD", "FLUID_FORMATION", "TARGET_MAN_PLAY"],
    };
  }
  return {
    id: "balanced_starter",
    label: "Balanced Starter",
    description: "Safe all-round setup that teaches the core command loop.",
    attackDeckIds,
    defenseDeckIds,
    teamCommandDeckIds: defaultTeamCommands(),
  };
}

export function getStarterPresets(): StarterPreset[] {
  const attackIds = (attackCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  const defenseIds = (defenseCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  return [
    makePreset("balanced_starter", attackIds, defenseIds),
    makePreset("press_counter", attackIds, defenseIds),
    makePreset("control_wings", attackIds, defenseIds),
  ];
}

export function loadProfile(): SavedProfile {
  const fallback = defaultProfile();
  if (!hasWindowStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      saveProfile(fallback);
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<SavedProfile>;
    const collectionCandidate = Array.isArray(parsed.collection) && parsed.collection.length > 0 ? (parsed.collection as Partial<CollectionPlayer>[]) : null;
    const collection = collectionCandidate ? hydrateCollection(collectionCandidate) : fallback.collection;

    const attackDeckIds = normalizeDeck(parsed.attackDeckIds ?? [], fallback.attackDeckIds);
    const defenseDeckIds = normalizeDeck(parsed.defenseDeckIds ?? [], fallback.defenseDeckIds);
    const teamCommandDeckIds = normalizeTeamCommandDeck(parsed.teamCommandDeckIds, fallback.teamCommandDeckIds);
    const manager = normalizeManager(parsed.manager, fallback.manager);

    const validSquad = (parsed.squadIds ?? [])
      .filter((id) => collection.some((p) => p.id === id))
      .slice(0, SQUAD_SIZE);
    const squadIds = validSquad.length === SQUAD_SIZE ? validSquad : pickDefaultSquad(collection);

    return { attackDeckIds, defenseDeckIds, teamCommandDeckIds, collection, squadIds, manager };
  } catch {
    return fallback;
  }
}

export function saveProfile(profile: SavedProfile) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function updateDecks(next: { attackDeckIds: string[]; defenseDeckIds: string[]; teamCommandDeckIds?: TeamCommandType[] }) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    attackDeckIds: next.attackDeckIds,
    defenseDeckIds: next.defenseDeckIds,
    teamCommandDeckIds: normalizeTeamCommandDeck(next.teamCommandDeckIds, p.teamCommandDeckIds),
  };
  saveProfile(updated);
  return updated;
}

export function updateTeamCommandDeck(nextTeamCommandDeckIds: TeamCommandType[]) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    teamCommandDeckIds: normalizeTeamCommandDeck(nextTeamCommandDeckIds, p.teamCommandDeckIds),
  };
  saveProfile(updated);
  return updated;
}

export function updateSquad(nextSquadIds: string[]) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    squadIds: nextSquadIds.slice(0, SQUAD_SIZE),
  };
  saveProfile(updated);
  return updated;
}

export function updateCollectionAndManager(next: { collection: CollectionPlayer[]; manager: ManagerProgress }) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    collection: next.collection,
    manager: next.manager,
  };
  saveProfile(updated);
  return updated;
}

export function applyStarterPreset(presetId: StarterPreset["id"]) {
  const preset = getStarterPresets().find((p) => p.id === presetId) ?? getStarterPresets()[0];
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    attackDeckIds: [...preset.attackDeckIds],
    defenseDeckIds: [...preset.defenseDeckIds],
    teamCommandDeckIds: [...preset.teamCommandDeckIds],
  };
  saveProfile(updated);
  return updated;
}

export function getSelectedSquadPlayers(profile: SavedProfile): CollectionPlayer[] {
  return profile.squadIds
    .map((id) => profile.collection.find((p) => p.id === id))
    .filter(Boolean) as CollectionPlayer[];
}

export function getCardCatalogByDeckIds(deckIds: string[], deck: "ATTACK" | "DEFENSE") {
  const source = (deck === "ATTACK" ? attackCatalog.cards : defenseCatalog.cards) as CardDef[];
  const map = new Map(source.map((c) => [c.id, c]));
  const cards = deckIds.map((id) => map.get(id)).filter(Boolean) as CardDef[];
  return { cards };
}

export function getTeamCommandCatalog() {
  return getTeamCommandCatalogRaw();
}
