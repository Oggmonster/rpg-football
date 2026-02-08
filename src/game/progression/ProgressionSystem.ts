import type { MatchState } from "../../sim/state/MatchState";
import type { CollectionPlayer, SavedProfile } from "../profile/ProfileStore";
import { eventById } from "../events/EventCatalog";
import { applySeasonProgress } from "../seasons/SeasonSystem";

export interface PlayerProgressGain {
  playerId: string;
  name: string;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  levelsGained: number;
  perkSlotsUnlocked: number;
  newTraits: string[];
}

export interface MatchProgressSummary {
  coinsGained: number;
  managerXpGained: number;
  managerLevelBefore: number;
  managerLevelAfter: number;
  eventLabel: string;
  seasonNumber: number;
  divisionBefore: number;
  divisionAfter: number;
  seasonReset: boolean;
  promotion: boolean;
  relegation: boolean;
  resultLabel: "WIN" | "DRAW" | "LOSS";
  scoreLabel: string;
  playerGains: PlayerProgressGain[];
}

function managerXpForLevel(level: number): number {
  return 120 + level * 60;
}

function playerXpForLevel(level: number): number {
  return 80 + level * 35;
}

function rarityLevelCap(rarity: CollectionPlayer["rarity"]): number {
  if (rarity === "Epic") return 25;
  if (rarity === "Rare") return 20;
  return 10;
}

function roleStatPriority(role: CollectionPlayer["role"]): Array<keyof CollectionPlayer["stats"]> {
  switch (role) {
    case "GK":
      return ["def", "pas", "phy", "pac", "dri", "sho"];
    case "DEF":
      return ["def", "phy", "pas", "pac", "dri", "sho"];
    case "MID":
      return ["pas", "dri", "pac", "def", "sho", "phy"];
    case "FWD":
      return ["sho", "pac", "dri", "pas", "phy", "def"];
  }
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function growStats(player: CollectionPlayer, level: number) {
  const priority = roleStatPriority(player.role);
  const seed = hashSeed(`${player.id}:${level}`);
  const primary = priority[seed % priority.length];
  const secondary = priority[(seed + 2) % priority.length];
  const tertiary = priority[(seed + 4) % priority.length];

  const raise = (key: keyof CollectionPlayer["stats"], amount: number) => {
    const cap = player.growthCaps[key];
    player.stats[key] = Math.min(cap, player.stats[key] + amount);
  };

  raise(primary, level % 2 === 0 ? 2 : 1);
  raise(secondary, 1);
  if (seed % 3 === 0) {
    raise(tertiary, 1);
  }
}

function applyTraitAndPerkUnlocks(player: CollectionPlayer, levelBefore: number, levelAfter: number) {
  let perkSlotsUnlocked = 0;
  const newTraits: string[] = [];

  const perkMilestones = [5, 12];
  for (const ms of perkMilestones) {
    if (levelBefore < ms && levelAfter >= ms && player.perkSlots.unlocked < player.perkSlots.total) {
      player.perkSlots.unlocked += 1;
      perkSlotsUnlocked += 1;
    }
  }

  const traitMilestones: Array<{ level: number; trait: string }> = [
    { level: 10, trait: "Specialist Instinct" },
    { level: 18, trait: "Signature Pattern" },
  ];
  for (const t of traitMilestones) {
    if (levelBefore < t.level && levelAfter >= t.level && !player.bonusTraits.includes(t.trait)) {
      player.bonusTraits.push(t.trait);
      newTraits.push(t.trait);
    }
  }

  return { perkSlotsUnlocked, newTraits };
}

function matchResult(state: MatchState): "WIN" | "DRAW" | "LOSS" {
  if (state.score.HOME > state.score.AWAY) return "WIN";
  if (state.score.HOME === state.score.AWAY) return "DRAW";
  return "LOSS";
}

function playerXpGain(player: CollectionPlayer, state: MatchState, result: "WIN" | "DRAW" | "LOSS") {
  const resultBonus = result === "WIN" ? 15 : result === "DRAW" ? 8 : 4;
  const roleBonus =
    player.role === "FWD"
      ? state.score.HOME * 5
      : player.role === "MID"
      ? 8
      : player.role === "GK"
      ? state.score.AWAY === 0
        ? 18
        : 9
      : state.score.AWAY === 0
      ? 14
      : 7;
  const momentumBonus = Math.round(Math.max(0, state.momentum) * 10);
  return 18 + resultBonus + roleBonus + momentumBonus;
}

export function applyMatchProgression(profile: SavedProfile, state: MatchState, squadIds: string[]): { updated: SavedProfile; summary: MatchProgressSummary } {
  const result = matchResult(state);
  const scoreLabel = `${state.score.HOME}-${state.score.AWAY}`;

  const updatedCollection = profile.collection.map((p) => ({
    ...p,
    traits: [...p.traits],
    bonusTraits: [...p.bonusTraits],
    stats: { ...p.stats },
    growthCaps: { ...p.growthCaps },
    perkSlots: { ...p.perkSlots },
  }));

  const playerGains: PlayerProgressGain[] = [];
  const event = eventById(profile.manager.activeEventId);
  for (const playerId of squadIds) {
    const player = updatedCollection.find((p) => p.id === playerId);
    if (!player) continue;

    const xpGained = Math.round(playerXpGain(player, state, result) * event.rewards.playerXpMultiplier);
    const levelBefore = player.level;
    const cap = rarityLevelCap(player.rarity);

    player.xp += xpGained;
    let levelsGained = 0;
    while (player.level < cap) {
      const need = playerXpForLevel(player.level);
      if (player.xp < need) break;
      player.xp -= need;
      player.level += 1;
      levelsGained += 1;
      growStats(player, player.level);
    }

    const levelAfter = player.level;
    const unlock = applyTraitAndPerkUnlocks(player, levelBefore, levelAfter);

    playerGains.push({
      playerId,
      name: player.name,
      xpGained,
      levelBefore,
      levelAfter,
      levelsGained,
      perkSlotsUnlocked: unlock.perkSlotsUnlocked,
      newTraits: unlock.newTraits,
    });
  }

  const manager = { ...profile.manager };
  const divisionBefore = manager.division;
  manager.matchesPlayed += 1;
  if (result === "WIN") manager.wins += 1;
  if (result === "DRAW") manager.draws += 1;
  if (result === "LOSS") manager.losses += 1;

  const managerLevelBefore = manager.level;
  const managerXpGained = Math.round((55 + state.score.HOME * 14 + (result === "WIN" ? 35 : result === "DRAW" ? 18 : 8)) * event.rewards.managerXpMultiplier);
  manager.xp += managerXpGained;
  while (manager.xp >= managerXpForLevel(manager.level)) {
    manager.xp -= managerXpForLevel(manager.level);
    manager.level += 1;
  }

  const coinsGained = Math.round((90 + state.score.HOME * 24 + (result === "WIN" ? 60 : result === "DRAW" ? 30 : 14)) * event.rewards.coinMultiplier);
  manager.coins += coinsGained;
  const seasonUpdate = applySeasonProgress(manager, result);

  const summary: MatchProgressSummary = {
    coinsGained,
    managerXpGained,
    managerLevelBefore,
    managerLevelAfter: seasonUpdate.manager.level,
    eventLabel: event.label,
    seasonNumber: seasonUpdate.manager.season,
    divisionBefore,
    divisionAfter: seasonUpdate.manager.division,
    seasonReset: seasonUpdate.seasonReset,
    promotion: seasonUpdate.promotion,
    relegation: seasonUpdate.relegation,
    resultLabel: result,
    scoreLabel,
    playerGains,
  };

  return {
    updated: {
      ...profile,
      collection: updatedCollection,
      manager: seasonUpdate.manager,
    },
    summary,
  };
}
