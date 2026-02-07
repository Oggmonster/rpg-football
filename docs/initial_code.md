Below is a copy-paste starter code skeleton for Vite + TypeScript + Phaser 3, structured around your architecture: pure sim layer + Phaser scenes/UI + two decks & two hands with possession switching.

It’s intentionally “thin but complete”: it will compile, run, show a pitch, show a 4-card hand, and let you play cards to cycle them to bottom. It also includes a possession toggle (press P) so you can verify attack/defense hand swapping immediately.

0) Create project
npm create vite@latest super-tactical-football -- --template vanilla-ts
cd super-tactical-football
npm i phaser
npm i -D eslint prettier
npm run dev

1) File tree (create these files)
src/
  main.ts
  game/
    GameConfig.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      MatchScene.ts
    ui/
      HandView.ts
      CardView.ts
      DirectionPad.ts
      Hud.ts
  sim/
    MatchSim.ts
    cards/
      types.ts
      CardCatalog.ts
      CardResolver.ts
      validators/
        DeckValidator.ts
    state/
      MatchState.ts
    math/
      RNG.ts
      shuffle.ts
  data/
    cards.attack.json
    cards.defense.json
  assets/
    (optional)
index.html
vite.config.ts (optional)

2) Code
src/main.ts
import Phaser from "phaser";
import { gameConfig } from "./game/GameConfig";

new Phaser.Game(gameConfig);

src/game/GameConfig.ts
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MatchScene } from "./scenes/MatchScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0b1a14",
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, PreloadScene, MatchScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

3) Scenes
src/game/scenes/BootScene.ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    // Keep Boot simple; move straight to preload.
    this.scene.start("PreloadScene");
  }
}

src/game/scenes/PreloadScene.ts
import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    // No external assets required for this skeleton.
    // Later: this.load.atlas(...) / this.load.spritesheet(...)
  }

  create() {
    this.scene.start("MatchScene");
  }
}

src/game/scenes/MatchScene.ts
import Phaser from "phaser";
import { MatchSim } from "../../sim/MatchSim";
import { HandView } from "../ui/HandView";
import attackCards from "../../data/cards.attack.json";
import defenseCards from "../../data/cards.defense.json";

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;

  private pitchGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super("MatchScene");
  }

  create() {
    // Create simulation
    this.sim = MatchSim.createFromCatalogs({
      attackCatalog: attackCards as any,
      defenseCatalog: defenseCards as any,
      rngSeed: 1337,
    });

    // Draw pitch (placeholder)
    this.pitchGfx = this.add.graphics();
    this.drawPitch();

    // UI: hand of 4 cards bottom-left
    this.handView = new HandView(this, 16, 540 - 140, 4, (cardId) => {
      // For v1 skeleton, we "play" card immediately without direction
      const ok = this.sim.playCard(cardId, { direction: { x: 1, y: 0 } });
      if (!ok) return;
      this.handView.setCards(this.sim.getActiveHandCardIds());
    });

    this.handView.setCards(this.sim.getActiveHandCardIds());

    // Keyboard helpers
    this.add
      .text(16, 16, "P: toggle possession | Click a card to play it", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#eafff6",
      })
      .setShadow(1, 1, "#000", 2);

    this.input.keyboard?.on("keydown-P", () => {
      this.sim.togglePossession();
      this.handView.setCards(this.sim.getActiveHandCardIds());
    });
  }

  private drawPitch() {
    const g = this.pitchGfx;
    g.clear();

    const margin = 24;
    const pitchX = margin;
    const pitchY = 60;
    const pitchW = 960 - margin * 2;
    const pitchH = 540 - 60 - 160; // keep space for UI

    // Grass
    g.fillStyle(0x1b6b3b, 1);
    g.fillRect(pitchX, pitchY, pitchW, pitchH);

    // Stripes
    for (let i = 0; i < 10; i++) {
      g.fillStyle(i % 2 === 0 ? 0x1f7a41 : 0x1b6b3b, 1);
      const stripeW = pitchW / 10;
      g.fillRect(pitchX + i * stripeW, pitchY, stripeW, pitchH);
    }

    // Lines
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(pitchX, pitchY, pitchW, pitchH);

    // Halfway line
    g.beginPath();
    g.moveTo(pitchX + pitchW / 2, pitchY);
    g.lineTo(pitchX + pitchW / 2, pitchY + pitchH);
    g.strokePath();

    // Center circle
    g.strokeCircle(pitchX + pitchW / 2, pitchY + pitchH / 2, 48);

    // Goals (simple)
    g.strokeRect(pitchX - 6, pitchY + pitchH / 2 - 40, 6, 80);
    g.strokeRect(pitchX + pitchW, pitchY + pitchH / 2 - 40, 6, 80);

    // Label possession
    this.add
      .text(pitchX, pitchY - 22, "Pitch (placeholder)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#eafff6",
      })
      .setAlpha(0.85);
  }
}

4) UI
src/game/ui/HandView.ts
import Phaser from "phaser";
import { CardView } from "./CardView";

export class HandView extends Phaser.GameObjects.Container {
  private slots: CardView[] = [];
  private onPlay: (cardId: string) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    handSize: number,
    onPlay: (cardId: string) => void
  ) {
    super(scene, x, y);
    this.onPlay = onPlay;
    scene.add.existing(this);

    const title = scene.add.text(0, -22, "Hand", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#eafff6",
    });
    this.add(title);

    const cardW = 120;
    const cardH = 72;
    const gap = 10;

    for (let i = 0; i < handSize; i++) {
      const cx = i * (cardW + gap);
      const card = new CardView(scene, cx, 0, cardW, cardH, (cardId) => {
        this.onPlay(cardId);
      });
      this.slots.push(card);
      this.add(card);
    }
  }

  setCards(cardIds: string[]) {
    for (let i = 0; i < this.slots.length; i++) {
      const id = cardIds[i] ?? "";
      this.slots[i].setCard(id);
    }
  }
}

src/game/ui/CardView.ts
import Phaser from "phaser";

export class CardView extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private cardId: string = "";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: (cardId: string) => void
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.bg = scene.add.rectangle(0, 0, w, h, 0x0f2a20, 1).setOrigin(0, 0);
    this.bg.setStrokeStyle(2, 0xb7ffe3, 0.9);

    this.label = scene.add.text(8, 8, "—", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#eafff6",
      wordWrap: { width: w - 16 },
    });

    this.add([this.bg, this.label]);

    // Interactivity
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerdown", () => {
      if (!this.cardId) return;
      onClick(this.cardId);
    });
  }

  setCard(cardId: string) {
    this.cardId = cardId;
    this.label.setText(cardId ? cardId : "—");
    this.bg.setAlpha(cardId ? 1 : 0.35);
    this.label.setAlpha(cardId ? 1 : 0.35);
  }
}

src/game/ui/DirectionPad.ts (placeholder for later)
import Phaser from "phaser";

export class DirectionPad extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    // Later: 4/8 way arrows, callbacks, highlighting
  }
}

src/game/ui/Hud.ts (placeholder for later)
import Phaser from "phaser";

export class Hud extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    // Later: timer, score, stamina, possession indicator
  }
}

5) Simulation (Pure TS)
src/sim/state/MatchState.ts
export type TeamId = "HOME" | "AWAY";
export type DeckKind = "ATTACK" | "DEFENSE";

export interface DeckState {
  draw: string[];      // top is index 0
  // optional: discard, but we cycle to bottom so not needed
}

export interface HandState {
  cards: string[];     // length 4
}

export interface TeamState {
  id: TeamId;
  deckAttack: DeckState;
  deckDefense: DeckState;
  handAttack: HandState;
  handDefense: HandState;
  cooldowns: Record<string, number>; // ms remaining
}

export interface MatchState {
  timeMs: number;
  possession: TeamId;
  teams: Record<TeamId, TeamState>;
  rngSeed: number;
}

src/sim/math/RNG.ts
// Simple deterministic RNG (mulberry32)
export class RNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed >>> 0;
  }
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

src/sim/math/shuffle.ts
import { RNG } from "./RNG";

export function shuffleInPlace<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

src/sim/cards/types.ts
import type { DeckKind } from "../state/MatchState";

export type CardType =
  | "PASS"
  | "THROUGH_PASS"
  | "SHOOT"
  | "DRIBBLE"
  | "RUSH"
  | "CROSS"
  | "LONG_BALL"
  | "TACKLE"
  | "PRESS"
  | "COVER"
  | "INTERCEPT"
  | "MARK"
  | "BLOCK"
  | "DOUBLE_TEAM"
  | "RUSH_KEEPER";

export interface CardDef {
  id: string;
  name: string;
  deck: DeckKind;
  type: CardType;
  cooldownMs: number;
  // context rules can be added later
}

src/sim/cards/CardCatalog.ts
import type { CardDef } from "./types";

export class CardCatalog {
  private map = new Map<string, CardDef>();

  constructor(cards: CardDef[]) {
    for (const c of cards) this.map.set(c.id, c);
  }

  get(id: string): CardDef | undefined {
    return this.map.get(id);
  }

  ids(): string[] {
    return [...this.map.keys()];
  }
}

src/sim/cards/validators/DeckValidator.ts
import type { CardDef } from "../types";

export interface DeckConstraints {
  total: number;
  byType: Record<string, { min: number; max: number }>;
}

export function validateDeck(deck: CardDef[], constraints: DeckConstraints): string[] {
  const errors: string[] = [];
  if (deck.length !== constraints.total) {
    errors.push(`Deck must be exactly ${constraints.total} cards (got ${deck.length}).`);
  }
  const counts: Record<string, number> = {};
  for (const c of deck) counts[c.type] = (counts[c.type] ?? 0) + 1;

  for (const [type, rule] of Object.entries(constraints.byType)) {
    const n = counts[type] ?? 0;
    if (n < rule.min) errors.push(`Need at least ${rule.min} of ${type} (got ${n}).`);
    if (n > rule.max) errors.push(`Need at most ${rule.max} of ${type} (got ${n}).`);
  }
  return errors;
}

src/sim/cards/CardResolver.ts
import type { MatchState, TeamId, DeckKind } from "../state/MatchState";
import type { CardCatalog } from "./CardCatalog";

export interface CardInput {
  direction?: { x: number; y: number };
  targetPlayerId?: string;
}

export class CardResolver {
  constructor(private catalogAttack: CardCatalog, private catalogDefense: CardCatalog) {}

  canPlay(match: MatchState, team: TeamId, cardId: string): boolean {
    const t = match.teams[team];
    const cd = t.cooldowns[cardId] ?? 0;
    return cd <= 0;
  }

  play(match: MatchState, team: TeamId, cardId: string, _input: CardInput): boolean {
    const card = this.findCard(cardId);
    if (!card) return false;
    if (!this.canPlay(match, team, cardId)) return false;

    // TODO: resolve game effects here (pass/shot/tackle). For skeleton: only cooldown.
    match.teams[team].cooldowns[cardId] = card.cooldownMs;

    return true;
  }

  getDeckKind(cardId: string): DeckKind | null {
    const card = this.findCard(cardId);
    return card?.deck ?? null;
  }

  private findCard(cardId: string) {
    return this.catalogAttack.get(cardId) ?? this.catalogDefense.get(cardId);
  }
}

src/sim/MatchSim.ts
import type { MatchState, TeamId, DeckState, HandState, DeckKind } from "./state/MatchState";
import { RNG } from "./math/RNG";
import { shuffleInPlace } from "./math/shuffle";
import { CardCatalog } from "./cards/CardCatalog";
import { CardResolver, type CardInput } from "./cards/CardResolver";
import type { CardDef } from "./cards/types";

type CatalogJson = { cards: CardDef[] };

export class MatchSim {
  private rng: RNG;
  private resolver: CardResolver;

  constructor(
    private state: MatchState,
    attackCatalog: CardCatalog,
    defenseCatalog: CardCatalog
  ) {
    this.rng = new RNG(state.rngSeed);
    this.resolver = new CardResolver(attackCatalog, defenseCatalog);
  }

  static createFromCatalogs(args: {
    attackCatalog: CatalogJson;
    defenseCatalog: CatalogJson;
    rngSeed: number;
  }): MatchSim {
    const attack = new CardCatalog(args.attackCatalog.cards);
    const defense = new CardCatalog(args.defenseCatalog.cards);

    // For skeleton: just use the full catalogs as decks (take first 15)
    const attackDeckIds = attack.ids().slice(0, 15);
    const defenseDeckIds = defense.ids().slice(0, 15);

    const rng = new RNG(args.rngSeed);
    shuffleInPlace(attackDeckIds, rng);
    shuffleInPlace(defenseDeckIds, rng);

    const mkDeck = (ids: string[]): DeckState => ({ draw: [...ids] });
    const mkHand = (): HandState => ({ cards: [] });

    const mkTeam = (id: TeamId) => ({
      id,
      deckAttack: mkDeck(attackDeckIds),
      deckDefense: mkDeck(defenseDeckIds),
      handAttack: mkHand(),
      handDefense: mkHand(),
      cooldowns: {},
    });

    const state: MatchState = {
      timeMs: 0,
      possession: "HOME",
      rngSeed: args.rngSeed,
      teams: {
        HOME: mkTeam("HOME"),
        AWAY: mkTeam("AWAY"),
      },
    };

    const sim = new MatchSim(state, attack, defense);

    // Initial draw: both hands 4
    sim.drawUpTo(state.teams.HOME.deckAttack, state.teams.HOME.handAttack, 4);
    sim.drawUpTo(state.teams.HOME.deckDefense, state.teams.HOME.handDefense, 4);
    sim.drawUpTo(state.teams.AWAY.deckAttack, state.teams.AWAY.handAttack, 4);
    sim.drawUpTo(state.teams.AWAY.deckDefense, state.teams.AWAY.handDefense, 4);

    return sim;
  }

  step(dtMs: number) {
    this.state.timeMs += dtMs;

    // cooldown tick
    for (const team of Object.values(this.state.teams)) {
      for (const [id, cd] of Object.entries(team.cooldowns)) {
        team.cooldowns[id] = Math.max(0, cd - dtMs);
      }
    }
  }

  togglePossession() {
    this.state.possession = this.state.possession === "HOME" ? "AWAY" : "HOME";
  }

  getActiveTeam(): TeamId {
    return this.state.possession;
  }

  getActiveDeckKind(): DeckKind {
    // If your team has the ball: ATTACK. Otherwise DEFENSE.
    // Here "possession team" is the one attacking.
    return "ATTACK";
  }

  getActiveHandCardIds(): string[] {
    const t = this.state.teams[this.getActiveTeam()];
    // Attacking team uses attack hand; non-possessing team would see defense in a full game.
    // For skeleton UX: show attack hand for possessing team only.
    return t.handAttack.cards;
  }

  // Play a card for the possessing team (attack hand) in this skeleton
  playCard(cardId: string, input: CardInput): boolean {
    const team = this.getActiveTeam();
    const t = this.state.teams[team];

    // Must be in hand
    const hand = t.handAttack;
    const idx = hand.cards.indexOf(cardId);
    if (idx < 0) return false;

    // Cooldown/context
    if (!this.resolver.play(this.state, team, cardId, input)) return false;

    // Cycle: remove from hand, push to bottom of deck, draw 1
    hand.cards.splice(idx, 1);
    t.deckAttack.draw.push(cardId);
    this.drawUpTo(t.deckAttack, hand, 4);

    return true;
  }

  private drawUpTo(deck: DeckState, hand: HandState, target: number) {
    while (hand.cards.length < target && deck.draw.length > 0) {
      const top = deck.draw.shift()!;
      hand.cards.push(top);
    }
  }
}


Notes:

This skeleton shows attack-hand cycling for the possessing team, which is the core “deck feel”.

Next step is to add the defense hand swap properly: show handDefense when you don’t have possession (or when viewing the opponent team’s UI), and trigger swaps on possession events.

6) Data (JSON catalogs)
src/data/cards.attack.json
{
  "cards": [
    { "id": "ATT_PASS", "name": "Pass", "deck": "ATTACK", "type": "PASS", "cooldownMs": 800 },
    { "id": "ATT_PASS2", "name": "Pass+", "deck": "ATTACK", "type": "PASS", "cooldownMs": 700 },
    { "id": "ATT_SHOOT", "name": "Shoot", "deck": "ATTACK", "type": "SHOOT", "cooldownMs": 3500 },
    { "id": "ATT_SHOOT2", "name": "Shoot+", "deck": "ATTACK", "type": "SHOOT", "cooldownMs": 3200 },
    { "id": "ATT_DRIBBLE", "name": "Dribble", "deck": "ATTACK", "type": "DRIBBLE", "cooldownMs": 2000 },
    { "id": "ATT_DRIBBLE2", "name": "Dribble+", "deck": "ATTACK", "type": "DRIBBLE", "cooldownMs": 1800 },
    { "id": "ATT_THROUGH", "name": "Through Pass", "deck": "ATTACK", "type": "THROUGH_PASS", "cooldownMs": 2200 },
    { "id": "ATT_THROUGH2", "name": "Through Pass+", "deck": "ATTACK", "type": "THROUGH_PASS", "cooldownMs": 2000 },
    { "id": "ATT_RUSH", "name": "Rush", "deck": "ATTACK", "type": "RUSH", "cooldownMs": 2500 },
    { "id": "ATT_RUSH2", "name": "Rush+", "deck": "ATTACK", "type": "RUSH", "cooldownMs": 2300 },
    { "id": "ATT_CROSS", "name": "Cross", "deck": "ATTACK", "type": "CROSS", "cooldownMs": 2600 },
    { "id": "ATT_CROSS2", "name": "Cross+", "deck": "ATTACK", "type": "CROSS", "cooldownMs": 2400 },
    { "id": "ATT_LONG", "name": "Long Ball", "deck": "ATTACK", "type": "LONG_BALL", "cooldownMs": 2800 },
    { "id": "ATT_LONG2", "name": "Long Ball+", "deck": "ATTACK", "type": "LONG_BALL", "cooldownMs": 2600 },
    { "id": "ATT_PASS3", "name": "Pass++", "deck": "ATTACK", "type": "PASS", "cooldownMs": 650 }
  ]
}

src/data/cards.defense.json
{
  "cards": [
    { "id": "DEF_TACKLE", "name": "Tackle", "deck": "DEFENSE", "type": "TACKLE", "cooldownMs": 1800 },
    { "id": "DEF_TACKLE2", "name": "Tackle+", "deck": "DEFENSE", "type": "TACKLE", "cooldownMs": 1600 },
    { "id": "DEF_PRESS", "name": "Press", "deck": "DEFENSE", "type": "PRESS", "cooldownMs": 2400 },
    { "id": "DEF_PRESS2", "name": "Press+", "deck": "DEFENSE", "type": "PRESS", "cooldownMs": 2200 },
    { "id": "DEF_COVER", "name": "Cover", "deck": "DEFENSE", "type": "COVER", "cooldownMs": 1400 },
    { "id": "DEF_COVER2", "name": "Cover+", "deck": "DEFENSE", "type": "COVER", "cooldownMs": 1300 },
    { "id": "DEF_INTERCEPT", "name": "Intercept", "deck": "DEFENSE", "type": "INTERCEPT", "cooldownMs": 2000 },
    { "id": "DEF_INTERCEPT2", "name": "Intercept+", "deck": "DEFENSE", "type": "INTERCEPT", "cooldownMs": 1800 },
    { "id": "DEF_MARK", "name": "Mark", "deck": "DEFENSE", "type": "MARK", "cooldownMs": 2600 },
    { "id": "DEF_MARK2", "name": "Mark+", "deck": "DEFENSE", "type": "MARK", "cooldownMs": 2400 },
    { "id": "DEF_BLOCK", "name": "Block", "deck": "DEFENSE", "type": "BLOCK", "cooldownMs": 2200 },
    { "id": "DEF_BLOCK2", "name": "Block+", "deck": "DEFENSE", "type": "BLOCK", "cooldownMs": 2000 },
    { "id": "DEF_DOUBLE", "name": "Double Team", "deck": "DEFENSE", "type": "DOUBLE_TEAM", "cooldownMs": 3000 },
    { "id": "DEF_DOUBLE2", "name": "Double Team+", "deck": "DEFENSE", "type": "DOUBLE_TEAM", "cooldownMs": 2800 },
    { "id": "DEF_RUSH_GK", "name": "Rush Keeper", "deck": "DEFENSE", "type": "RUSH_KEEPER", "cooldownMs": 5000 }
  ]
}

7) Quick run check

After pasting files, run:

npm run dev


You should see:

A pitch

A 4-card hand bottom-left

Clicking a card cycles it to bottom and draws next

Press P toggles possession (for now just to confirm UI refresh)