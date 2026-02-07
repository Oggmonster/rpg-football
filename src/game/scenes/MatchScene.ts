import Phaser from "phaser";
import attackCards from "../../data/cards.attack.json";
import defenseCards from "../../data/cards.defense.json";
import { HAND_SIZE } from "../../sim/config/MatchConfig";
import { MAX_SIM_STEPS_PER_FRAME, SIM_TICK_MS } from "../../sim/config/SimulationConfig";
import type { CardDef } from "../../sim/cards/types";
import { MatchSim } from "../../sim/MatchSim";
import { getCardCatalogByDeckIds, getSelectedSquadPlayers, loadProfile } from "../profile/ProfileStore";
import { ActivePlayerPanel } from "../ui/ActivePlayerPanel";
import { HandView } from "../ui/HandView";
import { Hud } from "../ui/Hud";
import { PerfOverlay } from "../ui/PerfOverlay";
import { MatchView } from "../view/MatchView";

type CatalogJson = { cards: CardDef[] };

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private activePlayerPanel!: ActivePlayerPanel;
  private hud!: Hud;
  private perf!: PerfOverlay;
  private matchView!: MatchView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private feedbackText!: Phaser.GameObjects.Text;
  private simAccumulatorMs = 0;
  private feedbackUntilMs = 0;
  private overlayVisible = false;

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

    const sceneH = this.scale.height;
    const handX = 16;
    const handY = sceneH - 140;
    const handWidth = HAND_SIZE * 120 + (HAND_SIZE - 1) * 10;
    const panelX = handX + handWidth + 18;
    const panelY = sceneH - 140;

    this.pitchGfx = this.add.graphics();
    this.pitchGfx.setDepth(0);
    this.drawPitch();

    this.matchView = new MatchView(this, this.sim.getRenderState());

    this.hud = new Hud(this, 20, 20);
    this.perf = new PerfOverlay(this, 740, 16);
    this.hud.setDepth(20);
    this.perf.setDepth(21);

    this.handView = new HandView(this, handX, handY, HAND_SIZE, (cardId) => {
      const ok = this.sim.playCard(cardId, {});
      if (!ok) {
        this.handView.pulseInvalid(cardId);
        return;
      }
      this.handView.pulsePlayed(cardId);
      this.refreshHand();
    });
    this.handView.setDepth(40);

    this.activePlayerPanel = new ActivePlayerPanel(this, panelX, panelY);
    this.activePlayerPanel.setDepth(40);

    this.feedbackText = this.add
      .text(16, 528, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#fff2bc",
      })
      .setDepth(42);

    this.refreshHand();

    this.add
      .text(16, 44, "P: toggle possession | ESC: menu | F3: perf | Click card", {
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

    this.input.keyboard?.on("keydown-F3", () => {
      this.overlayVisible = !this.overlayVisible;
      this.perf.setVisible(this.overlayVisible);
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
    this.activePlayerPanel.updatePlayer(this.sim.getActivePlayerForUi());

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      this.refreshHand();
      for (const e of events) {
        if (e.type === "card_played") this.showFeedback(`Played ${e.cardId}`);
        if (e.type === "ball_transition" && ["throw_in", "corner_kick", "goal_kick", "free_kick"].includes(e.reason)) {
          this.showFeedback(e.reason.replace("_", " ").toUpperCase());
        }
      }
    }

    if (this.time.now > this.feedbackUntilMs) {
      this.feedbackText.setText("");
    }

    if (this.overlayVisible) {
      const fps = this.game.loop.actualFps;
      this.perf.setMetrics({
        fps,
        frameMs: delta,
        simSteps: steps,
        events: events.length,
      });
    }
  }

  shutdown() {
    this.matchView?.destroy();
  }

  private refreshHand() {
    const state = this.sim.getRenderState();
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
  }

  private showFeedback(text: string) {
    this.feedbackText.setText(text);
    this.feedbackUntilMs = this.time.now + 1300;
  }

  private drawPitch() {
    const g = this.pitchGfx;
    g.clear();

    const sceneW = this.scale.width;
    const sceneH = this.scale.height;
    const margin = 24;
    const pitchX = margin;
    const pitchY = 60;
    const pitchW = sceneW - margin * 2;
    const pitchH = sceneH - 60 - 160;

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

    const boxDepth = 150;
    const boxHeight = 220;
    const boxY = pitchY + pitchH / 2 - boxHeight / 2;
    g.strokeRect(pitchX, boxY, boxDepth, boxHeight);
    g.strokeRect(pitchX + pitchW - boxDepth, boxY, boxDepth, boxHeight);

    this.add
      .text(pitchX + 8, pitchY + 8, "Pitch (placeholder)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#eafff6",
      })
      .setAlpha(0.7)
      .setDepth(1);
  }
}
