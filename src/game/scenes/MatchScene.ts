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
import { MatchSim } from "../../sim/MatchSim";
import { getCardCatalogByDeckIds, getSelectedSquadPlayers, loadProfile } from "../profile/ProfileStore";
import { ActivePlayerPanel } from "../ui/ActivePlayerPanel";
import { DirectionPad } from "../ui/DirectionPad";
import { HandView } from "../ui/HandView";
import { Hud } from "../ui/Hud";
import { PerfOverlay } from "../ui/PerfOverlay";
import { TeamCommandPanel } from "../ui/TeamCommandPanel";
import { MatchView } from "../view/MatchView";

type CatalogJson = { cards: CardDef[] };

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private directionPad!: DirectionPad;
  private teamCommandPanel!: TeamCommandPanel;
  private activePlayerPanel!: ActivePlayerPanel;
  private hud!: Hud;
  private perf!: PerfOverlay;
  private matchView!: MatchView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private feedbackText!: Phaser.GameObjects.Text;
  private announceText!: Phaser.GameObjects.Text;
  private cardDebugText!: Phaser.GameObjects.Text;
  private simAccumulatorMs = 0;
  private feedbackUntilMs = 0;
  private overlayVisible = false;
  private helpText!: Phaser.GameObjects.Text;
  private aimText!: Phaser.GameObjects.Text;
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

    const sceneH = this.scale.height;
    const handX = 16;
    const handY = sceneH - 116;
    const handWidth = HAND_SIZE * 120 + (HAND_SIZE - 1) * 10;
    const panelX = handX + handWidth + 18;
    const panelY = sceneH - 116;

    this.pitchGfx = this.add.graphics();
    this.pitchGfx.setDepth(0);
    this.drawPitch();

    this.matchView = new MatchView(this, this.sim.getRenderState());

    this.hud = new Hud(this, 20, 20);
    this.perf = new PerfOverlay(this, 740, 16);
    this.hud.setDepth(20);
    this.perf.setDepth(21);

    this.handView = new HandView(this, handX, handY, HAND_SIZE, (cardId) => {
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
    });
    this.handView.setDepth(40);

    this.activePlayerPanel = new ActivePlayerPanel(this, panelX, panelY);
    this.activePlayerPanel.setDepth(40);

    this.directionPad = new DirectionPad(this, panelX + 248, panelY + 8, (dir) => {
      this.selectedDirection = dir;
      this.updateAimText();
    });
    this.directionPad.setDepth(40);

    this.teamCommandPanel = new TeamCommandPanel(this, this.scale.width - 226, sceneH - 206, (type) => {
      const ok = this.sim.playTeamCommand(type);
      if (!ok) {
        const reason = this.sim.getLastActionMessage() || "Command unavailable";
        this.showFeedback(reason);
      }
      this.refreshTeamCommands();
    });
    this.teamCommandPanel.setDepth(40);

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

    this.refreshHand();
    this.refreshTeamCommands();

    this.helpText = this.add
      .text(16, 44, "P: toggle possession | ESC: menu | F3: perf | Click card or command", {
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

    this.aimText = this.add
      .text(16, 80, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#a7d8ff",
      })
      .setShadow(1, 1, "#000", 2);
    this.updateAimText();

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

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.pinUiToCamera();
    const initialState = this.sim.getRenderState();
    this.centerCameraOn(initialState.ball.pos.x, initialState.ball.pos.y, 0, 0, true);
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
    this.refreshHand();
    this.refreshTeamCommands();

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      for (const e of events) {
        if (e.type === "team_command_activated") {
          this.showFeedback(`Command: ${e.command}`);
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
        }
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

    this.centerCameraOn(state.ball.pos.x, state.ball.pos.y, state.ball.vel.x, state.ball.vel.y, false);
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

  private refreshTeamCommands() {
    this.teamCommandPanel.setCommands(this.sim.getTeamCommandsForUi());
  }

  private buildCardInput() {
    const state = this.sim.getRenderState();
    const actor = this.sim.getActivePlayerForUi();
    const origin = actor?.pos ?? state.ball.pos;
    const distance = 220;
    const targetPos = {
      x: origin.x + this.selectedDirection.x * distance,
      y: origin.y + this.selectedDirection.y * distance,
    };
    return {
      direction: { ...this.selectedDirection },
      targetPos,
    };
  }

  private updateAimText() {
    if (!this.aimText) return;
    const d = this.selectedDirection;
    const label =
      Math.abs(d.x) > Math.abs(d.y)
        ? d.x > 0
          ? "E"
          : "W"
        : d.y > 0
        ? "S"
        : "N";
    this.aimText.setText(`Aim: ${label} (${d.x.toFixed(1)}, ${d.y.toFixed(1)})`);
  }

  private showFeedback(text: string) {
    this.feedbackText.setText(text);
    this.feedbackUntilMs = this.time.now + 1300;
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
    this.directionPad.setScrollFactor(0);
    this.teamCommandPanel.setScrollFactor(0);
    this.activePlayerPanel.setScrollFactor(0);
    this.feedbackText.setScrollFactor(0);
    this.helpText.setScrollFactor(0);
    this.cardDebugText.setScrollFactor(0);
    this.aimText.setScrollFactor(0);
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
