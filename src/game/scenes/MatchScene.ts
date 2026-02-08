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
import { TeamCommandPanel } from "../ui/TeamCommandPanel";
import { MatchView } from "../view/MatchView";

type CatalogJson = { cards: CardDef[] };

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private teamCommandPanel!: TeamCommandPanel;
  private activePlayerPanel!: ActivePlayerPanel;
  private hud!: Hud;
  private perf!: PerfOverlay;
  private matchView!: MatchView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private commandFxGfx!: Phaser.GameObjects.Graphics;
  private feedbackText!: Phaser.GameObjects.Text;
  private announceText!: Phaser.GameObjects.Text;
  private postMatchBg!: Phaser.GameObjects.Rectangle;
  private postMatchText!: Phaser.GameObjects.Text;
  private postMatchHint!: Phaser.GameObjects.Text;
  private commentaryBg!: Phaser.GameObjects.Rectangle;
  private commentaryAccent!: Phaser.GameObjects.Rectangle;
  private commentaryText!: Phaser.GameObjects.Text;
  private cardDebugText!: Phaser.GameObjects.Text;
  private simAccumulatorMs = 0;
  private feedbackUntilMs = 0;
  private commandFxUntilMs = 0;
  private overlayVisible = false;
  private tacticalPause = false;
  private aiDebugVisible = false;
  private tacticalOverlay!: TacticalPauseOverlay;
  private helpText!: Phaser.GameObjects.Text;
  private selectedCardId: string | null = null;
  private selectedCardUntilMs = 0;
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
    const squad = getSelectedSquadPlayers(profile);

    this.sim = MatchSim.createFromCatalogs({
      attackCatalog: (selectedAttack.cards.length === 15 ? selectedAttack : attackCards) as CatalogJson,
      defenseCatalog: (selectedDefense.cards.length === 15 ? selectedDefense : defenseCards) as CatalogJson,
      rngSeed: 1337,
      homeSquad: squad,
      homeTeamCommands: profile.teamCommandDeckIds,
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
    this.commandFxGfx = this.add.graphics();
    this.commandFxGfx.setDepth(10);

    this.matchView = new MatchView(this, this.sim.getRenderState());

    this.hud = new Hud(this, 20, 20);
    this.perf = new PerfOverlay(this, 740, 16);
    this.hud.setDepth(20);
    this.perf.setDepth(21);

    this.handView = new HandView(this, handX, handY, HAND_SIZE, (cardId) => {
      try {
        this.selectedCardId = cardId;
        this.selectedCardUntilMs = this.time.now + 900;
        const cardInput = this.buildCardInput();
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
          return;
        }
        this.handView.pulsePlayed(cardId);
        this.refreshHand();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[MatchScene] card play failed", error);
        this.showFeedback(`Card error: ${msg}`);
      }
    });
    this.handView.setDepth(40);

    this.activePlayerPanel = new ActivePlayerPanel(this, panelX, panelY);
    this.activePlayerPanel.setDepth(40);

    this.teamCommandPanel = new TeamCommandPanel(this, this.scale.width - 226, sceneH - 206, (type) => {
      const ok = this.sim.playTeamCommand(type);
      if (!ok) {
        const reason = this.sim.getLastActionMessage() || "Command unavailable";
        this.showFeedback(reason);
      }
      this.refreshTeamCommands();
    });
    this.teamCommandPanel.setDepth(40);

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
    this.refreshTeamCommands();
    this.showFeedback(`Event: ${activeEvent.label}`);

    this.helpText = this.add
      .text(16, 44, "P: toggle possession | T: tactical pause | ESC: menu | F3: perf | F4: AI debug", {
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

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.pinUiToCamera();
    const initialState = this.sim.getRenderState();
    this.lastPhase = initialState.phase;
    this.centerCameraOn(initialState.ball.pos.x, initialState.ball.pos.y, 0, 0, true);
  }

  update(_time: number, delta: number) {
    try {
      const frameDeltaMs = Math.min(delta, 250);
      let steps = 0;
      if (!this.tacticalPause) {
        this.simAccumulatorMs += frameDeltaMs;
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
    this.refreshTeamCommands();

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      for (const e of events) {
        this.enqueueCommentaryFromEvent(e);
        if (e.type === "team_command_activated") {
          this.showFeedback(`Command: ${e.command}`);
          this.triggerTeamCommandOverlay(e.command, e.team === "HOME");
        }
        if (e.type === "team_command_expired") {
          this.showFeedback(`${e.command} expired`);
        }
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

    if (this.commandFxUntilMs > 0 && this.time.now > this.commandFxUntilMs) {
      this.commandFxUntilMs = 0;
      this.commandFxGfx.clear();
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
    this.matchView?.destroy();
    this.commandFxGfx?.destroy();
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

  private refreshHand() {
    const cardIds = this.sim.getActiveHandCardIds();
    const uiMeta = this.sim.getActiveHandCardUi();
    const cardState: Record<string, HandCardUiState> = {};

    for (const id of cardIds) {
      const meta = uiMeta[id];
      if (!meta) continue;
      cardState[id] = {
        status: meta.status,
        cooldownMs: meta.cooldownMs,
        hint: meta.reason,
        selected: this.selectedCardId === id && this.time.now <= this.selectedCardUntilMs,
      };
    }

    this.handView.setCards(cardIds, cardState);
  }

  private refreshTeamCommands() {
    this.teamCommandPanel.setCommands(this.sim.getTeamCommandsForUi());
  }

  private buildCardInput() {
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
    };
  }

  private showFeedback(text: string) {
    this.feedbackText.setText(text);
    this.feedbackUntilMs = this.time.now + 1300;
  }

  private triggerTeamCommandOverlay(command: string, homeTeam: boolean) {
    this.commandFxGfx.clear();
    const x = PITCH_LEFT;
    const y = PITCH_TOP;
    const w = PITCH_WIDTH;
    const h = PITCH_HEIGHT;
    const tint = homeTeam ? 0x5ab8ff : 0xffce70;

    this.commandFxGfx.fillStyle(tint, 0.08);
    this.commandFxGfx.fillRect(x, y, w, h);
    this.commandFxGfx.lineStyle(2, tint, 0.5);
    for (let i = 0; i < 6; i++) {
      const yy = y + 36 + i * 66;
      const startX = homeTeam ? x + 70 : x + w - 70;
      const endX = homeTeam ? startX + 78 : startX - 78;
      this.commandFxGfx.beginPath();
      this.commandFxGfx.moveTo(startX, yy);
      this.commandFxGfx.lineTo(endX, yy);
      this.commandFxGfx.strokePath();
      this.commandFxGfx.fillStyle(tint, 0.65);
      this.commandFxGfx.fillTriangle(endX, yy, endX + (homeTeam ? 8 : -8), yy - 5, endX + (homeTeam ? 8 : -8), yy + 5);
    }

    this.commandFxUntilMs = this.time.now + 460;
    this.announceText.setText(command.replaceAll("_", " ")).setScale(0.92).setAlpha(1);
    this.tweens.add({
      targets: this.announceText,
      duration: 420,
      scaleX: 1.06,
      scaleY: 1.06,
      alpha: 0,
      ease: "Quad.easeOut",
    });
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
    this.teamCommandPanel.setScrollFactor(0);
    this.activePlayerPanel.setScrollFactor(0);
    this.tacticalOverlay.setScrollFactor(0);
    this.feedbackText.setScrollFactor(0);
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
