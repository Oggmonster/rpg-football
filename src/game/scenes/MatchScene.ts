import Phaser from "phaser";
import attackCards from "../../data/cards.attack.json";
import defenseCards from "../../data/cards.defense.json";
import { HAND_SIZE } from "../../sim/config/MatchConfig";
import { MAX_SIM_STEPS_PER_FRAME, SIM_TICK_MS } from "../../sim/config/SimulationConfig";
import type { CardDef } from "../../sim/cards/types";
import { MatchSim } from "../../sim/MatchSim";
import { DirectionPad } from "../ui/DirectionPad";
import { HandView } from "../ui/HandView";
import { Hud } from "../ui/Hud";
import { MatchView } from "../view/MatchView";
import { getCardCatalogByDeckIds, getSelectedSquadPlayers, loadProfile } from "../profile/ProfileStore";

type CatalogJson = { cards: CardDef[] };

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private directionPad!: DirectionPad;
  private hud!: Hud;
  private matchView!: MatchView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private simAccumulatorMs = 0;
  private selectedDirection = { x: 1, y: 0 };

  constructor() {
    super("MatchScene");
  }

  create() {
    const profile = loadProfile();
    const selectedAttack = getCardCatalogByDeckIds(profile.attackDeckIds, "ATTACK");
    const selectedDefense = getCardCatalogByDeckIds(profile.defenseDeckIds, "DEFENSE");
    const squad = getSelectedSquadPlayers(profile);

    this.sim = MatchSim.createFromCatalogs({
      attackCatalog: (selectedAttack.cards.length === 15 ? selectedAttack : attackCards) as CatalogJson,
      defenseCatalog: (selectedDefense.cards.length === 15 ? selectedDefense : defenseCards) as CatalogJson,
      rngSeed: 1337,
      homeSquad: squad,
    });

    this.pitchGfx = this.add.graphics();
    this.drawPitch();

    this.matchView = new MatchView(this, this.sim.getRenderState());

    this.hud = new Hud(this, 20, 20);
    this.directionPad = new DirectionPad(this, 438, 540 - 132, (dir) => {
      this.selectedDirection = dir;
    });

    this.handView = new HandView(this, 16, 540 - 140, HAND_SIZE, (cardId) => {
      const ok = this.sim.playCard(cardId, { direction: this.selectedDirection });
      if (!ok) {
        this.handView.pulseInvalid(cardId);
        return;
      }
      this.refreshHand();
    });

    this.refreshHand();

    this.add
      .text(16, 44, "P: toggle possession | ESC: menu | Click card | Set direction pad", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#eafff6",
      })
      .setShadow(1, 1, "#000", 2);

    this.input.keyboard?.on("keydown-P", () => {
      this.sim.togglePossession();
      this.refreshHand();
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("MainMenuScene");
    });
  }

  update(_time: number, delta: number) {
    const frameDeltaMs = Math.min(delta, 250);
    this.simAccumulatorMs += frameDeltaMs;

    let steps = 0;
    while (this.simAccumulatorMs >= SIM_TICK_MS && steps < MAX_SIM_STEPS_PER_FRAME) {
      this.sim.step(SIM_TICK_MS);
      this.simAccumulatorMs -= SIM_TICK_MS;
      steps += 1;
    }

    const alpha = Phaser.Math.Clamp(this.simAccumulatorMs / SIM_TICK_MS, 0, 1);
    const state = this.sim.getRenderState();
    this.matchView.render(state, alpha);
    this.hud.updateFromState(state);

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      this.refreshHand();
    }
  }

  shutdown() {
    this.matchView?.destroy();
  }

  private refreshHand() {
    const state = this.sim.getRenderState();
    const activeDeck = this.sim.getActiveDeckKind();
    const home = state.teams.HOME;
    const cardIds = this.sim.getActiveHandCardIds();

    const disabledGlobal = state.phase === "ENDED" || state.flow.goalResetMsRemaining > 0 || home.lockoutMs > 0;
    const cardState: Record<string, { disabled: boolean; cooldownMs: number }> = {};

    for (const id of cardIds) {
      const cooldownMs = home.cooldowns[id] ?? 0;
      const disabled = disabledGlobal || cooldownMs > 0;
      cardState[id] = { disabled, cooldownMs };
    }

    this.handView.setCards(cardIds, cardState);

    if (activeDeck === "ATTACK") {
      this.directionPad.setAlpha(1);
    } else {
      this.directionPad.setAlpha(0.65);
    }
  }

  private drawPitch() {
    const g = this.pitchGfx;
    g.clear();

    const margin = 24;
    const pitchX = margin;
    const pitchY = 60;
    const pitchW = 960 - margin * 2;
    const pitchH = 540 - 60 - 160;

    g.fillStyle(0x1b6b3b, 1);
    g.fillRect(pitchX, pitchY, pitchW, pitchH);

    for (let i = 0; i < 10; i++) {
      g.fillStyle(i % 2 === 0 ? 0x1f7a41 : 0x1b6b3b, 1);
      const stripeW = pitchW / 10;
      g.fillRect(pitchX + i * stripeW, pitchY, stripeW, pitchH);
    }

    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(pitchX, pitchY, pitchW, pitchH);

    g.beginPath();
    g.moveTo(pitchX + pitchW / 2, pitchY);
    g.lineTo(pitchX + pitchW / 2, pitchY + pitchH);
    g.strokePath();

    g.strokeCircle(pitchX + pitchW / 2, pitchY + pitchH / 2, 48);

    g.strokeRect(pitchX - 6, pitchY + pitchH / 2 - 40, 6, 80);
    g.strokeRect(pitchX + pitchW, pitchY + pitchH / 2 - 40, 6, 80);

    this.add
      .text(pitchX, pitchY - 22, "Pitch (placeholder)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#eafff6",
      })
      .setAlpha(0.85);
  }
}
