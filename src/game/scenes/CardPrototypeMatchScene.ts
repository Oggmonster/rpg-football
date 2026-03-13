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
  meta: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  cardId: string | null;
};

type TokenView = {
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  sprite: Phaser.GameObjects.Sprite;
  name: Phaser.GameObjects.Text;
  chance: Phaser.GameObjects.Text;
  playerId: string;
  lastX: number;
  lastY: number;
  baseScale: number;
};

type SelectionMode = "NONE" | "PASS" | "DRIBBLE" | "SHOT";
type ShotPhase = "IDLE" | "AIM" | "POWER";

const VIEW_W = 1280;
const VIEW_H = 720;
const TOP_BAR_H = 64;
const BOTTOM_PANEL_H = 174;
const PITCH_X = 38;
const PITCH_Y = 82;
const PITCH_W = 1204;
const PITCH_H = 446;

const BG = 0x081017;
const PANEL = 0x0a1822;
const PANEL_ALT = 0x112535;
const GRASS_A = 0x236447;
const GRASS_B = 0x2b7352;
const HOME = 0x4ed6cf;
const AWAY = 0xff9a63;
const GOLD = 0xf4d06f;
const LINE = 0xf3f4ec;

export class CardPrototypeMatchScene extends Phaser.Scene {
  private engine!: CardFootballEngine;
  private fieldGfx!: Phaser.GameObjects.Graphics;
  private pitchHit!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private restartText!: Phaser.GameObjects.Text;
  private homePressureBar!: Phaser.GameObjects.Rectangle;
  private awayPressureBar!: Phaser.GameObjects.Rectangle;
  private homePressureText!: Phaser.GameObjects.Text;
  private awayPressureText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private cpuText!: Phaser.GameObjects.Text;
  private commentaryText!: Phaser.GameObjects.Text;
  private ballMarker!: Phaser.GameObjects.Sprite;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private ballTrail!: Phaser.GameObjects.Graphics;
  private actionPulse!: Phaser.GameObjects.Arc;
  private shotPreviewGfx!: Phaser.GameObjects.Graphics;
  private selectionCircle!: Phaser.GameObjects.Arc;
  private dribblePreviewText!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private tooltipText!: Phaser.GameObjects.Text;
  private resultBanner!: Phaser.GameObjects.Container;
  private resultBannerBg!: Phaser.GameObjects.Rectangle;
  private resultBannerText!: Phaser.GameObjects.Text;
  private tokenViews = new Map<string, TokenView>();
  private pitchOffsetX = 0;
  private pitchOffsetY = 0;
  private handButtons: CardButton[] = [];
  private passTargets = new Map<string, PassTargetView>();
  private selectionMode: SelectionMode = "NONE";
  private selectedCardId: string | null = null;
  private shotCardId: string | null = null;
  private shotSetup: ShotSetupView | null = null;
  private shotPhase: ShotPhase = "IDLE";
  private shotCursor = 0.5;
  private shotDirection = 1;
  private shotAimQuality = 0.5;
  private shotOverlay!: Phaser.GameObjects.Container;
  private shotText!: Phaser.GameObjects.Text;
  private shotAimArrow!: Phaser.GameObjects.Graphics;
  private shotAimGuide!: Phaser.GameObjects.Graphics;
  private shotPowerBar!: Phaser.GameObjects.Rectangle;
  private shotPowerMarker!: Phaser.GameObjects.Rectangle;
  private halftimePanel!: Phaser.GameObjects.Container;
  private fulltimePanel!: Phaser.GameObjects.Container;
  private animationLocked = false;
  private selectedSubSlot: SlotId | null = null;
  private hoveredPlayerId: string | null = null;
  private spotlightPlayerIds = new Set<string>();
  private pendingTrailStyle: { color: number; width: number; arc: number } | null = null;
  private pendingShotSetup: ShotSetupView | null = null;

  constructor() {
    super("MatchScene");
  }

  create() {
    this.engine = new CardFootballEngine({ rngSeed: 1337 });
    this.cameras.main.setBackgroundColor(BG);
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
    this.fieldGfx.setPosition(this.pitchOffsetX, this.pitchOffsetY);
    this.pitchHit = this.add.rectangle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, PITCH_W, PITCH_H, 0x000000, 0.001).setInteractive();
    this.ballTrail = this.add.graphics().setDepth(12);
    this.actionPulse = this.add.circle(0, 0, 28, 0xffffff, 0.16).setVisible(false).setDepth(13);
    this.shotPreviewGfx = this.add.graphics().setDepth(15);
    this.ballShadow = this.add.ellipse(0, 0, 11, 5, 0x000000, 0.18).setDepth(13);
    this.ballMarker = this.add.sprite(0, 0, "ball_idle").setDepth(14);
    this.ballMarker.setScale(1.08);
    this.selectionCircle = this.add.circle(0, 0, 48, GOLD, 0.08).setStrokeStyle(2, GOLD, 0.95).setVisible(false).setDepth(6);
    this.dribblePreviewText = this.add.text(0, 0, "", {
      fontFamily: "Georgia",
      fontSize: "18px",
      color: "#f8f1dd",
      backgroundColor: "#0f1d29ee",
      padding: { left: 8, right: 8, top: 6, bottom: 6 },
    }).setVisible(false).setDepth(18);
  }

  private createHud() {
    this.add.rectangle(VIEW_W / 2, TOP_BAR_H / 2, VIEW_W - 24, TOP_BAR_H - 18, PANEL, 0.98).setStrokeStyle(1, 0x31556d, 0.85);
    this.add.rectangle(VIEW_W / 2, VIEW_H - BOTTOM_PANEL_H / 2, VIEW_W - 24, BOTTOM_PANEL_H - 10, PANEL, 0.98).setStrokeStyle(1, 0x31556d, 0.85);
    this.add.rectangle(174, VIEW_H - BOTTOM_PANEL_H / 2, 264, BOTTOM_PANEL_H - 38, PANEL_ALT, 0.98).setStrokeStyle(1, 0x406986, 0.75);
    this.add.rectangle(VIEW_W - 174, VIEW_H - BOTTOM_PANEL_H / 2, 268, BOTTOM_PANEL_H - 38, PANEL_ALT, 0.98).setStrokeStyle(1, 0x406986, 0.75);

    this.scoreText = this.add.text(32, 14, "", {
      fontFamily: "Georgia",
      fontSize: "30px",
      color: "#f7f3e8",
      fontStyle: "bold",
    });
    this.phaseText = this.add.text(560, 14, "", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: "#f7f3e8",
      fontStyle: "italic",
    });
    this.roundText = this.add.text(936, 18, "", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#d0e7ef",
    });
    this.restartText = this.add.text(560, 42, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#f0d488",
    });

    this.add.text(866, 14, "Pressure", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#c9dbe2",
    });
    this.add.rectangle(860, 34, 110, 10, 0x173041, 1).setOrigin(0, 0).setStrokeStyle(1, 0x31556d, 0.9);
    this.homePressureBar = this.add.rectangle(860, 34, 1, 10, HOME, 1).setOrigin(0, 0);
    this.homePressureText = this.add.text(974, 29, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9debea",
    });
    this.add.rectangle(860, 48, 110, 10, 0x173041, 1).setOrigin(0, 0).setStrokeStyle(1, 0x31556d, 0.9);
    this.awayPressureBar = this.add.rectangle(860, 48, 1, 10, AWAY, 1).setOrigin(0, 0);
    this.awayPressureText = this.add.text(974, 43, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffc3a0",
    });

    this.promptText = this.add.text(52, VIEW_H - 156, "", {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: "#f8e5a3",
      wordWrap: { width: 220 },
    });
    this.cpuText = this.add.text(52, VIEW_H - 82, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffd3b3",
      wordWrap: { width: 220 },
    });
    this.add.text(VIEW_W - 296, VIEW_H - 162, "Commentary", {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#f7f3e8",
      fontStyle: "bold",
    });
    this.commentaryText = this.add.text(VIEW_W - 296, VIEW_H - 126, "", {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: "#eff5f8",
      wordWrap: { width: 232 },
      lineSpacing: 7,
    });

    this.resultBannerBg = this.add.rectangle(VIEW_W / 2, PITCH_Y + 42, 250, 38, 0x07111a, 0.9).setStrokeStyle(2, GOLD, 0.96);
    this.resultBannerText = this.add.text(VIEW_W / 2, PITCH_Y + 42, "", {
      fontFamily: "Georgia",
      fontSize: "18px",
      color: "#f8f1dd",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.resultBanner = this.add.container(0, 0, [this.resultBannerBg, this.resultBannerText]).setDepth(28).setVisible(false).setAlpha(0);

    this.tooltipBg = this.add.rectangle(44, TOP_BAR_H + 10, 280, 108, 0x07131d, 0.97).setOrigin(0, 0).setVisible(false).setStrokeStyle(1, 0x6fd7d6, 0.85).setDepth(20);
    this.tooltipText = this.add.text(56, TOP_BAR_H + 22, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#f1f9fb",
      wordWrap: { width: 248 },
    }).setVisible(false).setDepth(21);
  }

  private createHand() {
    for (let index = 0; index < 3; index += 1) {
      const x = 318 + index * 222;
      const y = VIEW_H - 154;
      const bg = this.add.rectangle(x, y, 196, 124, 0x183246, 1).setOrigin(0, 0).setStrokeStyle(2, 0x4d7890, 0.9).setInteractive({ useHandCursor: true });
      const accent = this.add.rectangle(x, y, 196, 12, HOME, 1).setOrigin(0, 0);
      const title = this.add.text(x + 12, y + 18, "", {
        fontFamily: "Georgia",
        fontSize: "23px",
        color: "#f7f3e8",
        fontStyle: "bold",
      });
      const meta = this.add.text(x + 12, y + 48, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#a5e3e4",
      });
      const body = this.add.text(x + 12, y + 70, "", {
        fontFamily: "Georgia",
        fontSize: "16px",
        color: "#e2edf3",
        wordWrap: { width: 172 },
      });
      bg.on("pointerdown", () => {
        const cardId = this.handButtons[index]?.cardId;
        if (cardId) this.onCardPicked(cardId);
      });
      this.handButtons.push({ bg, accent, title, meta, body, cardId: null });
    }
  }

  private createShotOverlay() {
    this.shotAimGuide = this.add.graphics().setDepth(31);
    this.shotAimArrow = this.add.graphics().setDepth(32);
    this.shotPowerBar = this.add.rectangle(VIEW_W / 2, VIEW_H - 204, 320, 14, 0x173041, 1).setStrokeStyle(1, 0xf0d488, 0.9);
    this.shotText = this.add.text(VIEW_W / 2, PITCH_Y + PITCH_H - 18, "", {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#f8f1dd",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.shotPowerMarker = this.add.rectangle(VIEW_W / 2 - 160, VIEW_H - 204, 12, 24, 0xf0d488, 0.95);
    this.shotOverlay = this.add.container(0, 0, [this.shotAimGuide, this.shotAimArrow, this.shotPowerBar, this.shotText, this.shotPowerMarker]).setDepth(30).setVisible(false);
  }

  private createHalftimePanel() {
    this.halftimePanel = this.add.container(0, 0).setDepth(40).setVisible(false);
  }

  private createFulltimePanel() {
    this.fulltimePanel = this.add.container(0, 0).setDepth(50).setVisible(false);
  }

  private createTokens() {
    const state = this.engine.getState();
    for (const player of state.pitchPlayers) {
      const shadow = this.add.ellipse(0, 0, 24, 8, 0x000000, 0.25).setDepth(7);
      const ring = this.add.ellipse(0, 0, 30, 16, GOLD, 0.06).setStrokeStyle(2, GOLD, 0.94).setVisible(false).setDepth(8);
      const sprite = this.add.sprite(0, 0, this.textureKeyForPlayer(player, "idle")).setDepth(10).setInteractive({ useHandCursor: true });
      const baseScale = this.getSpriteBaseScale(sprite, player.role === "GK" ? 32 : 30);
      sprite.setScale(baseScale);
      const name = this.add.text(0, 0, player.name, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f7f3e8",
        backgroundColor: "#0a1822dd",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      }).setOrigin(0.5).setDepth(11);
      const chance = this.add.text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe7a0",
        backgroundColor: "#0f1b26dd",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      }).setOrigin(0.5).setVisible(false).setDepth(12);

      sprite.on("pointerover", () => this.showTooltip(player.playerId));
      sprite.on("pointerout", () => this.hideTooltip());
      sprite.on("pointerdown", () => this.onTokenPicked(player.playerId));

      this.tokenViews.set(player.playerId, { shadow, ring, sprite, name, chance, playerId: player.playerId, lastX: player.x, lastY: player.y, baseScale });
    }
  }

  private bindInput() {
    this.input.keyboard?.on("keydown-ESC", () => this.cancelSelection());
    this.input.keyboard?.on("keydown-SPACE", () => this.onSpacePressed());
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateDribblePreview(pointer));
    this.pitchHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPitchPicked(pointer));
  }

  private refreshUi(instant: boolean) {
    const state = this.engine.getState();
    this.scoreText.setText(`Blackflag City ${state.score.HOME} - ${state.score.AWAY} CPU Athletic`);
    this.phaseText.setText(
      state.phase === "HALFTIME" ? "Halftime" : state.phase === "FULLTIME" ? "Full Time" : state.turnMode === "PLAYER_ATTACK" ? "You Attack" : "You Defend"
    );
    this.roundText.setText(`Half ${state.half} | Attack rounds ${state.attackRoundsThisHalf.HOME}-${state.attackRoundsThisHalf.AWAY} of 10`);
    this.restartText.setText(
      state.restart ? `${state.restart.label} | ${state.teams.find((team) => team.id === "HOME")?.playstyle ?? "CONTROL"} vs ${state.teams.find((team) => team.id === "AWAY")?.playstyle ?? "WIDE"}` : `${state.teams.find((team) => team.id === "HOME")?.playstyle ?? "CONTROL"} vs ${state.teams.find((team) => team.id === "AWAY")?.playstyle ?? "WIDE"}`
    );
    this.homePressureBar.displayWidth = Math.max(2, state.pressure.HOME * 1.1);
    this.awayPressureBar.displayWidth = Math.max(2, state.pressure.AWAY * 1.1);
    this.homePressureText.setText(`HOME ${state.pressure.HOME}`);
    this.awayPressureText.setText(`CPU ${state.pressure.AWAY}`);
    this.promptText.setText(this.buildPrompt(state));
    this.cpuText.setText(state.turnMode === "PLAYER_DEFENSE" && state.cpuPreviewCard ? `CPU card: ${state.cpuPreviewCard.name}\nYou know the move, not the destination.` : "");
    this.fillHand(state.currentHand, state.turnMode);
    this.updatePitchFocus(state.ball, instant);
    this.updateTokens(state.pitchPlayers, instant);
    this.updateBall(state.ball, instant);
    this.commentaryText.setText(this.formatCommentary(state.commentaryFeed));
    this.renderSelectionHints();
    this.renderHalftime(state);
    this.renderFulltime(state);
  }

  private fillHand(cards: MatchCardView[], turnMode: MatchStateView["turnMode"]) {
    this.handButtons.forEach((button, index) => {
      const card = cards[index];
      button.cardId = card?.id ?? null;
      button.bg.setVisible(Boolean(card));
      button.accent.setVisible(Boolean(card));
      button.title.setVisible(Boolean(card));
      button.meta.setVisible(Boolean(card));
      button.body.setVisible(Boolean(card));
      if (!card) return;
      const attackTurn = turnMode === "PLAYER_ATTACK";
      button.accent.setFillStyle(attackTurn ? HOME : AWAY, 1);
      button.bg.setFillStyle(attackTurn ? 0x173246 : 0x482b22, 1);
      button.bg.setStrokeStyle(2, this.selectedCardId === card.id ? GOLD : 0x4d7890, 0.95);
      button.title.setText(card.name);
      button.meta.setText(`${card.kind}${card.requiredStars > 0 ? ` | ${card.requiredStars}* skill` : ""}${card.radius > 0 ? ` | ${card.radius.toFixed(0)}m` : ""}`);
      button.body.setText(card.description);
    });
  }

  private updateTokens(players: PitchPlayerView[], instant: boolean) {
    const activeLabels = this.getActiveLabelPlayerIds(players);
    for (const player of players) {
      const view = this.tokenViews.get(player.playerId);
      if (!view) continue;
      const x = this.xFor(player.x);
      const y = this.yFor(player.y);
      const motion = Math.hypot(player.x - view.lastX, player.y - view.lastY);
      const animState = this.resolveAnimState(player, motion);
      const textureKey = this.textureKeyForPlayer(player, animState);
      if (view.sprite.texture.key !== textureKey) {
        view.sprite.setTexture(textureKey);
        view.baseScale = this.getSpriteBaseScale(view.sprite, player.role === "GK" ? 32 : 30);
      }
      const facingRight = player.x >= view.lastX ? 1 : -1;

      if (instant) {
        view.shadow.setPosition(x, y + 11);
        view.ring.setPosition(x, y + 12);
        view.sprite.setPosition(x, y + 2);
        view.name.setPosition(x, y + 31);
        view.chance.setPosition(x, y - 30);
      } else {
        this.tweens.add({ targets: view.shadow, x, y: y + 11, duration: 620, ease: "Sine.easeOut" });
        this.tweens.add({ targets: view.ring, x, y: y + 12, duration: 620, ease: "Sine.easeOut" });
        this.tweens.add({ targets: view.sprite, x, y: y + 2, duration: 620, ease: "Sine.easeOut" });
        this.tweens.add({ targets: view.name, x, y: y + 31, duration: 620, ease: "Sine.easeOut" });
        this.tweens.add({ targets: view.chance, x, y: y - 30, duration: 620, ease: "Sine.easeOut" });
      }

      const isTarget = this.passTargets.has(player.playerId);
      view.ring.setVisible(player.hasBall || isTarget || this.spotlightPlayerIds.has(player.playerId));
      view.ring.setFillStyle(player.hasBall ? 0x6de7ff : isTarget ? GOLD : 0xffffff, player.hasBall ? 0.18 : isTarget ? 0.12 : 0.04);
      view.ring.setStrokeStyle(2, player.hasBall ? 0x9ff4ff : isTarget ? GOLD : 0xffffff, player.hasBall || isTarget ? 0.95 : 0.25);
      this.applySpriteBodyMotion(view, motion, player.hasBall, facingRight, animState);
      view.name.setText(player.name);
      view.name.setVisible(activeLabels.has(player.playerId));
      view.name.setAlpha(activeLabels.has(player.playerId) ? 1 : 0);
      const target = this.passTargets.get(player.playerId);
      view.chance.setVisible(Boolean(target));
      view.chance.setText(target ? `${target.chance}%` : "");
      view.lastX = player.x;
      view.lastY = player.y;
    }
  }

  private updateBall(ball: MatchStateView["ball"], instant: boolean) {
    const previousX = this.ballMarker.x;
    const previousY = this.ballMarker.y;
    const { x, y } = this.getBallRenderPoint(ball);
    const textureKey = this.pendingTrailStyle?.arc && this.pendingTrailStyle.arc > 24 ? "ball_shot" : this.pendingTrailStyle ? "ball_flight" : "ball_idle";
    if (this.ballMarker.texture.key !== textureKey) {
      this.ballMarker.setTexture(textureKey);
      this.ballMarker.setScale(textureKey === "ball_shot" ? 1.16 : textureKey === "ball_flight" ? 1.1 : 1.03);
    }
    const spin = Math.hypot(x - previousX, y - previousY) * 1.6;
    this.ballMarker.angle = (this.ballMarker.angle + spin) % 360;
    if (instant) {
      this.ballMarker.setPosition(x, y);
      this.ballShadow.setPosition(x, y + 5);
      return;
    }
    this.drawBallTrail(previousX, previousY, x, y, this.pendingTrailStyle);
    this.tweens.add({ targets: this.ballMarker, x, y, duration: 620, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.ballShadow, x, y: y + 5, duration: 620, ease: "Sine.easeOut" });
  }

  private onCardPicked(cardId: string) {
    if (this.animationLocked) return;
    const state = this.engine.getState();
    const card = state.currentHand.find((entry) => entry.id === cardId);
    if (!card) return;

    this.selectedCardId = cardId;
    if (state.turnMode === "PLAYER_DEFENSE") {
      this.selectionMode = "NONE";
      this.startResolution(this.engine.playDefenseCard(cardId));
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
    this.startResolution(this.engine.playAttackCard(this.selectedCardId, { type: "PASS", targetPlayerId: playerId }));
  }

  private onPitchPicked(pointer: Phaser.Input.Pointer) {
    if (this.animationLocked || this.selectionMode !== "DRIBBLE" || !this.selectedCardId) return;
    this.startResolution(
      this.engine.playAttackCard(this.selectedCardId, {
        type: "DRIBBLE",
        targetX: this.normX(pointer.x),
        targetY: this.normY(pointer.y),
      })
    );
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
      const cardId = this.shotCardId;
      this.pendingShotSetup = this.shotSetup;
      this.closeShotMiniGame();
      if (cardId) {
        this.startResolution(this.engine.playAttackCard(cardId, input));
      }
    }
  }

  private openShotMiniGame(cardId: string) {
    this.shotCardId = cardId;
    this.shotSetup = this.engine.getShotSetup(cardId);
    this.shotPhase = "AIM";
    this.shotCursor = 0.22;
    this.shotDirection = 1;
    this.shotText.setText(`${this.shotSetup.shooterName} sets up the shot\n${this.shotSetup.distanceTier} range. SPACE locks aim, then power.`);
    this.renderShotPreview(this.shotSetup);
    this.shotOverlay.setVisible(true);
  }

  private closeShotMiniGame() {
    this.shotOverlay.setVisible(false);
    this.shotPhase = "IDLE";
    this.shotPreviewGfx.clear();
    this.shotAimGuide.clear();
    this.shotAimArrow.clear();
    this.shotSetup = null;
    this.shotCardId = null;
  }

  private updateShotMiniGame(delta: number) {
    if (!this.shotOverlay.visible || this.shotPhase === "IDLE") return;
    const speed = this.shotPhase === "AIM" ? 0.0027 : 0.0033;
    this.shotCursor += speed * delta * this.shotDirection;
    if (this.shotCursor >= 1) {
      this.shotCursor = 1;
      this.shotDirection = -1;
    } else if (this.shotCursor <= 0) {
      this.shotCursor = 0;
      this.shotDirection = 1;
    }
    const powerX = VIEW_W / 2 - 160 + this.shotCursor * 320;
    this.shotPowerMarker.setX(powerX);
    this.shotPowerMarker.setVisible(this.shotPhase === "POWER");
    if (this.shotPhase === "AIM") {
      this.renderShotAimArrow(this.shotCursor);
    } else {
      this.shotAimGuide.clear();
      this.shotAimArrow.clear();
    }
  }

  private startResolution(result: ActionResolutionView) {
    this.animationLocked = true;
    this.spotlightPlayerIds = new Set(
      result.animations
        .filter((animation) => Math.hypot(animation.toX - animation.fromX, animation.toY - animation.fromY) > 2.5)
        .sort(
          (a, b) =>
            Math.hypot(b.toX - b.fromX, b.toY - b.fromY) - Math.hypot(a.toX - a.fromX, a.toY - a.fromY)
        )
        .slice(0, 3)
        .map((animation) => animation.playerId)
    );
    this.spotlightPlayerIds.add(result.ball.holderId);
    this.pendingTrailStyle = this.getTrailStyle(result);
    this.cancelSelection();
    this.commentaryText.setText(this.formatCommentary(result.commentary));
    this.playAnticipation(result);
    this.time.delayedCall(120, () => {
      this.showResultBanner(result);
      this.pulseActionAtBall(result.ball);
      this.punchCamera(result);
      this.refreshUi(false);
    });
    this.time.delayedCall(210, () => {
      this.animateImpactPlayers(result);
      this.animateShotContext(result);
    });
    this.time.delayedCall(900, () => {
      this.animationLocked = false;
      this.spotlightPlayerIds.clear();
      this.pendingTrailStyle = null;
      this.pendingShotSetup = null;
      this.refreshUi(true);
    });
  }

  private renderSelectionHints() {
    this.tokenViews.forEach((view) => {
      const target = this.passTargets.get(view.playerId);
      view.chance.setVisible(Boolean(target));
      view.chance.setText(target ? `${target.chance}%` : "");
    });
    if (this.selectionMode === "DRIBBLE" && this.selectedCardId) {
      const card = this.engine.getState().currentHand.find((entry) => entry.id === this.selectedCardId);
      if (card) {
        this.updateHolderSelectionCircle(card.radius);
      }
      return;
    }
    if (this.selectionMode !== "DRIBBLE") {
      this.selectionCircle.setVisible(false);
      this.dribblePreviewText.setVisible(false);
    }
  }

  private updateHolderSelectionCircle(radius: number) {
    const { ball } = this.engine.getState();
    this.selectionCircle.setVisible(true);
    this.selectionCircle.setRadius(radius * (PITCH_W / 100));
    this.selectionCircle.setPosition(this.xFor(ball.x), this.yFor(ball.y));
  }

  private updateDribblePreview(pointer: Phaser.Input.Pointer) {
    if (this.selectionMode !== "DRIBBLE" || !this.selectedCardId) return;
    const preview = this.engine.previewDribble(this.selectedCardId, this.normX(pointer.x), this.normY(pointer.y));
    this.dribblePreviewText.setVisible(true);
    this.dribblePreviewText.setText(`${preview.chance}%`);
    this.dribblePreviewText.setPosition(pointer.x + 18, pointer.y + 18);
  }

  private showTooltip(playerId: string) {
    this.hoveredPlayerId = playerId;
    const player = this.engine.getState().pitchPlayers.find((entry) => entry.playerId === playerId);
    if (!player) return;
    this.tooltipBg.setVisible(true);
    this.tooltipText.setVisible(true).setText(
      `${player.name} [${player.slotId}] ${player.hasBall ? "Ball carrier" : ""}\nPAC ${player.stats.pac} SHO ${player.stats.sho} PAS ${player.stats.pas}\nDRI ${player.stats.dri} DEF ${player.stats.def} PHY ${player.stats.phy}\nAgility ${player.stats.agility} | Block ${player.stats.blocking} | Skill ${player.stats.skillStars}*`
    );
    this.updateTokens(this.engine.getState().pitchPlayers, true);
  }

  private hideTooltip() {
    this.hoveredPlayerId = null;
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
    this.updateTokens(this.engine.getState().pitchPlayers, true);
  }

  private renderHalftime(state: MatchStateView) {
    this.halftimePanel.removeAll(true);
    this.halftimePanel.setVisible(state.phase === "HALFTIME");
    if (state.phase !== "HALFTIME" || !state.halftime) return;

    const bg = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 1080, 620, 0x07111a, 0.97).setStrokeStyle(2, 0xf0d488, 0.95);
    const title = this.add.text(VIEW_W / 2, 72, "Halftime", {
      fontFamily: "Georgia",
      fontSize: "34px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const info = this.add.text(100, 112, `Choose a tactic and make up to ${state.halftime.substitutionsRemaining} more substitutions.`, {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: "#e0edf2",
    });
    this.halftimePanel.add([bg, title, info]);

    state.halftime.tactics.forEach((tactic, index) => {
      const x = 100 + index * 248;
      const y = 158;
      const selected = state.teams[0].tactic === tactic;
      const button = this.add.rectangle(x, y, 224, 50, selected ? 0x295041 : 0x183246, 1).setOrigin(0, 0).setStrokeStyle(2, selected ? GOLD : 0x4d7890, 0.92).setInteractive({ useHandCursor: true });
      const text = this.add.text(x + 14, y + 14, formatTactic(tactic), {
        fontFamily: "Georgia",
        fontSize: "20px",
        color: "#f7f3e8",
        fontStyle: "bold",
      });
      button.on("pointerdown", () => {
        this.engine.setHomeTactic(tactic as MatchTacticId);
        this.refreshUi(true);
      });
      this.halftimePanel.add([button, text]);
    });

    this.addLineupColumn(state, 100, 250, "Lineup", "lineup");
    this.addLineupColumn(state, 660, 250, "Bench", "bench");

    const next = this.add.rectangle(VIEW_W / 2, VIEW_H - 72, 260, 48, 0x295041, 1).setStrokeStyle(2, 0xc6f1dc, 0.92).setInteractive({ useHandCursor: true });
    const nextText = this.add.text(VIEW_W / 2, VIEW_H - 72, "Start Second Half", {
      fontFamily: "Georgia",
      fontSize: "22px",
      color: "#effaf2",
      fontStyle: "bold",
    }).setOrigin(0.5);
    next.on("pointerdown", () => {
      this.selectedSubSlot = null;
      this.engine.beginSecondHalf();
      this.refreshUi(true);
    });
    this.halftimePanel.add([next, nextText]);
  }

  private addLineupColumn(state: MatchStateView, x: number, y: number, title: string, key: "lineup" | "bench") {
    const header = this.add.text(x, y - 36, title, {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: "#f7f3e8",
      fontStyle: "bold",
    });
    this.halftimePanel.add(header);
    state.teams[0][key].forEach((player, index) => {
      const box = this.add.rectangle(x, y + index * 38, 480, 31, key === "lineup" && this.selectedSubSlot === player.slotId ? 0x3b4d29 : 0x10202e, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x5d8aa8, 0.86)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x + 10, y + 7 + index * 38, `${key === "lineup" ? player.slotId : "BEN"} | ${player.name} (${player.role}) OVR ${player.overall}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#edf5f8",
      });
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

    const bg = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, 560, 410, 0x07111a, 0.97).setStrokeStyle(2, 0xf0d488, 0.95);
    const title = this.add.text(VIEW_W / 2, 166, "Full Time", {
      fontFamily: "Georgia",
      fontSize: "34px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const score = this.add.text(VIEW_W / 2, 220, `${state.score.HOME} - ${state.score.AWAY}`, {
      fontFamily: "Georgia",
      fontSize: "48px",
      color: "#f7f3e8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const stats = state.stats.HOME;
    const body = this.add.text(VIEW_W / 2, 302, `Passes ${stats.successfulPasses}/${stats.successfulPasses + stats.failedPasses}\nDribbles ${stats.successfulDribbles}/${stats.successfulDribbles + stats.failedDribbles}\nShots ${stats.shots} | On target ${stats.shotsOnTarget}\nGoals ${stats.goals}`, {
      fontFamily: "Georgia",
      fontSize: "22px",
      color: "#e0edf2",
      align: "center",
    }).setOrigin(0.5);
    const replay = this.add.rectangle(VIEW_W / 2, 446, 240, 44, 0x295041, 1).setStrokeStyle(2, 0xc6f1dc, 0.92).setInteractive({ useHandCursor: true });
    const replayText = this.add.text(VIEW_W / 2, 446, "Play Again", {
      fontFamily: "Georgia",
      fontSize: "22px",
      color: "#effaf2",
      fontStyle: "bold",
    }).setOrigin(0.5);
    replay.on("pointerdown", () => this.scene.restart());
    this.fulltimePanel.add([bg, title, score, body, replay, replayText]);
  }

  private buildPrompt(state: MatchStateView) {
    if (state.phase === "HALFTIME") {
      return "Select a lineup slot, then click a bench player to make the substitution.";
    }
    if (state.phase === "FULLTIME") {
      return "Match complete. Review the stats or restart.";
    }
    if (state.turnMode === "PLAYER_DEFENSE") {
      return "The CPU action is revealed. Pick one defensive card to answer it.";
    }
    if (this.selectionMode === "PASS") {
      return "Click a teammate. The number above each player is the estimated pass success chance.";
    }
    if (this.selectionMode === "DRIBBLE") {
      return "Click inside the gold circle to pick the dribble route.";
    }
    if (this.selectionMode === "SHOT") {
      return "Shot minigame active. Press SPACE once for aim and again for power.";
    }
    return "Pick one attacking card. Every turn discards the full hand and deals three new cards.";
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
    g.fillStyle(BG, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x0b1520, 1);
    g.fillRoundedRect(PITCH_X - 18, PITCH_Y - 18, PITCH_W + 36, PITCH_H + 36, 20);
    g.fillStyle(0x112333, 1);
    g.fillRoundedRect(PITCH_X - 10, PITCH_Y - 10, PITCH_W + 20, PITCH_H + 20, 12);
    const stripeW = PITCH_W / 8;
    for (let index = 0; index < 8; index += 1) {
      g.fillStyle(index % 2 === 0 ? GRASS_A : GRASS_B, 1);
      g.fillRect(PITCH_X + index * stripeW, PITCH_Y, stripeW, PITCH_H);
    }
    for (let row = 0; row < 14; row += 1) {
      g.lineStyle(1, 0xaed8b1, 0.05);
      g.beginPath();
      g.moveTo(PITCH_X, PITCH_Y + row * (PITCH_H / 14));
      g.lineTo(PITCH_X + PITCH_W, PITCH_Y + row * (PITCH_H / 14));
      g.strokePath();
    }
    g.fillStyle(0xffffff, 0.035);
    g.fillRect(PITCH_X, PITCH_Y, PITCH_W, 18);
    g.lineStyle(3, LINE, 0.98);
    g.strokeRect(PITCH_X, PITCH_Y, PITCH_W, PITCH_H);
    g.beginPath();
    g.moveTo(PITCH_X + PITCH_W / 2, PITCH_Y);
    g.lineTo(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H);
    g.strokePath();
    g.strokeCircle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 74);
    g.beginPath();
    g.arc(PITCH_X + 136, PITCH_Y + PITCH_H / 2, 52, -0.95, 0.95);
    g.strokePath();
    g.beginPath();
    g.arc(PITCH_X + PITCH_W - 136, PITCH_Y + PITCH_H / 2, 52, 2.19, 4.09);
    g.strokePath();
    g.strokeRect(PITCH_X, PITCH_Y + 118, 136, PITCH_H - 236);
    g.strokeRect(PITCH_X + PITCH_W - 136, PITCH_Y + 118, 136, PITCH_H - 236);
    g.strokeRect(PITCH_X, PITCH_Y + 166, 52, PITCH_H - 332);
    g.strokeRect(PITCH_X + PITCH_W - 52, PITCH_Y + 166, 52, PITCH_H - 332);
    g.beginPath();
    g.arc(PITCH_X, PITCH_Y, 18, 0, Math.PI / 2);
    g.strokePath();
    g.beginPath();
    g.arc(PITCH_X, PITCH_Y + PITCH_H, 18, -Math.PI / 2, 0);
    g.strokePath();
    g.beginPath();
    g.arc(PITCH_X + PITCH_W, PITCH_Y, 18, Math.PI / 2, Math.PI);
    g.strokePath();
    g.beginPath();
    g.arc(PITCH_X + PITCH_W, PITCH_Y + PITCH_H, 18, Math.PI, Math.PI * 1.5);
    g.strokePath();
    g.fillStyle(LINE, 0.95);
    g.fillCircle(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 4);
    g.fillCircle(PITCH_X + 92, PITCH_Y + PITCH_H / 2, 3);
    g.fillCircle(PITCH_X + PITCH_W - 92, PITCH_Y + PITCH_H / 2, 3);
  }

  private getActiveLabelPlayerIds(players: PitchPlayerView[]) {
    const active = new Set<string>();
    const state = this.engine.getState();
    const ballHolder = players.find((player) => player.playerId === state.ball.holderId);
    if (ballHolder) {
      active.add(ballHolder.playerId);
    }
    this.passTargets.forEach((_, playerId) => active.add(playerId));
    Array.from(this.spotlightPlayerIds).slice(0, 2).forEach((playerId) => active.add(playerId));
    if (this.hoveredPlayerId) {
      active.add(this.hoveredPlayerId);
    }
    return active;
  }

  private renderShotPreview(shotSetup: ShotSetupView) {
    const state = this.engine.getState();
    const shooter = state.pitchPlayers.find((player) => player.playerId === shotSetup.shooterId);
    if (!shooter) {
      return;
    }

    const shooterX = this.xFor(shooter.x);
    const shooterY = this.yFor(shooter.y);
    const keeperX = this.xFor(shotSetup.keeper.x);
    const keeperY = this.yFor(shotSetup.keeper.y);
    const goalX = shotSetup.keeper.x < 50 ? PITCH_X + 8 : PITCH_X + PITCH_W - 8;
    const goalY = this.yFor(32);

    this.shotPreviewGfx.clear();
    this.shotPreviewGfx.fillStyle(0xf4d06f, 0.08);
    this.shotPreviewGfx.lineStyle(2, 0xf4d06f, 0.55);
    this.shotPreviewGfx.beginPath();
    this.shotPreviewGfx.moveTo(shooterX, shooterY);
    this.shotPreviewGfx.lineTo(goalX, goalY - 34);
    this.shotPreviewGfx.lineTo(goalX, goalY + 34);
    this.shotPreviewGfx.closePath();
    this.shotPreviewGfx.fillPath();
    this.shotPreviewGfx.strokePath();

    this.shotPreviewGfx.lineStyle(2, 0x9ae6ff, 0.7);
    this.shotPreviewGfx.beginPath();
    this.shotPreviewGfx.moveTo(shooterX, shooterY);
    this.shotPreviewGfx.lineTo(goalX, goalY);
    this.shotPreviewGfx.strokePath();

    this.shotPreviewGfx.lineStyle(3, 0x67cbd0, 0.95);
    this.shotPreviewGfx.strokeCircle(keeperX, keeperY, 22);
    for (const blocker of shotSetup.laneBlockers) {
      this.shotPreviewGfx.lineStyle(2, 0xffc178, 0.9);
      this.shotPreviewGfx.strokeCircle(this.xFor(blocker.x), this.yFor(blocker.y), 18);
    }
  }

  private renderShotAimArrow(cursor: number) {
    if (!this.shotSetup) {
      return;
    }
    const state = this.engine.getState();
    const shooter = state.pitchPlayers.find((player) => player.playerId === this.shotSetup?.shooterId);
    if (!shooter) {
      return;
    }

    const startX = this.xFor(state.ball.x);
    const startY = this.yFor(state.ball.y);
    const keeperOnLeft = this.shotSetup.keeper.x < 50;
    const goalX = keeperOnLeft ? PITCH_X + 8 : PITCH_X + PITCH_W - 8;
    const targetTop = this.yFor(21);
    const targetBottom = this.yFor(43);
    const targetY = Phaser.Math.Linear(targetTop, targetBottom, cursor);
    const guideX = Phaser.Math.Linear(startX, goalX, 0.72);
    const guideY = Phaser.Math.Linear(startY, targetY, 0.72);

    this.shotAimGuide.clear();
    this.shotAimGuide.lineStyle(2, 0x7adce3, 0.35);
    this.shotAimGuide.beginPath();
    this.shotAimGuide.moveTo(startX, startY);
    this.shotAimGuide.lineTo(goalX, targetY);
    this.shotAimGuide.strokePath();

    this.shotAimArrow.clear();
    this.shotAimArrow.lineStyle(4, 0x59d8d2, 0.95);
    this.shotAimArrow.beginPath();
    this.shotAimArrow.moveTo(startX, startY);
    this.shotAimArrow.lineTo(guideX, guideY);
    this.shotAimArrow.strokePath();
    this.shotAimArrow.fillStyle(0x59d8d2, 0.95);
    this.shotAimArrow.fillPoints(
      buildArrowHead(
        guideX,
        guideY,
        goalX,
        targetY,
        16
      ),
      true
    );
  }

  private drawBallTrail(fromX: number, fromY: number, toX: number, toY: number, style: { color: number; width: number; arc: number } | null) {
    if (Math.hypot(toX - fromX, toY - fromY) < 10) {
      return;
    }
    const trail = style ?? { color: 0xf5f0c8, width: 4, arc: 0 };
    this.ballTrail.clear();
    this.ballTrail.lineStyle(trail.width, trail.color, 0.95);
    this.ballTrail.beginPath();
    this.ballTrail.moveTo(fromX, fromY);
    if (trail.arc > 0) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2 - trail.arc;
      for (let step = 1; step <= 12; step += 1) {
        const t = step / 12;
        const curveX = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
        const curveY = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;
        this.ballTrail.lineTo(curveX, curveY);
      }
    } else {
      this.ballTrail.lineTo(toX, toY);
    }
    this.ballTrail.strokePath();
    this.ballTrail.setAlpha(0.95);
    this.tweens.add({
      targets: this.ballTrail,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => this.ballTrail.clear(),
    });
  }

  private getTrailStyle(result: ActionResolutionView) {
    const kind = result.attackingCard?.kind;
    if (kind === "SHOT") {
      return { color: GOLD, width: 5, arc: 34 };
    }
    if (kind === "PASS") {
      return { color: 0xdff7ff, width: 4, arc: result.title.toLowerCase().includes("intercept") ? 10 : 16 };
    }
    if (kind === "DRIBBLE") {
      return { color: 0xc8f7d1, width: 3, arc: 0 };
    }
    return null;
  }

  private showResultBanner(result: ActionResolutionView) {
    const accent = this.getResultAccent(result);
    this.resultBannerBg.setStrokeStyle(2, accent, 0.98);
    this.resultBannerText.setColor(Phaser.Display.Color.IntegerToColor(accent).rgba);
    this.resultBannerText.setText(result.title.toUpperCase());
    this.resultBanner.setVisible(true).setAlpha(0);
    this.resultBanner.setScale(0.9);
    this.tweens.killTweensOf(this.resultBanner);
    this.tweens.add({
      targets: this.resultBanner,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: "Back.easeOut",
      yoyo: false,
    });
    this.time.delayedCall(560, () => {
      this.tweens.add({
        targets: this.resultBanner,
        alpha: 0,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 180,
        onComplete: () => this.resultBanner.setVisible(false),
      });
    });
  }

  private pulseActionAtBall(ball: MatchStateView["ball"]) {
    const { x, y } = this.getBallRenderPoint(ball);
    this.actionPulse.setPosition(x, y).setScale(0.44).setAlpha(0.22).setVisible(true);
    this.tweens.killTweensOf(this.actionPulse);
    this.tweens.add({
      targets: this.actionPulse,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => this.actionPulse.setVisible(false),
    });
  }

  private animateImpactPlayers(result: ActionResolutionView) {
    const accent = this.getResultAccent(result);
    const playerIds = Array.from(this.spotlightPlayerIds).slice(0, result.goalScored ? 3 : 2);
    for (const playerId of playerIds) {
      const token = this.tokenViews.get(playerId);
      if (!token) continue;
      token.ring.setVisible(true).setStrokeStyle(3, accent, 1).setAlpha(1);
      this.tweens.add({
        targets: token.sprite,
        scaleX: token.sprite.scaleX * (result.goalScored ? 1.18 : 1.1),
        scaleY: token.sprite.scaleY * (result.goalScored ? 1.18 : 1.1),
        duration: 110,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      this.tweens.add({
        targets: token.ring,
        alpha: { from: 1, to: 0.24 },
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 220,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }
  }

  private animateShotContext(result: ActionResolutionView) {
    if (result.attackingCard?.kind !== "SHOT" || !this.pendingShotSetup) {
      return;
    }

    const keeperView = this.tokenViews.get(this.pendingShotSetup.keeper.playerId);
    if (keeperView) {
      const diveDirection = result.goalScored
        ? this.pendingShotSetup.keeper.x < 50
          ? 16
          : -16
        : result.title.toLowerCase().includes("save")
          ? this.pendingShotSetup.keeper.x < 50
            ? -12
            : 12
          : 0;
      if (diveDirection !== 0) {
        this.tweens.add({
          targets: [keeperView.shadow, keeperView.ring, keeperView.sprite],
          x: keeperView.sprite.x + diveDirection,
          duration: 140,
          yoyo: true,
          ease: "Quad.easeOut",
        });
        this.tweens.add({
          targets: keeperView.name,
          x: keeperView.name.x + diveDirection,
          duration: 140,
          yoyo: true,
          ease: "Quad.easeOut",
        });
      }
    }

    const shooter = this.engine.getState().pitchPlayers.find((player) => player.playerId === this.pendingShotSetup?.shooterId);
    if (!shooter) {
      return;
    }
    const goalMouthX = this.pendingShotSetup.keeper.x < 50 ? PITCH_X + 8 : PITCH_X + PITCH_W - 8;
    const goalMouthY =
      result.goalScored
        ? this.yFor(this.pendingShotSetup.keeper.y < 32 ? 23 : 41)
        : result.title.toLowerCase().includes("save")
          ? this.yFor(this.pendingShotSetup.keeper.y)
          : this.yFor(this.pendingShotSetup.keeper.y < 32 ? 18 : 46);
    this.drawBallTrail(this.xFor(shooter.x), this.yFor(shooter.y), goalMouthX, goalMouthY, { color: GOLD, width: 5, arc: 40 });
  }

  private punchCamera(result: ActionResolutionView) {
    const shake = result.goalScored ? 0.006 : result.roundEnded ? 0.0038 : 0.0026;
    this.cameras.main.shake(140, shake, true);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.012,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  private getResultAccent(result: ActionResolutionView) {
    if (result.goalScored) return GOLD;
    if (result.title.toLowerCase().includes("intercept") || result.title.toLowerCase().includes("tackle")) return 0xff9a63;
    if (result.title.toLowerCase().includes("save") || result.title.toLowerCase().includes("saved")) return 0x67cbd0;
    return 0xc8f7d1;
  }

  private formatCommentary(lines: string[]) {
    return lines
      .slice(-2)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n");
  }

  private getBallRenderPoint(ball: MatchStateView["ball"]) {
    const baseX = this.xFor(ball.x);
    const baseY = this.yFor(ball.y);
    const holder = this.engine.getState().pitchPlayers.find((player) => player.playerId === ball.holderId && player.hasBall);
    if (!holder) {
      return { x: baseX, y: baseY };
    }

    const holderView = this.tokenViews.get(holder.playerId);
    const moveDir = holderView ? Math.sign(holder.x - holderView.lastX) || (holder.teamId === "HOME" ? 1 : -1) : holder.teamId === "HOME" ? 1 : -1;
    const dribblePhase = this.time.now * 0.018;
    const offsetX = moveDir * 6 + Math.sin(dribblePhase) * 1.5;
    return {
      x: Phaser.Math.Clamp(baseX + offsetX, PITCH_X + 10, PITCH_X + PITCH_W - 10),
      y: Phaser.Math.Clamp(baseY + 8 + Math.abs(Math.cos(dribblePhase * 1.2)) * 1.1, PITCH_Y + 10, PITCH_Y + PITCH_H - 10),
    };
  }

  private xFor(value: number) {
    return this.pitchOffsetX + PITCH_X + (value / 100) * PITCH_W;
  }

  private yFor(value: number) {
    return this.pitchOffsetY + PITCH_Y + (value / 64) * PITCH_H;
  }

  private normX(screenX: number) {
    return Phaser.Math.Clamp(((screenX - (PITCH_X + this.pitchOffsetX)) / PITCH_W) * 100, 0, 100);
  }

  private normY(screenY: number) {
    return Phaser.Math.Clamp(((screenY - (PITCH_Y + this.pitchOffsetY)) / PITCH_H) * 64, 0, 64);
  }

  private textureKeyForPlayer(player: PitchPlayerView, state: "idle" | "run" | "kick" | "tackle" | "save") {
    const prefix =
      player.role === "GK" ? (player.teamId === "HOME" ? "player_gk_home" : "player_gk_away") : player.teamId === "HOME" ? "player_home" : "player_away";
    if (state === "run") {
      return `${prefix}_${Math.floor(this.time.now / 90) % 2 === 0 ? "run_a" : "run_b"}`;
    }
    return `${prefix}_${state}`;
  }

  private resolveAnimState(player: PitchPlayerView, motion: number) {
    if (player.role === "GK" && this.pendingShotSetup?.keeper.playerId === player.playerId) {
      return "save" as const;
    }
    if (this.selectionMode === "SHOT" && player.hasBall) {
      return "kick" as const;
    }
    if (motion > 1.2) {
      return "run" as const;
    }
    if (this.spotlightPlayerIds.has(player.playerId) && !player.hasBall && player.teamId !== this.engine.getState().possessionTeam) {
      return "tackle" as const;
    }
    return "idle" as const;
  }

  private getSpriteBaseScale(sprite: Phaser.GameObjects.Sprite, targetHeight: number) {
    const source = sprite.texture.getSourceImage() as { width?: number; height?: number } | undefined;
    const sourceHeight = source?.height ?? sprite.height ?? 16;
    return Phaser.Math.Clamp(targetHeight / Math.max(1, sourceHeight), 0.4, 3);
  }

  private applySpriteBodyMotion(
    view: TokenView,
    motion: number,
    hasBall: boolean,
    facingRight: number,
    animState: "idle" | "run" | "kick" | "tackle" | "save"
  ) {
    const bob = Math.sin((this.time.now + view.lastX * 8) * 0.022);
    let spriteY = view.sprite.y;
    if (animState === "run") {
      spriteY += bob * 1.1;
      view.sprite.setScale(view.baseScale * (hasBall ? 1.03 : 1));
      view.shadow.setScale(1.04 + Math.min(motion * 0.035, 0.12), 1);
    } else if (animState === "kick" || animState === "save") {
      spriteY -= 1;
      view.sprite.setScale(view.baseScale * 1.05);
      view.shadow.setScale(1.1, 1);
    } else if (animState === "tackle") {
      spriteY += 0.4;
      view.sprite.setScale(view.baseScale * 1.02);
      view.shadow.setScale(1.08, 1);
    } else {
      view.sprite.setScale(view.baseScale * (hasBall ? 1.03 : 1));
      view.shadow.setScale(1, 1);
    }
    view.sprite.setFlipX(facingRight < 0);
    view.sprite.setY(spriteY);
    view.sprite.clearTint();
  }

  private updatePitchFocus(ball: MatchStateView["ball"], _instant: boolean) {
    const desiredX = Phaser.Math.Clamp((50 - ball.x) * 1.2, -26, 26);
    const desiredY = Phaser.Math.Clamp((32 - ball.y) * 0.75, -14, 14);
    this.pitchOffsetX = desiredX;
    this.pitchOffsetY = desiredY;
    this.fieldGfx.setPosition(this.pitchOffsetX, this.pitchOffsetY);
    this.pitchHit.setPosition(this.pitchOffsetX + PITCH_X + PITCH_W / 2, this.pitchOffsetY + PITCH_Y + PITCH_H / 2);
  }

  private playAnticipation(result: ActionResolutionView) {
    const anticipationIds = Array.from(new Set([result.ball.holderId, ...this.spotlightPlayerIds])).slice(0, 3);
    for (const playerId of anticipationIds) {
      const token = this.tokenViews.get(playerId);
      if (!token) continue;
      this.tweens.add({
        targets: token.sprite,
        y: token.sprite.y - 2,
        duration: 60,
        yoyo: true,
        ease: "Quad.easeOut",
      });
      this.tweens.add({
        targets: token.ring,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 60,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }
}

function formatTactic(tactic: MatchTacticId) {
  return tactic.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function clamp01(value: number) {
  return Phaser.Math.Clamp(value, 0, 1);
}

function buildArrowHead(fromX: number, fromY: number, toX: number, toY: number, size: number) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const spread = Math.PI / 7;
  return [
    new Phaser.Geom.Point(toX, toY),
    new Phaser.Geom.Point(toX - Math.cos(angle - spread) * size, toY - Math.sin(angle - spread) * size),
    new Phaser.Geom.Point(toX - Math.cos(angle + spread) * size, toY - Math.sin(angle + spread) * size),
  ];
}
