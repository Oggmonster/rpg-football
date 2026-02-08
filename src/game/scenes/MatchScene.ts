import Phaser from "phaser";
import attackCards from "../../data/cards.attack.json";
import defenseCards from "../../data/cards.defense.json";
import { HAND_SIZE } from "../../sim/config/MatchConfig";
import {
  PENALTY_BOX_DEPTH,
  PENALTY_BOX_HEIGHT,
  PITCH_HEIGHT,
  PITCH_LEFT,
  PITCH_TOP,
  PITCH_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../../sim/config/PitchConfig";
import { MAX_SIM_STEPS_PER_FRAME, SIM_TICK_MS } from "../../sim/config/SimulationConfig";
import type { CardDef } from "../../sim/cards/types";
import type { SimEvent } from "../../sim/events/SimEvent";
import { MatchSim } from "../../sim/MatchSim";
import { commentaryFromEvent } from "../commentary/CommentaryMapper";
import { CommentaryQueue, type CommentaryLine } from "../commentary/CommentaryQueue";
import { eventById } from "../events/EventCatalog";
import { applyMatchProgression, type MatchProgressSummary } from "../progression/ProgressionSystem";
import { getCardCatalogByDeckIds, getSelectedSquadPlayers, loadProfile, updateCollectionAndManager } from "../profile/ProfileStore";
import { ActivePlayerPanel } from "../ui/ActivePlayerPanel";
import { HandView, type HandCardUiState } from "../ui/HandView";
import { Hud } from "../ui/Hud";
import { PerfOverlay } from "../ui/PerfOverlay";
import { TacticalPauseOverlay } from "../ui/TacticalPauseOverlay";
import { MatchView } from "../view/MatchView";

type CatalogJson = { cards: CardDef[] };
const AIM_WINDOW_MS = 5000;
const AIM_SLOWMO_FACTOR = 0.22;
const AIM_LINE_LENGTH_PX = 165;
const POWER_HOLD_MAX_MS = 900;
const AIM_CARD_TYPES = new Set<CardDef["type"]>(["PASS", "THROUGH_PASS", "LONG_BALL", "CROSS", "SHOOT", "RUSH", "DRIBBLE"]);
const POWER_AFFECTED_CARD_TYPES = new Set<CardDef["type"]>(["PASS", "THROUGH_PASS", "LONG_BALL", "CROSS", "SHOOT"]);
const HAND_HOTKEYS = ["A", "S", "D"] as const;
type HandHotkey = (typeof HAND_HOTKEYS)[number];
type AimConfirmMode = "pointer" | "hotkey";
const ATTACK_LANE_PREFS: Record<HandHotkey, CardDef["type"][]> = {
  A: ["RUSH", "DRIBBLE"],
  S: ["SHOOT"],
  D: ["PASS", "CROSS", "THROUGH_PASS", "LONG_BALL"],
};
const DEFENSE_LANE_PREFS: Record<HandHotkey, CardDef["type"][]> = {
  A: ["PRESS", "COVER"],
  S: ["TACKLE"],
  D: ["INTERCEPT", "COVER", "PRESS"],
};

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private activePlayerPanel!: ActivePlayerPanel;
  private hud!: Hud;
  private perf!: PerfOverlay;
  private matchView!: MatchView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private feedbackText!: Phaser.GameObjects.Text;
  private announceText!: Phaser.GameObjects.Text;
  private aimHintText!: Phaser.GameObjects.Text;
  private postMatchBg!: Phaser.GameObjects.Rectangle;
  private postMatchText!: Phaser.GameObjects.Text;
  private postMatchHint!: Phaser.GameObjects.Text;
  private commentaryBg!: Phaser.GameObjects.Rectangle;
  private commentaryAccent!: Phaser.GameObjects.Rectangle;
  private commentaryText!: Phaser.GameObjects.Text;
  private cardDebugText!: Phaser.GameObjects.Text;
  private simAccumulatorMs = 0;
  private feedbackUntilMs = 0;
  private overlayVisible = false;
  private tacticalPause = false;
  private aiDebugVisible = false;
  private tacticalOverlay!: TacticalPauseOverlay;
  private helpText!: Phaser.GameObjects.Text;
  private selectedCardId: string | null = null;
  private selectedCardUntilMs = 0;
  private pendingAimCardId: string | null = null;
  private aimOrigin: { x: number; y: number } | null = null;
  private aimTarget: { x: number; y: number } | null = null;
  private aimUntilMs = 0;
  private aimDragActive = false;
  private aimConfirmMode: AimConfirmMode | null = null;
  private hotkeyHeld = new Set<HandHotkey>();
  private hotkeyHoldStartedAtMs = new Map<HandHotkey, number>();
  private hotkeyCardByKey = new Map<HandHotkey, string>();
  private hotkeyDisplayCardByKey = new Map<HandHotkey, string>();
  private hotkeyAimKey: HandHotkey | null = null;
  private cardTypeById = new Map<string, CardDef["type"]>();
  private cardNameById = new Map<string, string>();
  private cardPowerById = new Map<string, number>();
  private commentaryQueue = new CommentaryQueue();
  private lastPhase = "";
  private squadIdsForProgression: string[] = [];
  private postMatchApplied = false;

  constructor() {
    super("MatchScene");
  }

  create() {
    this.postMatchApplied = false;
    const profile = loadProfile();
    const activeEvent = eventById(profile.manager.activeEventId);
    this.squadIdsForProgression = [...profile.squadIds];
    const selectedAttack = getCardCatalogByDeckIds(profile.attackDeckIds, "ATTACK");
    const selectedDefense = getCardCatalogByDeckIds(profile.defenseDeckIds, "DEFENSE");
    const attackCatalog = (selectedAttack.cards.length === 15 ? selectedAttack : attackCards) as CatalogJson;
    const defenseCatalog = (selectedDefense.cards.length === 15 ? selectedDefense : defenseCards) as CatalogJson;
    this.cardTypeById.clear();
    this.cardNameById.clear();
    this.cardPowerById.clear();
    for (const card of attackCatalog.cards) {
      this.cardTypeById.set(card.id, card.type);
      this.cardNameById.set(card.id, card.name);
      this.cardPowerById.set(card.id, this.extractCardPower(card.id));
    }
    for (const card of defenseCatalog.cards) {
      this.cardTypeById.set(card.id, card.type);
      this.cardNameById.set(card.id, card.name);
      this.cardPowerById.set(card.id, this.extractCardPower(card.id));
    }
    const squad = getSelectedSquadPlayers(profile);

    this.sim = MatchSim.createFromCatalogs({
      attackCatalog,
      defenseCatalog,
      rngSeed: 1337,
      homeSquad: squad,
      eventModifiers: activeEvent.gameplay,
    });

    const sceneH = this.scale.height;
    const handX = 16;
    const handY = sceneH - 116;
    const handWidth = HAND_SIZE * 120 + (HAND_SIZE - 1) * 10;
    const panelX = handX + handWidth + 18;
    const panelY = sceneH - 116;

    this.pitchGfx = this.add.graphics();
    this.pitchGfx.setDepth(0);
    this.drawPitch();
    this.aimGfx = this.add.graphics();
    this.aimGfx.setDepth(11);

    this.matchView = new MatchView(this, this.sim.getRenderState());

    this.hud = new Hud(this, 20, 20);
    this.perf = new PerfOverlay(this, 740, 16);
    this.hud.setDepth(20);
    this.perf.setDepth(21);

    this.handView = new HandView(this, handX, handY, HAND_SIZE, (cardId) => {
      try {
        this.selectedCardId = cardId;
        if (this.shouldUseDragAim(cardId)) {
          this.beginAimMode(cardId);
          return;
        }
        this.selectedCardUntilMs = this.time.now + 900;
        this.tryPlayCard(cardId, this.buildCardInput());
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[MatchScene] card play failed", error);
        this.showFeedback(`Card error: ${msg}`);
      }
    });
    this.handView.setDepth(40);

    this.activePlayerPanel = new ActivePlayerPanel(this, panelX, panelY);
    this.activePlayerPanel.setDepth(40);

    this.tacticalOverlay = new TacticalPauseOverlay(this, this.scale.width - 356, 58);
    this.tacticalOverlay.setDepth(55);

    this.feedbackText = this.add
      .text(16, 532, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#fff2bc",
      })
      .setDepth(42);

    this.announceText = this.add
      .text(this.scale.width / 2, 78, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#fff2bc",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(45)
      .setScrollFactor(0)
      .setAlpha(0);
    this.aimHintText = this.add
      .text(this.scale.width / 2, 100, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#c7f6ff",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(45)
      .setScrollFactor(0)
      .setVisible(false);

    this.commentaryBg = this.add
      .rectangle(this.scale.width / 2, 112, 360, 26, 0x07140f, 0.86)
      .setStrokeStyle(1, 0x8bcfb5, 0.9)
      .setDepth(46)
      .setScrollFactor(0)
      .setVisible(false);
    this.commentaryAccent = this.add
      .rectangle(this.scale.width / 2 - 176, 112, 6, 24, 0x79beff, 1)
      .setDepth(47)
      .setScrollFactor(0)
      .setVisible(false);
    this.commentaryText = this.add
      .text(this.scale.width / 2 - 166, 112, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e6fff4",
      })
      .setOrigin(0, 0.5)
      .setDepth(47)
      .setScrollFactor(0)
      .setVisible(false);

    this.postMatchBg = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, 560, 260, 0x091712, 0.94)
      .setStrokeStyle(2, 0xb7ffe3, 0.9)
      .setDepth(70)
      .setScrollFactor(0)
      .setVisible(false);
    this.postMatchText = this.add
      .text(this.scale.width / 2 - 260, this.scale.height / 2 - 110, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#e9fff4",
        lineSpacing: 4,
      })
      .setDepth(71)
      .setScrollFactor(0)
      .setVisible(false);
    this.postMatchHint = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 108, "Press ENTER to return to menu", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffd99f",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(71)
      .setScrollFactor(0)
      .setVisible(false);

    this.refreshHand();
    this.showFeedback(`Event: ${activeEvent.label}`);

    this.helpText = this.add
      .text(16, 44, "A Move | S Shoot | D Pass | hold to aim/release play | P possession | T pause | ESC menu", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#eafff6",
      })
      .setShadow(1, 1, "#000", 2);

    this.cardDebugText = this.add
      .text(16, 62, `Card Debug: ${this.sim.getLastCardDebugLine()}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffd791",
      })
      .setShadow(1, 1, "#000", 2);

    this.input.keyboard?.on("keydown-P", () => {
      this.sim.togglePossession();
      this.refreshHand();
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.pendingAimCardId) {
        this.cancelAimMode("Aim canceled");
        return;
      }
      this.scene.start("MainMenuScene");
    });

    this.input.keyboard?.on("keydown-F3", () => {
      this.overlayVisible = !this.overlayVisible;
      this.perf.setVisible(this.overlayVisible);
    });

    this.input.keyboard?.on("keydown-F4", () => {
      this.aiDebugVisible = !this.aiDebugVisible;
      this.matchView.setAiDebugVisible(this.aiDebugVisible);
      this.showFeedback(this.aiDebugVisible ? "AI debug on" : "AI debug off");
    });

    this.input.keyboard?.on("keydown-T", () => {
      this.tacticalPause = !this.tacticalPause;
      this.tacticalOverlay.setVisible(this.tacticalPause);
      this.simAccumulatorMs = 0;
      this.showFeedback(this.tacticalPause ? "Tactical pause" : "Resume play");
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      if (!this.postMatchApplied) return;
      this.scene.start("MainMenuScene");
    });
    this.input.keyboard?.on("keydown-A", () => this.onCardHotkeyDown("A"));
    this.input.keyboard?.on("keydown-S", () => this.onCardHotkeyDown("S"));
    this.input.keyboard?.on("keydown-D", () => this.onCardHotkeyDown("D"));
    this.input.keyboard?.on("keyup-A", () => this.onCardHotkeyUp("A"));
    this.input.keyboard?.on("keyup-S", () => this.onCardHotkeyUp("S"));
    this.input.keyboard?.on("keyup-D", () => this.onCardHotkeyUp("D"));
    this.input.on("pointerdown", this.onAimPointerDown, this);
    this.input.on("pointermove", this.onAimPointerMove, this);
    this.input.on("pointerup", this.onAimPointerUp, this);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.pinUiToCamera();
    const initialState = this.sim.getRenderState();
    this.lastPhase = initialState.phase;
    this.centerCameraOn(initialState.ball.pos.x, initialState.ball.pos.y, 0, 0, true);
  }

  update(_time: number, delta: number) {
    try {
      const frameDeltaMs = Math.min(delta, 250);
      if (this.pendingAimCardId && this.time.now >= this.aimUntilMs) {
        this.cancelAimMode("Aim timed out");
      }
      const simSpeed = this.pendingAimCardId ? AIM_SLOWMO_FACTOR : 1;
      let steps = 0;
      if (!this.tacticalPause) {
        this.simAccumulatorMs += frameDeltaMs * simSpeed;
        while (this.simAccumulatorMs >= SIM_TICK_MS && steps < MAX_SIM_STEPS_PER_FRAME) {
          this.sim.step(SIM_TICK_MS);
          this.simAccumulatorMs -= SIM_TICK_MS;
          steps += 1;
        }
      } else {
        this.simAccumulatorMs = 0;
      }

    const alpha = this.tacticalPause ? 0 : Phaser.Math.Clamp(this.simAccumulatorMs / SIM_TICK_MS, 0, 1);
    const state = this.sim.getRenderState();
    if (state.phase !== this.lastPhase) {
      if (state.phase === "HALFTIME") {
        this.commentaryQueue.enqueue({ text: "Halftime. Reset and adjust.", team: null, priority: 82, immediate: true }, this.time.now);
      } else if (state.phase === "ENDED") {
        this.commentaryQueue.enqueue({ text: "Full time.", team: null, priority: 90, immediate: true }, this.time.now);
      } else if (state.phase === "LIVE" && this.lastPhase === "HALFTIME") {
        this.commentaryQueue.enqueue({ text: "Second half underway!", team: null, priority: 76, immediate: true }, this.time.now);
      }
      this.lastPhase = state.phase;
    }
    if (state.phase === "ENDED" && !this.postMatchApplied) {
      this.applyPostMatchProgression(state);
    }
    const activePlayer = this.sim.getActivePlayerForUi();
    this.matchView.render(state, alpha, activePlayer?.id ?? null);
    this.hud.updateFromState(state);
    this.activePlayerPanel.updatePlayer(activePlayer);
    if (this.selectedCardUntilMs > 0 && this.time.now >= this.selectedCardUntilMs) {
      this.selectedCardId = null;
      this.selectedCardUntilMs = 0;
    }
    this.refreshHand();
    this.updateAimVisuals();

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      for (const e of events) {
        this.enqueueCommentaryFromEvent(e);
        if (e.type === "card_result") {
          const prefix = e.cardType ?? e.cardId;
          const msg = e.success ? `${prefix}: ${e.reason}` : `${prefix}: ${e.reason}`;
          this.showFeedback(msg);
          this.announceText.setText(msg).setScale(e.success ? 0.92 : 0.9).setAlpha(1);
          this.tweens.add({
            targets: this.announceText,
            scaleX: e.success ? 1.04 : 1.02,
            scaleY: e.success ? 1.04 : 1.02,
            alpha: 0,
            duration: e.success ? 500 : 620,
            ease: "Quad.easeOut",
          });
          if (e.success && e.cardType) {
            if (["PASS", "THROUGH_PASS", "LONG_BALL", "CROSS"].includes(e.cardType)) {
              this.spawnPitchBurst(state.ball.pos.x, state.ball.pos.y, 0x9ff7df, 6);
            }
            if (e.cardType === "SHOOT") {
              this.cameras.main.shake(95, 0.0015, true);
              this.spawnPitchBurst(state.ball.pos.x, state.ball.pos.y, 0xffbe8a, 8);
            }
            if (e.cardType === "TACKLE") {
              this.spawnPitchBurst(state.ball.pos.x, state.ball.pos.y, 0xff9d83, 9);
            }
          }
        }
        if (e.type === "ball_transition" && ["throw_in", "corner_kick", "goal_kick", "free_kick"].includes(e.reason)) {
          this.showFeedback(e.reason.replace("_", " ").toUpperCase());
        }
        if (e.type === "goal_scored") {
          this.cameras.main.shake(150, 0.0022, true);
          this.spawnPitchBurst(state.ball.pos.x, state.ball.pos.y, e.team === "HOME" ? 0x79beff : 0xffd673, 14);
        }
      }
    }

    const nextCommentary = this.commentaryQueue.pull(this.time.now);
    if (nextCommentary) {
      this.showCommentary(nextCommentary);
    } else if (!this.commentaryQueue.isActive(this.time.now) && this.commentaryBg.visible) {
      this.hideCommentary();
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

      this.centerCameraOn(state.ball.pos.x, state.ball.pos.y, state.ball.vel.x, state.ball.vel.y, false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[MatchScene] update failed", error);
      this.showFeedback(`Runtime error: ${msg}`);
      this.simAccumulatorMs = 0;
    }
  }

  shutdown() {
    this.input.off("pointerdown", this.onAimPointerDown, this);
    this.input.off("pointermove", this.onAimPointerMove, this);
    this.input.off("pointerup", this.onAimPointerUp, this);
    this.matchView?.destroy();
    this.aimGfx?.destroy();
    this.aimHintText?.destroy();
    this.postMatchBg?.destroy();
    this.postMatchText?.destroy();
    this.postMatchHint?.destroy();
  }

  private enqueueCommentaryFromEvent(event: SimEvent) {
    const lines = commentaryFromEvent(event);
    for (const line of lines) {
      this.commentaryQueue.enqueue(line, this.time.now);
    }
  }

  private showCommentary(line: CommentaryLine) {
    const tint = line.team === "AWAY" ? 0xffd673 : 0x79beff;
    this.commentaryAccent.setFillStyle(tint, 1);
    this.commentaryText.setText(line.text);
    this.commentaryBg.setVisible(true).setAlpha(0.05);
    this.commentaryAccent.setVisible(true).setAlpha(0.05);
    this.commentaryText.setVisible(true).setAlpha(0.05);

    this.tweens.add({
      targets: [this.commentaryBg, this.commentaryAccent, this.commentaryText],
      duration: 140,
      alpha: 1,
      ease: "Quad.easeOut",
    });
  }

  private hideCommentary() {
    this.tweens.add({
      targets: [this.commentaryBg, this.commentaryAccent, this.commentaryText],
      duration: 120,
      alpha: 0,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.commentaryBg.setVisible(false);
        this.commentaryAccent.setVisible(false);
        this.commentaryText.setVisible(false);
      },
    });
  }

  private applyPostMatchProgression(state: ReturnType<MatchSim["getRenderState"]>) {
    const profile = loadProfile();
    const { updated, summary } = applyMatchProgression(profile, state, this.squadIdsForProgression);
    updateCollectionAndManager({ collection: updated.collection, manager: updated.manager });
    this.postMatchApplied = true;
    this.showPostMatchSummary(summary);
  }

  private showPostMatchSummary(summary: MatchProgressSummary) {
    const headline = `FULL TIME ${summary.scoreLabel} (${summary.resultLabel})`;
    const divisionDelta =
      summary.divisionAfter < summary.divisionBefore
        ? "PROMOTION"
        : summary.divisionAfter > summary.divisionBefore
        ? "RELEGATION"
        : `DIV ${summary.divisionAfter}`;
    const managerLine = `Event: ${summary.eventLabel} | Manager +${summary.managerXpGained} XP | Coins +${summary.coinsGained}`;
    const seasonLine = `Level ${summary.managerLevelBefore} -> ${summary.managerLevelAfter} | Season ${summary.seasonNumber} | ${divisionDelta}`;
    const topPlayers = summary.playerGains
      .slice(0, 6)
      .map((p) => {
        const lv = p.levelsGained > 0 ? ` L${p.levelBefore}->${p.levelAfter}` : "";
        const perks = p.perkSlotsUnlocked > 0 ? " +Perk" : "";
        const traits = p.newTraits.length > 0 ? " +Trait" : "";
        return `${p.name}: +${p.xpGained} XP${lv}${perks}${traits}`;
      })
      .join("\n");

    const seasonNotice = summary.seasonReset ? "\nSeason rollover applied." : "";
    this.postMatchText.setText(`${headline}\n${managerLine}\n${seasonLine}${seasonNotice}\n\nSquad Progress\n${topPlayers}`);
    this.postMatchBg.setVisible(true);
    this.postMatchText.setVisible(true);
    this.postMatchHint.setVisible(true);
  }

  private tryPlayCard(
    cardId: string,
    cardInput: { direction: { x: number; y: number }; targetPos: { x: number; y: number }; power?: number }
  ) {
    const ok = this.sim.playCard(cardId, cardInput);
    this.cardDebugText.setText(`Card Debug: ${this.sim.getLastCardDebugLine()}`);
    if (!ok) {
      this.handView.pulseInvalid(cardId);
      const reason = this.sim.getLastActionMessage();
      if (reason) {
        this.showFeedback(reason);
        this.announceText.setText(reason).setScale(0.94).setAlpha(1);
        this.tweens.add({
          targets: this.announceText,
          scaleX: 1.02,
          scaleY: 1.02,
          alpha: 0,
          duration: 620,
          ease: "Quad.easeOut",
        });
      }
      return false;
    }
    this.handView.pulsePlayed(cardId);
    this.refreshHand();
    return true;
  }

  private onCardHotkeyDown(key: HandHotkey) {
    if (this.hotkeyHeld.has(key)) return;
    this.hotkeyHeld.add(key);
    this.hotkeyHoldStartedAtMs.set(key, this.time.now);

    if (this.pendingAimCardId && this.hotkeyAimKey && this.hotkeyAimKey !== key) {
      this.showFeedback("Finish current aim first");
      return;
    }

    const cardId = this.getCardIdForHotkey(key);
    if (!cardId) {
      this.showFeedback(`${key}: empty slot`);
      this.hotkeyCardByKey.delete(key);
      return;
    }

    this.hotkeyCardByKey.set(key, cardId);
    this.selectedCardId = cardId;
    this.selectedCardUntilMs = this.time.now + AIM_WINDOW_MS;

    if (this.shouldUseDragAim(cardId)) {
      this.hotkeyAimKey = key;
      this.beginAimMode(cardId, "hotkey");
      this.setAimTargetFromPointer(this.input.activePointer);
      return;
    }

    this.showFeedback(`Hold ${key}, release to play`);
  }

  private onCardHotkeyUp(key: HandHotkey) {
    if (!this.hotkeyHeld.has(key)) return;
    this.hotkeyHeld.delete(key);
    const holdStartedAt = this.hotkeyHoldStartedAtMs.get(key);
    this.hotkeyHoldStartedAtMs.delete(key);
    const holdMs = holdStartedAt !== undefined ? Math.max(0, this.time.now - holdStartedAt) : 0;

    const cardId = this.hotkeyCardByKey.get(key);
    this.hotkeyCardByKey.delete(key);
    if (!cardId) return;

    if (this.pendingAimCardId && this.hotkeyAimKey === key) {
      this.executeAimedCard(holdMs);
      this.hotkeyAimKey = null;
      return;
    }

    if (this.pendingAimCardId) return;

    this.selectedCardId = cardId;
    this.selectedCardUntilMs = this.time.now + 900;
    this.tryPlayCard(cardId, this.buildCardInput(holdMs, cardId));
  }

  private getCardIdForHotkey(key: HandHotkey) {
    return this.hotkeyDisplayCardByKey.get(key) ?? null;
  }

  private shouldUseDragAim(cardId: string) {
    if (this.sim.getActiveDeckKind() !== "ATTACK") return false;
    const type = this.cardTypeById.get(cardId);
    if (!type) return false;
    return AIM_CARD_TYPES.has(type);
  }

  private beginAimMode(cardId: string, confirmMode: AimConfirmMode = "pointer") {
    this.cancelAimMode();
    const state = this.sim.getRenderState();
    const actor = this.sim.getActivePlayerForUi();
    const rawOrigin = actor?.pos ?? state.ball.pos;
    const origin = this.clampAimPoint(rawOrigin.x, rawOrigin.y);
    const dirX = actor?.teamId === "AWAY" ? -1 : 1;

    this.pendingAimCardId = cardId;
    this.aimOrigin = origin;
    this.aimTarget = this.clampAimPoint(origin.x + dirX * AIM_LINE_LENGTH_PX, origin.y);
    this.aimUntilMs = this.time.now + AIM_WINDOW_MS;
    this.aimDragActive = false;
    this.aimConfirmMode = confirmMode;
    this.selectedCardId = cardId;
    this.selectedCardUntilMs = this.aimUntilMs;

    const controlHint = confirmMode === "hotkey" ? "release key to play" : "release mouse to play";
    this.showFeedback(`Aim: drag (${controlHint}, 5.0s)`);
    this.updateAimVisuals();
  }

  private cancelAimMode(message?: string) {
    const hotkeyAimKey = this.hotkeyAimKey;
    const confirmMode = this.aimConfirmMode;
    this.pendingAimCardId = null;
    this.aimOrigin = null;
    this.aimTarget = null;
    this.aimUntilMs = 0;
    this.aimDragActive = false;
    this.aimConfirmMode = null;
    this.aimGfx.clear();
    this.aimHintText.setVisible(false).setText("");
    if (confirmMode === "hotkey" && hotkeyAimKey) {
      this.hotkeyCardByKey.delete(hotkeyAimKey);
      this.hotkeyAimKey = null;
    }
    if (this.selectedCardUntilMs === 0 || this.time.now >= this.selectedCardUntilMs) {
      this.selectedCardId = null;
    }
    if (message) this.showFeedback(message);
  }

  private executeAimedCard(holdMs?: number) {
    if (!this.pendingAimCardId) return;
    const cardId = this.pendingAimCardId;
    const input = this.buildAimedCardInput(holdMs, cardId);
    this.cancelAimMode();
    this.selectedCardId = cardId;
    this.selectedCardUntilMs = this.time.now + 900;
    this.tryPlayCard(cardId, input);
  }

  private buildAimedCardInput(holdMs?: number, cardId?: string) {
    if (!this.aimOrigin || !this.aimTarget) {
      return this.buildCardInput(holdMs, cardId);
    }
    const dx = this.aimTarget.x - this.aimOrigin.x;
    const dy = this.aimTarget.y - this.aimOrigin.y;
    const mag = Math.hypot(dx, dy);
    const fallback = this.buildCardInput().direction;
    const direction = mag > 0.0001 ? { x: dx / mag, y: dy / mag } : fallback;
    const power = cardId ? this.getCardInputPower(cardId, holdMs) : undefined;
    return {
      direction,
      targetPos: { x: this.aimTarget.x, y: this.aimTarget.y },
      power,
    };
  }

  private updateAimVisuals() {
    if (!this.pendingAimCardId || !this.aimOrigin || !this.aimTarget) {
      this.aimGfx.clear();
      this.aimHintText.setVisible(false).setText("");
      return;
    }
    const remainingMs = Math.max(0, this.aimUntilMs - this.time.now);
    const type = this.pendingAimCardId ? this.cardTypeById.get(this.pendingAimCardId) : undefined;
    const showPower = Boolean(type && POWER_AFFECTED_CARD_TYPES.has(type));
    const power = showPower ? this.getCurrentAimPower(this.pendingAimCardId ?? undefined) : 0;
    const suffix = this.aimConfirmMode === "hotkey" ? "release key to play" : "release mouse to play";
    const powerTxt = showPower ? `  POW ${Math.round(power * 100)}%` : "";
    this.aimHintText.setVisible(true).setText(`AIM ${(remainingMs / 1000).toFixed(1)}s  ${suffix}${powerTxt}`);

    this.aimGfx.clear();
    this.aimGfx.lineStyle(2, 0x8de8ff, 0.75);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(this.aimOrigin.x, this.aimOrigin.y);
    this.aimGfx.lineTo(this.aimTarget.x, this.aimTarget.y);
    this.aimGfx.strokePath();
    if (showPower) {
      const fillX = Phaser.Math.Linear(this.aimOrigin.x, this.aimTarget.x, power);
      const fillY = Phaser.Math.Linear(this.aimOrigin.y, this.aimTarget.y, power);
      this.aimGfx.lineStyle(4, 0xffe38b, 0.95);
      this.aimGfx.beginPath();
      this.aimGfx.moveTo(this.aimOrigin.x, this.aimOrigin.y);
      this.aimGfx.lineTo(fillX, fillY);
      this.aimGfx.strokePath();
    }
    this.aimGfx.fillStyle(0x8de8ff, 0.22);
    this.aimGfx.fillCircle(this.aimOrigin.x, this.aimOrigin.y, 10);
    this.aimGfx.fillStyle(0xffffff, 0.95);
    this.aimGfx.fillCircle(this.aimTarget.x, this.aimTarget.y, 4);
  }

  private onAimPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.pendingAimCardId) return;
    this.aimDragActive = true;
    this.setAimTargetFromPointer(pointer);
  }

  private onAimPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pendingAimCardId) return;
    if (this.aimConfirmMode !== "hotkey" && !this.aimDragActive) return;
    this.setAimTargetFromPointer(pointer);
  }

  private onAimPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.pendingAimCardId) return;
    if (this.aimConfirmMode !== "hotkey" && !this.aimDragActive) return;
    this.aimDragActive = false;
    this.setAimTargetFromPointer(pointer);
    if (this.aimConfirmMode === "pointer") {
      this.executeAimedCard();
    }
  }

  private setAimTargetFromPointer(pointer: Phaser.Input.Pointer) {
    if (!this.aimOrigin) return;
    const worldX = Number.isFinite(pointer.worldX) ? pointer.worldX : this.cameras.main.worldView.centerX;
    const worldY = Number.isFinite(pointer.worldY) ? pointer.worldY : this.cameras.main.worldView.centerY;
    const dx = worldX - this.aimOrigin.x;
    const dy = worldY - this.aimOrigin.y;
    const mag = Math.hypot(dx, dy);
    const fallback = this.aimTarget
      ? { x: this.aimTarget.x - this.aimOrigin.x, y: this.aimTarget.y - this.aimOrigin.y }
      : { x: 1, y: 0 };
    const dir =
      mag > 0.0001
        ? { x: dx / mag, y: dy / mag }
        : Math.hypot(fallback.x, fallback.y) > 0.0001
        ? { x: fallback.x / Math.hypot(fallback.x, fallback.y), y: fallback.y / Math.hypot(fallback.x, fallback.y) }
        : { x: 1, y: 0 };
    this.aimTarget = this.clampAimPoint(this.aimOrigin.x + dir.x * AIM_LINE_LENGTH_PX, this.aimOrigin.y + dir.y * AIM_LINE_LENGTH_PX);
    this.updateAimVisuals();
  }

  private clampAimPoint(x: number, y: number) {
    return {
      x: Phaser.Math.Clamp(Number.isFinite(x) ? x : PITCH_LEFT + PITCH_WIDTH / 2, PITCH_LEFT + 6, PITCH_LEFT + PITCH_WIDTH - 6),
      y: Phaser.Math.Clamp(Number.isFinite(y) ? y : PITCH_TOP + PITCH_HEIGHT / 2, PITCH_TOP + 6, PITCH_TOP + PITCH_HEIGHT - 6),
    };
  }

  private getHotkeyDisplayCards(cardIds: string[]) {
    const used = new Set<string>();
    const out: string[] = [];
    const prefs = this.sim.getActiveDeckKind() === "ATTACK" ? ATTACK_LANE_PREFS : DEFENSE_LANE_PREFS;

    for (const key of HAND_HOTKEYS) {
      const candidate = this.pickBestByPreferredTypes(cardIds, prefs[key], used);
      if (candidate) {
        used.add(candidate);
        out.push(candidate);
      } else {
        out.push("");
      }
    }

    const leftovers = cardIds
      .filter((id) => !used.has(id))
      .sort((a, b) => (this.cardPowerById.get(b) ?? 1) - (this.cardPowerById.get(a) ?? 1));
    for (let i = 0; i < out.length; i++) {
      if (out[i]) continue;
      out[i] = leftovers.shift() ?? "";
    }
    return out;
  }

  private pickBestByPreferredTypes(cardIds: string[], preferred: CardDef["type"][], used: Set<string>) {
    let best: string | null = null;
    let bestRank = Number.POSITIVE_INFINITY;
    let bestPower = Number.NEGATIVE_INFINITY;
    for (const id of cardIds) {
      if (used.has(id)) continue;
      const type = this.cardTypeById.get(id);
      if (!type) continue;
      const rank = preferred.indexOf(type);
      if (rank < 0) continue;
      const power = this.cardPowerById.get(id) ?? 1;
      if (rank < bestRank || (rank === bestRank && power > bestPower)) {
        bestRank = rank;
        bestPower = power;
        best = id;
      }
    }
    return best;
  }

  private getCardLabel(cardId: string) {
    const type = this.cardTypeById.get(cardId) ?? "PASS";
    const power = this.cardPowerById.get(cardId) ?? 1;
    const action = this.getActionName(type);
    return `${action} P${power}`;
  }

  private getActionName(type: CardDef["type"]) {
    switch (type) {
      case "LONG_BALL":
        return "LONG";
      case "THROUGH_PASS":
        return "THRU";
      default:
        return type;
    }
  }

  private extractCardPower(cardId: string) {
    const m = cardId.match(/_(\d+)$/);
    if (!m) return 1;
    const value = Number.parseInt(m[1], 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private refreshHand() {
    const cardIds = this.sim.getActiveHandCardIds();
    const ordered = this.getHotkeyDisplayCards(cardIds);
    this.hotkeyDisplayCardByKey.clear();
    if (ordered[0]) this.hotkeyDisplayCardByKey.set("A", ordered[0]);
    if (ordered[1]) this.hotkeyDisplayCardByKey.set("S", ordered[1]);
    if (ordered[2]) this.hotkeyDisplayCardByKey.set("D", ordered[2]);
    const uiMeta = this.sim.getActiveHandCardUi();
    const cardState: Record<string, HandCardUiState> = {};
    const cardLabels: Record<string, string> = {};

    for (const id of cardIds) {
      const meta = uiMeta[id];
      if (!meta) continue;
      cardState[id] = {
        status: meta.status,
        cooldownMs: meta.cooldownMs,
        hint: meta.reason,
        selected: this.selectedCardId === id && this.time.now <= this.selectedCardUntilMs,
      };
      cardLabels[id] = this.getCardLabel(id);
    }

    this.handView.setCards(ordered, cardState, cardLabels);
  }

  private buildCardInput(holdMs?: number, cardId?: string) {
    const state = this.sim.getRenderState();
    const actor = this.sim.getActivePlayerForUi();
    const rawOrigin = actor?.pos ?? state.ball.pos;
    const origin = {
      x: Number.isFinite(rawOrigin.x) ? rawOrigin.x : state.ball.pos.x,
      y: Number.isFinite(rawOrigin.y) ? rawOrigin.y : state.ball.pos.y,
    };
    const distance = 220;
    const dirX = actor?.teamId === "AWAY" ? -1 : 1;
    const direction = { x: dirX, y: 0 };
    const targetPos = {
      x: origin.x + direction.x * distance,
      y: Number.isFinite(origin.y) ? origin.y : state.ball.pos.y,
    };
    return {
      direction,
      targetPos,
      power: cardId ? this.getCardInputPower(cardId, holdMs) : undefined,
    };
  }

  private getCurrentAimPower(cardId?: string) {
    if (!cardId) return 0.5;
    if (!this.hotkeyAimKey) return 0.5;
    const startedAt = this.hotkeyHoldStartedAtMs.get(this.hotkeyAimKey);
    const holdMs = startedAt !== undefined ? Math.max(0, this.time.now - startedAt) : 0;
    return this.getCardInputPower(cardId, holdMs) ?? 0.5;
  }

  private getCardInputPower(cardId: string, holdMs?: number) {
    const type = this.cardTypeById.get(cardId);
    if (!type || !POWER_AFFECTED_CARD_TYPES.has(type)) return undefined;
    const ms = Math.max(0, holdMs ?? 0);
    const norm = Phaser.Math.Clamp(ms / POWER_HOLD_MAX_MS, 0, 1);
    return 0.2 + norm * 0.8;
  }

  private showFeedback(text: string) {
    this.feedbackText.setText(text);
    this.feedbackUntilMs = this.time.now + 1300;
  }

  private spawnPitchBurst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.25, 0.25);
      const speed = Phaser.Math.FloatBetween(14, 58);
      const piece = this.add.rectangle(x, y, 2, 2, color, 0.95).setDepth(18);
      this.tweens.add({
        targets: piece,
        duration: 160,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        ease: "Quad.easeOut",
        onComplete: () => piece.destroy(),
      });
    }
  }

  private drawPitch() {
    const g = this.pitchGfx;
    g.clear();

    const pitchX = PITCH_LEFT;
    const pitchY = PITCH_TOP;
    const pitchW = PITCH_WIDTH;
    const pitchH = PITCH_HEIGHT;

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

    g.strokeCircle(pitchX + pitchW / 2, pitchY + pitchH / 2, 92);

    g.strokeRect(pitchX - 8, pitchY + pitchH / 2 - 70, 8, 140);
    g.strokeRect(pitchX + pitchW, pitchY + pitchH / 2 - 70, 8, 140);

    const boxDepth = PENALTY_BOX_DEPTH;
    const boxHeight = PENALTY_BOX_HEIGHT;
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

  private pinUiToCamera() {
    this.hud.setScrollFactor(0);
    this.perf.setScrollFactor(0);
    this.handView.setScrollFactor(0);
    this.activePlayerPanel.setScrollFactor(0);
    this.tacticalOverlay.setScrollFactor(0);
    this.feedbackText.setScrollFactor(0);
    this.aimHintText.setScrollFactor(0);
    this.helpText.setScrollFactor(0);
    this.cardDebugText.setScrollFactor(0);
    this.postMatchBg.setScrollFactor(0);
    this.postMatchText.setScrollFactor(0);
    this.postMatchHint.setScrollFactor(0);
  }

  private centerCameraOn(x: number, y: number, vx: number, vy: number, instant: boolean) {
    const cam = this.cameras.main;
    const maxX = Math.max(0, WORLD_WIDTH - cam.width);
    const maxY = Math.max(0, WORLD_HEIGHT - cam.height);
    const lookAheadTimeSec = 0.24;
    const lookAheadX = Math.abs(vx) < 20 ? 0 : Phaser.Math.Clamp(vx * lookAheadTimeSec, -140, 140);
    const lookAheadY = Math.abs(vy) < 20 ? 0 : Phaser.Math.Clamp(vy * lookAheadTimeSec, -90, 90);
    const desiredX = x + lookAheadX;
    const desiredY = y + lookAheadY;

    let targetX = cam.scrollX;
    let targetY = cam.scrollY;

    if (instant) {
      targetX = desiredX - cam.width / 2;
      targetY = desiredY - cam.height / 2;
    } else {
      const deadZoneW = cam.width * 0.3;
      const deadZoneH = cam.height * 0.24;
      const dzLeft = cam.scrollX + (cam.width - deadZoneW) / 2;
      const dzRight = dzLeft + deadZoneW;
      const dzTop = cam.scrollY + (cam.height - deadZoneH) / 2;
      const dzBottom = dzTop + deadZoneH;

      if (desiredX < dzLeft) {
        targetX = desiredX - (cam.width - deadZoneW) / 2;
      } else if (desiredX > dzRight) {
        targetX = desiredX - (cam.width + deadZoneW) / 2;
      }

      if (desiredY < dzTop) {
        targetY = desiredY - (cam.height - deadZoneH) / 2;
      } else if (desiredY > dzBottom) {
        targetY = desiredY - (cam.height + deadZoneH) / 2;
      }
    }

    targetX = Phaser.Math.Clamp(targetX, 0, maxX);
    targetY = Phaser.Math.Clamp(targetY, 0, maxY);
    const lerp = instant ? 1 : 0.12;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, lerp);
    cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, lerp);
  }
}
