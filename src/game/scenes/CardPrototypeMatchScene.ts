import Phaser from "phaser";
import {
  CardFootballEngine,
  type ActionResolutionView,
  type AttackActionInput,
  type MatchCardView,
  type MatchStateView,
  type MatchTacticId,
  type PassTargetView,
  type PitchPlayerView,
  type ShotSetupView,
  type SlotId,
} from "../match/CardFootballEngine";

type CardButton = {
  bg: Phaser.GameObjects.Rectangle;
  accent: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  meta: Phaser.GameObjects.Text;
  cardId: string | null;
  kind: string | null;
};

type TokenView = {
  body: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  chance: Phaser.GameObjects.Text;
  playerId: string;
  teamId: "HOME" | "AWAY";
};

type SelectionMode = "NONE" | "PASS" | "DRIBBLE" | "SHOT" | "HALFTIME";
type ShotPhase = "IDLE" | "AIM" | "POWER";

const VIEW_W = 1280;
const VIEW_H = 720;
const WORLD_W = 1720;
const WORLD_H = 980;
const PITCH_X = 100;
const PITCH_Y = 80;
const PITCH_W = 1520;
const PITCH_H = 840;

const BG = 0x081017;
const HUD = 0x091621;
const HUD_ALT = 0x0e2233;
const GRASS_DARK = 0x1f5b43;
const GRASS_LIGHT = 0x26684c;
const LINE = 0xf2f7ee;
const HOME = 0x4ed6cf;
const AWAY = 0xff9a63;
const GOLD = 0xf4d06f;

export class CardPrototypeMatchScene extends Phaser.Scene {
  private engine!: CardFootballEngine;
  private fieldGfx!: Phaser.GameObjects.Graphics;
  private pitchHit!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private commentaryText!: Phaser.GameObjects.Text;
  private cpuText!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private tooltipText!: Phaser.GameObjects.Text;
  private ballMarker!: Phaser.GameObjects.Arc;
  private selectionCircle!: Phaser.GameObjects.Arc;
  private dribblePreviewText!: Phaser.GameObjects.Text;
  private handButtons: CardButton[] = [];
  private tokenViews = new Map<string, TokenView>();
  private selectionMode: SelectionMode = "NONE";
  private selectedCardId: string | null = null;
  private passTargets = new Map<string, PassTargetView>();
  private shotCardId: string | null = null;
  private shotSetup: ShotSetupView | null = null;
  private shotPhase: ShotPhase = "IDLE";
  private shotCursor = 0.5;
  private shotDirection = 1;
  private shotAimQuality = 0.5;
  private shotOverlay!: Phaser.GameObjects.Container;
  private shotGoalFrame!: Phaser.GameObjects.Rectangle;
  private shotAimBar!: Phaser.GameObjects.Rectangle;
  private shotPowerBar!: Phaser.GameObjects.Rectangle;
  private shotAimMarker!: Phaser.GameObjects.Rectangle;
  private shotPowerMarker!: Phaser.GameObjects.Rectangle;
  private shotText!: Phaser.GameObjects.Text;
  private halftimePanel!: Phaser.GameObjects.Container;
  private fulltimePanel!: Phaser.GameObjects.Container;
  private animationLocked = false;
  private selectedSubSlot: SlotId | null = null;
  private commentaryEvent: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("MatchScene");
  }

  create() {
    this.engine = new CardFootballEngine({ rngSeed: 1337 });

    this.cameras.main.setBackgroundColor(BG);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(0.78);
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);

    this.createPitch();
    this.createHud();
    this.createHand();
    this.createShotOverlay();
    this.createHalftimePanel();
    this.createFulltimePanel();
    this.createTokens();
    this.bindInput();
    this.refreshUi(true);
  }

  update(_time: number, delta: number) {
    this.updateShotMiniGame(delta);
  }

  private createPitch() {
    this.fieldGfx = this.add.graphics();
    this.redrawPitch();
    this.pitchHit = this.add.rectangle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, PITCH_W, PITCH_H, 0x000000, 0.001).setInteractive();
    this.ballMarker = this.add.circle(0, 0, 9, 0x081017, 1).setStrokeStyle(5, 0xfffbef, 1);
    this.selectionCircle = this.add.circle(0, 0, 40, GOLD, 0.06).setStrokeStyle(2, GOLD, 0.9).setVisible(false);
    this.dribblePreviewText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffe7a0",
      backgroundColor: "#12212faa",
      padding: { left: 6, right: 6, top: 4, bottom: 4 },
    }).setVisible(false);
  }

  private createHud() {
    this.add.rectangle(VIEW_W / 2, 30, VIEW_W - 24, 48, HUD, 0.94).setScrollFactor(0).setStrokeStyle(1, 0x35586f, 0.7);
    this.add.rectangle(VIEW_W / 2, VIEW_H - 92, VIEW_W - 24, 150, HUD, 0.96).setScrollFactor(0).setStrokeStyle(1, 0x35586f, 0.7);
    this.add.rectangle(190, VIEW_H - 92, 312, 124, HUD_ALT, 0.96).setScrollFactor(0).setStrokeStyle(1, 0x35586f, 0.7);
    this.add.rectangle(VIEW_W - 182, VIEW_H - 92, 312, 124, HUD_ALT, 0.96).setScrollFactor(0).setStrokeStyle(1, 0x35586f, 0.7);

    this.scoreText = this.add.text(34, 14, "", {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setScrollFactor(0);
    this.stateText = this.add.text(520, 13, "", {
      fontFamily: "Georgia",
      fontSize: "22px",
      color: "#f7f3e8",
      fontStyle: "italic",
    }).setScrollFactor(0);
    this.roundText = this.add.text(940, 14, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#b9deec",
    }).setScrollFactor(0);
    this.promptText = this.add.text(34, VIEW_H - 150, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffe7a0",
      wordWrap: { width: 250 },
    }).setScrollFactor(0);
    this.commentaryText = this.add.text(VIEW_W - 328, VIEW_H - 148, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d8e7f3",
      wordWrap: { width: 284 },
    }).setScrollFactor(0);
    this.cpuText = this.add.text(VIEW_W - 330, 56, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffd1ad",
      wordWrap: { width: 286 },
    }).setScrollFactor(0);

    this.tooltipBg = this.add.rectangle(0, 0, 228, 92, 0x08131c, 0.95).setOrigin(0, 0).setScrollFactor(0).setVisible(false).setStrokeStyle(1, 0x60d2d7, 0.8);
    this.tooltipText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#eff8f9",
      wordWrap: { width: 212 },
    }).setScrollFactor(0).setVisible(false);
  }

  private createHand() {
    for (let index = 0; index < 3; index += 1) {
      const x = 320 + index * 220;
      const y = VIEW_H - 148;
      const bg = this.add.rectangle(x, y, 196, 108, 0x183246, 1).setOrigin(0, 0).setScrollFactor(0).setStrokeStyle(2, 0x406a83, 0.9).setInteractive({ useHandCursor: true });
      const accent = this.add.rectangle(x, y, 196, 12, HOME, 1).setOrigin(0, 0).setScrollFactor(0);
      const title = this.add.text(x + 10, y + 16, "", {
        fontFamily: "Georgia",
        fontSize: "20px",
        color: "#f7f3e8",
        fontStyle: "bold",
      }).setScrollFactor(0);
      const meta = this.add.text(x + 10, y + 42, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#96dfe5",
      }).setScrollFactor(0);
      const body = this.add.text(x + 10, y + 60, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#d8e7f3",
        wordWrap: { width: 176 },
      }).setScrollFactor(0);

      bg.on("pointerdown", () => {
        const cardId = this.handButtons[index]?.cardId;
        if (cardId) this.onCardPicked(cardId);
      });

      this.handButtons.push({ bg, accent, title, body, meta, cardId: null, kind: null });
    }
  }

  private createShotOverlay() {
    const bg = this.add.rectangle(VIEW_W / 2, VIEW_H / 2 - 36, 620, 280, 0x07111a, 0.96).setScrollFactor(0).setStrokeStyle(2, 0xf0d488, 0.95);
    this.shotText = this.add.text(VIEW_W / 2, VIEW_H / 2 - 148, "", {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#f8f1dd",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0);
    this.shotGoalFrame = this.add.rectangle(VIEW_W / 2, VIEW_H / 2 - 52, 360, 120, 0x1b2c38, 1).setScrollFactor(0).setStrokeStyle(3, 0xf4f2ec, 1);
    this.shotAimBar = this.add.rectangle(VIEW_W / 2, VIEW_H / 2 + 48, 300, 12, 0x173041, 1).setScrollFactor(0).setStrokeStyle(1, 0x6cb9c2, 0.9);
    this.shotPowerBar = this.add.rectangle(VIEW_W / 2, VIEW_H / 2 + 88, 300, 12, 0x173041, 1).setScrollFactor(0).setStrokeStyle(1, 0xf0d488, 0.9);
    this.shotAimMarker = this.add.rectangle(VIEW_W / 2, VIEW_H / 2 - 52, 12, 92, 0x5bdad4, 0.9).setScrollFactor(0);
    this.shotPowerMarker = this.add.rectangle(VIEW_W / 2 - 150, VIEW_H / 2 + 88, 12, 24, 0xf0d488, 0.95).setScrollFactor(0);
    this.shotOverlay = this.add.container(0, 0, [bg, this.shotText, this.shotGoalFrame, this.shotAimBar, this.shotPowerBar, this.shotAimMarker, this.shotPowerMarker]).setDepth(40).setVisible(false);
  }

  private createHalftimePanel() {
    this.halftimePanel = this.add.container(0, 0).setDepth(50).setVisible(false);
  }

  private createFulltimePanel() {
    this.fulltimePanel = this.add.container(0, 0).setDepth(60).setVisible(false);
  }

  private createTokens() {
    const state = this.engine.getState();
    for (const player of state.pitchPlayers) {
      const body = this.add.circle(0, 0, 17, player.teamId === "HOME" ? HOME : AWAY, 1).setStrokeStyle(3, 0x09141d, 0.95).setInteractive({ useHandCursor: true });
      const ring = this.add.circle(0, 0, 23, GOLD, 0.08).setStrokeStyle(2, GOLD, 0.84).setVisible(false);
      const label = this.add.text(0, 0, player.slotId, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#08262d",
      }).setOrigin(0.5);
      const chance = this.add.text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ffe7a0",
        backgroundColor: "#0f1b26cc",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      }).setOrigin(0.5).setVisible(false);

      body.on("pointerover", () => this.showTooltip(player.playerId));
      body.on("pointerout", () => this.hideTooltip());
      body.on("pointerdown", () => this.onTokenPicked(player.playerId));

      this.tokenViews.set(player.playerId, { body, ring, label, chance, playerId: player.playerId, teamId: player.teamId });
    }
  }

  private bindInput() {
    this.input.keyboard?.on("keydown-ESC", () => this.cancelSelection());
    this.input.keyboard?.on("keydown-SPACE", () => this.onSpacePressed());
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (this.selectionMode === "SHOT") return;
      const nextZoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.00045, 0.62, 1.02);
      this.cameras.main.setZoom(nextZoom);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.selectionMode !== "SHOT") {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
      this.updateDribblePreview(pointer);
    });
    this.pitchHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPitchPicked(pointer));
  }

  private refreshUi(instant: boolean) {
    const state = this.engine.getState();
    this.scoreText.setText(`Blackflag City ${state.score.HOME} - ${state.score.AWAY} CPU Athletic`);
    this.stateText.setText(
      state.phase === "HALFTIME"
        ? "Halftime"
        : state.phase === "FULLTIME"
          ? "Full Time"
          : state.turnMode === "PLAYER_ATTACK"
            ? "You Attack"
            : "You Defend"
    );
    this.roundText.setText(
      `Half ${state.half} | Rounds ${state.attackRoundsThisHalf.HOME}/${state.attackRoundsThisHalf.AWAY} of 5 | Camera: drag RMB, zoom wheel`
    );
    this.promptText.setText(this.buildPrompt(state));
    this.cpuText.setText(state.turnMode === "PLAYER_DEFENSE" && state.cpuPreviewCard ? `CPU played: ${state.cpuPreviewCard.name}\nYou know the action, not the target.` : "");
    this.fillHand(state.currentHand, state.turnMode);
    this.updateTokens(state.pitchPlayers, instant);
    this.updateBall(state.ball, instant);
    this.renderSelectionHints();
    this.renderCommentary(state.commentaryFeed);
    this.renderHalftime(state);
    this.renderFulltime(state);
  }

  private fillHand(cards: MatchCardView[], turnMode: MatchStateView["turnMode"]) {
    this.handButtons.forEach((button, index) => {
      const card = cards[index];
      button.cardId = card?.id ?? null;
      button.kind = card?.kind ?? null;
      button.bg.setVisible(Boolean(card));
      button.accent.setVisible(Boolean(card));
      button.title.setVisible(Boolean(card));
      button.meta.setVisible(Boolean(card));
      button.body.setVisible(Boolean(card));
      if (!card) return;
      const isAttack = turnMode === "PLAYER_ATTACK";
      const selected = this.selectedCardId === card.id;
      button.accent.setFillStyle(isAttack ? HOME : AWAY, 1);
      button.bg.setFillStyle(isAttack ? 0x153144 : 0x412821, 1);
      button.bg.setStrokeStyle(2, selected ? GOLD : 0x406a83, 0.95);
      button.title.setText(card.name);
      button.meta.setText(`${card.kind}${card.requiredStars > 0 ? ` | ${card.requiredStars}★` : ""}${card.radius > 0 ? ` | ${card.radius.toFixed(0)}m` : ""}`);
      button.body.setText(card.description);
    });
  }

  private updateTokens(players: PitchPlayerView[], instant: boolean) {
    for (const player of players) {
      const view = this.tokenViews.get(player.playerId);
      if (!view) continue;
      const x = this.xFor(player.x);
      const y = this.yFor(player.y);
      if (instant) {
        view.body.setPosition(x, y);
        view.ring.setPosition(x, y);
        view.label.setPosition(x, y);
        view.chance.setPosition(x, y - 34);
      } else {
        this.tweens.add({ targets: [view.body, view.ring, view.label, view.chance], x, y, duration: 520, ease: "Sine.easeOut" });
        view.chance.setY(y - 34);
      }
      view.body.setFillStyle(player.teamId === "HOME" ? HOME : AWAY, 1);
      view.ring.setVisible(player.hasBall || this.passTargets.has(player.playerId));
      view.ring.setStrokeStyle(2, this.passTargets.has(player.playerId) ? GOLD : 0xffffff, this.passTargets.has(player.playerId) ? 1 : 0.4);
      view.body.setScale(player.hasBall ? 1.15 : 1);
      view.label.setText(player.slotId);
      const target = this.passTargets.get(player.playerId);
      view.chance.setVisible(Boolean(target));
      view.chance.setText(target ? `${target.chance}%` : "");
      view.chance.setPosition(x, y - 34);
    }
  }

  private updateBall(ball: MatchStateView["ball"], instant: boolean) {
    const x = this.xFor(ball.x);
    const y = this.yFor(ball.y);
    if (instant) {
      this.ballMarker.setPosition(x, y);
      return;
    }
    this.tweens.add({ targets: this.ballMarker, x, y, duration: 500, ease: "Sine.easeOut" });
  }

  private onCardPicked(cardId: string) {
    if (this.animationLocked) return;
    const state = this.engine.getState();
    const card = state.currentHand.find((item) => item.id === cardId);
    if (!card) return;

    this.selectedCardId = cardId;
    if (state.turnMode === "PLAYER_DEFENSE") {
      this.selectionMode = "NONE";
      const result = this.engine.playDefenseCard(cardId);
      this.startResolution(result);
      return;
    }

    if (card.kind === "PASS") {
      this.selectionMode = "PASS";
      this.passTargets = new Map(this.engine.getPassTargets(cardId).map((target) => [target.playerId, target]));
    } else if (card.kind === "DRIBBLE") {
      this.selectionMode = "DRIBBLE";
      this.passTargets.clear();
      this.updateHolderSelectionCircle(card.radius);
    } else {
      this.selectionMode = "SHOT";
      this.passTargets.clear();
      this.openShotMiniGame(cardId);
    }
    this.refreshUi(true);
  }

  private onTokenPicked(playerId: string) {
    if (this.animationLocked || this.selectionMode !== "PASS" || !this.selectedCardId) return;
    if (!this.passTargets.has(playerId)) return;
    const result = this.engine.playAttackCard(this.selectedCardId, { type: "PASS", targetPlayerId: playerId });
    this.startResolution(result);
  }

  private onPitchPicked(pointer: Phaser.Input.Pointer) {
    if (this.animationLocked || this.selectionMode !== "DRIBBLE" || !this.selectedCardId) return;
    const nx = this.normX(pointer.worldX);
    const ny = this.normY(pointer.worldY);
    const result = this.engine.playAttackCard(this.selectedCardId, { type: "DRIBBLE", targetX: nx, targetY: ny });
    this.startResolution(result);
  }

  private onSpacePressed() {
    if (this.selectionMode !== "SHOT" || !this.shotCardId) return;
    if (this.shotPhase === "AIM") {
      this.shotAimQuality = 1 - Math.abs(this.shotCursor - 0.5) * 2;
      this.shotPhase = "POWER";
      this.shotCursor = 1;
      this.shotDirection = -1;
      return;
    }
    if (this.shotPhase === "POWER") {
      const input: AttackActionInput = {
        type: "SHOT",
        shot: {
          aimQuality: clamp01(this.shotAimQuality),
          powerQuality: clamp01(this.shotCursor),
        },
      };
      this.closeShotMiniGame();
      const result = this.engine.playAttackCard(this.shotCardId, input);
      this.startResolution(result);
    }
  }

  private openShotMiniGame(cardId: string) {
    this.shotCardId = cardId;
    this.shotSetup = this.engine.getShotSetup(cardId);
    this.shotPhase = "AIM";
    this.shotCursor = 0.2;
    this.shotDirection = 1;
    this.shotOverlay.setVisible(true);
    this.shotText.setText(`${this.shotSetup.shooterName} prepares the shot\n${this.shotSetup.distanceTier} range | SPACE to lock aim, then power`);
    this.shotAimMarker.setY(VIEW_H / 2 - 52);
    this.shotPowerMarker.setY(VIEW_H / 2 + 88);
  }

  private closeShotMiniGame() {
    this.shotOverlay.setVisible(false);
    this.shotPhase = "IDLE";
    this.shotSetup = null;
    this.shotCardId = null;
  }

  private updateShotMiniGame(delta: number) {
    if (!this.shotOverlay.visible || this.shotPhase === "IDLE") return;
    const speed = this.shotPhase === "AIM" ? 0.0025 : 0.0032;
    this.shotCursor += speed * delta * this.shotDirection;
    if (this.shotCursor >= 1) {
      this.shotCursor = 1;
      this.shotDirection = -1;
    } else if (this.shotCursor <= 0) {
      this.shotCursor = 0;
      this.shotDirection = 1;
    }
    this.shotAimMarker.setX(VIEW_W / 2 - 150 + this.shotCursor * 300);
    this.shotPowerMarker.setX(VIEW_W / 2 - 150 + this.shotCursor * 300);
    this.shotAimMarker.setVisible(this.shotPhase === "AIM");
    this.shotPowerMarker.setVisible(this.shotPhase === "POWER");
  }

  private startResolution(result: ActionResolutionView) {
    this.animationLocked = true;
    this.cancelSelection();
    this.refreshUi(false);
    this.time.delayedCall(760, () => {
      this.animationLocked = false;
      this.refreshUi(true);
    });
    this.renderCommentary(result.commentary);
  }

  private renderSelectionHints() {
    this.tokenViews.forEach((view) => {
      const target = this.passTargets.get(view.playerId);
      view.chance.setVisible(Boolean(target));
      view.chance.setText(target ? `${target.chance}%` : "");
    });
    if (this.selectionMode !== "DRIBBLE") {
      this.selectionCircle.setVisible(false);
      this.dribblePreviewText.setVisible(false);
    }
  }

  private updateHolderSelectionCircle(radius: number) {
    const holder = this.engine.getState().pitchPlayers.find((player) => player.hasBall);
    if (!holder) return;
    this.selectionCircle.setVisible(true);
    this.selectionCircle.setRadius(radius * (PITCH_W / 100));
    this.selectionCircle.setPosition(this.xFor(holder.x), this.yFor(holder.y));
  }

  private updateDribblePreview(pointer: Phaser.Input.Pointer) {
    if (this.selectionMode !== "DRIBBLE" || !this.selectedCardId) return;
    const nx = this.normX(pointer.worldX);
    const ny = this.normY(pointer.worldY);
    const preview = this.engine.previewDribble(this.selectedCardId, nx, ny);
    this.dribblePreviewText.setVisible(true);
    this.dribblePreviewText.setText(`${preview.chance}%`);
    this.dribblePreviewText.setPosition(pointer.x + 16, pointer.y + 16).setScrollFactor(0);
  }

  private renderCommentary(lines: string[]) {
    this.commentaryEvent?.remove(false);
    const fullText = lines.join("\n");
    if (!fullText) {
      this.commentaryText.setText("");
      return;
    }
    this.commentaryText.setText("");
    let index = 0;
    this.commentaryEvent = this.time.addEvent({
      delay: 14,
      repeat: Math.max(0, fullText.length - 1),
      callback: () => {
        index += 1;
        this.commentaryText.setText(fullText.slice(0, index));
      },
    });
  }

  private showTooltip(playerId: string) {
    const player = this.engine.getState().pitchPlayers.find((entry) => entry.playerId === playerId);
    if (!player) return;
    this.tooltipBg.setVisible(true).setPosition(18, 62);
    this.tooltipText
      .setVisible(true)
      .setPosition(26, 70)
      .setText(
        `${player.name} [${player.slotId}] ${player.hasBall ? "Ball" : ""}\nPAC ${player.stats.pac} SHO ${player.stats.sho} PAS ${player.stats.pas}\nDRI ${player.stats.dri} DEF ${player.stats.def} PHY ${player.stats.phy}\nAgility ${player.stats.agility} | Block ${player.stats.blocking} | Skill ${player.stats.skillStars}★`
      );
  }

  private hideTooltip() {
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
  }

  private renderHalftime(state: MatchStateView) {
    this.halftimePanel.removeAll(true);
    this.halftimePanel.setVisible(state.phase === "HALFTIME");
    if (state.phase !== "HALFTIME" || !state.halftime) return;

    const bg = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 1040, 610, 0x08131d, 0.96).setScrollFactor(0).setStrokeStyle(2, 0xf0d488, 0.95);
    const title = this.add.text(VIEW_W / 2, 74, "Halftime", {
      fontFamily: "Georgia",
      fontSize: "30px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);
    const info = this.add.text(120, 112, `Pick a tactic and make up to ${state.halftime.substitutionsRemaining} more substitutions.`, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d4e4ef",
    }).setScrollFactor(0);

    this.halftimePanel.add([bg, title, info]);

    state.halftime.tactics.forEach((tactic, index) => {
      const x = 120 + index * 230;
      const y = 152;
      const selected = state.teams[0].tactic === tactic;
      const button = this.add.rectangle(x, y, 206, 44, selected ? 0x274239 : 0x193245, 1).setOrigin(0, 0).setScrollFactor(0).setStrokeStyle(2, selected ? GOLD : 0x5182a2, 0.9).setInteractive({ useHandCursor: true });
      const text = this.add.text(x + 12, y + 13, formatTactic(tactic), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#edf5f8",
      }).setScrollFactor(0);
      button.on("pointerdown", () => {
        this.engine.setHomeTactic(tactic as MatchTacticId);
        this.refreshUi(true);
      });
      this.halftimePanel.add([button, text]);
    });

    this.addLineupColumn(state, 120, 236, "Lineup", "lineup");
    this.addLineupColumn(state, 656, 236, "Bench", "bench");

    const next = this.add.rectangle(VIEW_W / 2, VIEW_H - 84, 240, 46, 0x284f39, 1).setScrollFactor(0).setStrokeStyle(2, 0xb8f1d4, 0.9).setInteractive({ useHandCursor: true });
    const nextText = this.add.text(VIEW_W / 2, VIEW_H - 84, "Start Second Half", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#effaf2",
    }).setOrigin(0.5).setScrollFactor(0);
    next.on("pointerdown", () => {
      this.selectedSubSlot = null;
      this.engine.beginSecondHalf();
      this.refreshUi(true);
    });
    this.halftimePanel.add([next, nextText]);
  }

  private addLineupColumn(state: MatchStateView, x: number, y: number, title: string, key: "lineup" | "bench") {
    const header = this.add.text(x, y - 30, title, {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setScrollFactor(0);
    this.halftimePanel.add(header);
    state.teams[0][key].forEach((player, index) => {
      const box = this.add.rectangle(x, y + index * 34, 450, 28, key === "lineup" && this.selectedSubSlot === player.slotId ? 0x3b4e28 : 0x112130, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setStrokeStyle(1, 0x5f8aa6, 0.86)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x + 10, y + 6 + index * 34, `${key === "lineup" ? player.slotId : "BEN"} | ${player.name} (${player.role}) OVR ${player.overall}`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#edf5f8",
      }).setScrollFactor(0);
      box.on("pointerdown", () => {
        if (key === "lineup") {
          this.selectedSubSlot = player.slotId;
          this.refreshUi(true);
          return;
        }
        if (!this.selectedSubSlot) return;
        this.engine.makeHomeSubstitution(this.selectedSubSlot, player.playerId);
        this.selectedSubSlot = null;
        this.refreshUi(true);
      });
      this.halftimePanel.add([box, label]);
    });
  }

  private renderFulltime(state: MatchStateView) {
    this.fulltimePanel.removeAll(true);
    this.fulltimePanel.setVisible(state.phase === "FULLTIME");
    if (state.phase !== "FULLTIME") return;
    const bg = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 540, 390, 0x07111a, 0.96).setScrollFactor(0).setStrokeStyle(2, 0xf0d488, 0.95);
    const title = this.add.text(VIEW_W / 2, 164, "Full Time", {
      fontFamily: "Georgia",
      fontSize: "30px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);
    const score = this.add.text(VIEW_W / 2, 216, `${state.score.HOME} - ${state.score.AWAY}`, {
      fontFamily: "Georgia",
      fontSize: "42px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);
    const stats = state.stats.HOME;
    const body = this.add.text(VIEW_W / 2, 292, `Passes ${stats.successfulPasses}/${stats.successfulPasses + stats.failedPasses}\nDribbles ${stats.successfulDribbles}/${stats.successfulDribbles + stats.failedDribbles}\nShots ${stats.shots} | On target ${stats.shotsOnTarget}\nGoals ${stats.goals}`, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#d6e6ef",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0);
    const replay = this.add.rectangle(VIEW_W / 2, 430, 230, 42, 0x284f39, 1).setScrollFactor(0).setStrokeStyle(2, 0xb8f1d4, 0.9).setInteractive({ useHandCursor: true });
    const replayText = this.add.text(VIEW_W / 2, 430, "Play Again", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#effaf2",
    }).setOrigin(0.5).setScrollFactor(0);
    replay.on("pointerdown", () => this.scene.restart());
    this.fulltimePanel.add([bg, title, score, body, replay, replayText]);
  }

  private buildPrompt(state: MatchStateView) {
    if (state.phase === "HALFTIME") {
      return "Select a lineup slot, then a bench player to swap. Pick your tactic before the second half.";
    }
    if (state.phase === "FULLTIME") {
      return "Review the match stats or start a new game.";
    }
    if (state.turnMode === "PLAYER_DEFENSE") {
      return "CPU action revealed. Pick one defensive card to answer this turn.";
    }
    if (this.selectionMode === "PASS") {
      return "Click a teammate on the pitch. The percentage beside each player is the estimated pass chance.";
    }
    if (this.selectionMode === "DRIBBLE") {
      return "Click anywhere inside the highlighted circle to choose the dribble destination.";
    }
    if (this.selectionMode === "SHOT") {
      return "Shot minigame active. SPACE locks aim first, then power.";
    }
    return "Pick one attacking card. Every turn discards the full three-card hand and draws three new cards.";
  }

  private cancelSelection() {
    this.selectedCardId = null;
    this.selectionMode = "NONE";
    this.passTargets.clear();
    this.selectionCircle.setVisible(false);
    this.dribblePreviewText.setVisible(false);
    this.closeShotMiniGame();
  }

  private redrawPitch() {
    const g = this.fieldGfx;
    g.clear();
    g.fillStyle(0x07111a, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    g.fillStyle(0x0e1821, 1);
    g.fillRoundedRect(PITCH_X - 28, PITCH_Y - 28, PITCH_W + 56, PITCH_H + 56, 18);
    const stripeWidth = PITCH_W / 8;
    for (let index = 0; index < 8; index += 1) {
      g.fillStyle(index % 2 === 0 ? GRASS_LIGHT : GRASS_DARK, 1);
      g.fillRect(PITCH_X + index * stripeWidth, PITCH_Y, stripeWidth, PITCH_H);
    }
    g.lineStyle(3, LINE, 0.98);
    g.strokeRect(PITCH_X, PITCH_Y, PITCH_W, PITCH_H);
    g.beginPath();
    g.moveTo(PITCH_X + PITCH_W / 2, PITCH_Y);
    g.lineTo(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H);
    g.strokePath();
    g.strokeCircle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 94);
    g.strokeRect(PITCH_X, PITCH_Y + 180, 170, PITCH_H - 360);
    g.strokeRect(PITCH_X + PITCH_W - 170, PITCH_Y + 180, 170, PITCH_H - 360);
    g.strokeRect(PITCH_X, PITCH_Y + 255, 70, PITCH_H - 510);
    g.strokeRect(PITCH_X + PITCH_W - 70, PITCH_Y + 255, 70, PITCH_H - 510);
    g.fillStyle(LINE, 0.9);
    g.fillCircle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 4);
  }

  private xFor(value: number) {
    return PITCH_X + (value / 100) * PITCH_W;
  }

  private yFor(value: number) {
    return PITCH_Y + (value / 64) * PITCH_H;
  }

  private normX(worldX: number) {
    return Phaser.Math.Clamp(((worldX - PITCH_X) / PITCH_W) * 100, 0, 100);
  }

  private normY(worldY: number) {
    return Phaser.Math.Clamp(((worldY - PITCH_Y) / PITCH_H) * 64, 0, 64);
  }
}

function formatTactic(tactic: MatchTacticId) {
  return tactic.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function clamp01(value: number) {
  return Phaser.Math.Clamp(value, 0, 1);
}
