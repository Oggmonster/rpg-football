import attackCatalog from "../../data/cards.attack.json";
import defenseCatalog from "../../data/cards.defense.json";
import playersCollection from "../../data/players.collection.json";
import { DECK_SIZE } from "../../sim/config/MatchConfig";
import type { CardDef } from "../../sim/cards/types";
import type { PlayerRole, PlayerStats } from "../../sim/state/MatchState";

const PROFILE_KEY = "pocket-gaffer-profile-v1";

export interface CollectionPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  rarity: "Common" | "Rare" | "Epic";
  stats: PlayerStats;
}

export interface SavedProfile {
  attackDeckIds: string[];
  defenseDeckIds: string[];
  collection: CollectionPlayer[];
  squadIds: string[];
}

function hasWindowStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function pickDefaultSquad(collection: CollectionPlayer[]): string[] {
  const gk = collection.find((p) => p.role === "GK");
  const outfield = collection.filter((p) => p.role !== "GK").slice(0, 6);
  const ids = [gk?.id, ...outfield.map((p) => p.id)].filter(Boolean) as string[];
  return ids.slice(0, 7);
}

function defaultProfile(): SavedProfile {
  const attackIds = (attackCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  const defenseIds = (defenseCatalog.cards as CardDef[]).map((c) => c.id).slice(0, DECK_SIZE);
  const collection = playersCollection.players as CollectionPlayer[];
  const squadIds = pickDefaultSquad(collection);
  return {
    attackDeckIds: attackIds,
    defenseDeckIds: defenseIds,
    collection,
    squadIds,
  };
}

function normalizeDeck(ids: string[], fallback: string[]) {
  const clean = ids.filter((x) => fallback.includes(x));
  if (clean.length !== DECK_SIZE) return [...fallback];
  return clean;
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
    const collection = Array.isArray(parsed.collection) && parsed.collection.length > 0 ? parsed.collection : fallback.collection;
    const attackDeckIds = normalizeDeck(parsed.attackDeckIds ?? [], fallback.attackDeckIds);
    const defenseDeckIds = normalizeDeck(parsed.defenseDeckIds ?? [], fallback.defenseDeckIds);
    const validSquad = (parsed.squadIds ?? []).filter((id) => collection.some((p) => p.id === id)).slice(0, 7);
    const squadIds = validSquad.length === 7 ? validSquad : pickDefaultSquad(collection);

    return { attackDeckIds, defenseDeckIds, collection, squadIds };
  } catch {
    return fallback;
  }
}

export function saveProfile(profile: SavedProfile) {
  if (!hasWindowStorage()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function updateDecks(next: { attackDeckIds: string[]; defenseDeckIds: string[] }) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    attackDeckIds: next.attackDeckIds,
    defenseDeckIds: next.defenseDeckIds,
  };
  saveProfile(updated);
  return updated;
}

export function updateSquad(nextSquadIds: string[]) {
  const p = loadProfile();
  const updated: SavedProfile = {
    ...p,
    squadIds: nextSquadIds.slice(0, 7),
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
