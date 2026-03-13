import Phaser from "phaser";
import type { TeamCommandType } from "../../sim/state/MatchState";
import {
  buildAwayRatings,
  buildHomeRatings,
  DriveMatchEngine,
  type Lane,
  type PlayResult,
  type TargetOption,
  type TokenId,
} from "../drive/DriveMatchEngine";
import { getSelectedSquadPlayers, loadProfile } from "../profile/ProfileStore";

type CardButton = {
  bg: Phaser.GameObjects.Rectangle;
  accent: Phaser.GameObjects.Rectangle;
  hotkey: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text;
  meta: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  cardId: string | null;
};

type CommandButton = {
  bg: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  body: Phaser.GameObjects.Text;
  commandId: TeamCommandType;
};

type TokenView = {
  key: string;
  body: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  role: Phaser.GameObjects.Text;
  teamId: "HOME" | "AWAY";
  tokenId: TokenId;
};

const BG = 0x08131c;
const PANEL = 0x102332;
const PANEL_ALT = 0x132b3d;
const CREAM = "#f7f1db";
const TEAL = 0x67d9d3;
const CORAL = 0xf08d6d;
const FIELD_LEFT = 184;
const FIELD_TOP = 116;
const FIELD_WIDTH = 548;
const FIELD_HEIGHT = 252;
const FIELD_RIGHT = FIELD_LEFT + FIELD_WIDTH;
const FIELD_BOTTOM = FIELD_TOP + FIELD_HEIGHT;
const LANE_Y: Record<Lane, number> = {
  LEFT: FIELD_TOP + 54,
  CENTER: FIELD_TOP + FIELD_HEIGHT / 2,
  RIGHT: FIELD_BOTTOM - 54,
};

export class MatchScene extends Phaser.Scene {
  private engine!: DriveMatchEngine;
  private fieldGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private resolutionText!: Phaser.GameObjects.Text;
  private selectionText!: Phaser.GameObjects.Text;
  private commentaryText!: Phaser.GameObjects.Text;
  private momentumFill!: Phaser.GameObjects.Rectangle;
  private attackBandMarker!: Phaser.GameObjects.Rectangle;
  private ballMarker!: Phaser.GameObjects.Arc;
  private tokenViews = new Map<string, TokenView>();
  private handButtons: CardButton[] = [];
  private commandButtons: CommandButton[] = [];
  private historyLines: Phaser.GameObjects.Text[] = [];
  private selectedCommandId: TeamCommandType | null = null;
  private pendingCardId: string | null = null;
  private targetOptions: TargetOption[] = [];
  private activeLane: Lane = "CENTER";
  private postMatchBg!: Phaser.GameObjects.Rectangle;
  private postMatchText!: Phaser.GameObjects.Text;
  private postMatchHint!: Phaser.GameObjects.Text;

  constructor() {
    super("MatchScene");
  }

  create() {
    const profile = loadProfile();
    const squad = getSelectedSquadPlayers(profile);
    const homeRatings = buildHomeRatings(squad);
    const awayRatings = buildAwayRatings(profile.manager.division);

    this.engine = new DriveMatchEngine({
      rngSeed: 1337,
      homeLabel: "Blackflag Union",
      awayLabel: `Division ${profile.manager.division} CPU`,
      homeRatings,
      awayRatings,
      teamCommands: profile.teamCommandDeckIds.slice(0, 5),
    });

    this.cameras.main.setBackgroundColor(BG);
    this.createBackdrop();
    this.createHud();
    this.createField();
    this.createTokens();
    this.createHand();
    this.createCommands();
    this.createPostMatchPanel();
    this.bindInput();
    this.refreshUi(null, true);
  }

  private createBackdrop() {
    this.add.rectangle(480, 270, 960, 540, 0x07111a, 1);
    this.add.circle(154, 82, 132, 0x58c0d0, 0.08);
    this.add.circle(840, 430, 176, 0xffb370, 0.06);
    this.add.rectangle(480, 32, 920, 52, 0x0b1924, 1).setStrokeStyle(1, 0x2b4658, 0.84);
    this.add.rectangle(110, 246, 152, 342, PANEL_ALT, 1).setStrokeStyle(1, 0x32536b, 0.82);
    this.add.rectangle(832, 246, 208, 342, PANEL, 1).setStrokeStyle(1, 0x32536b, 0.82);
    this.add.rectangle(480, 448, 894, 146, PANEL, 1).setStrokeStyle(1, 0x32536b, 0.82);
  }

  private createHud() {
    this.add.text(36, 16, "Pocket Gaffer Tactics", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: CREAM,
      fontStyle: "bold",
    });
    this.scoreText = this.add.text(314, 16, "", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: CREAM,
      fontStyle: "bold",
    });
    this.clockText = this.add.text(314, 48, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d2e6ee",
    });
    this.phaseText = this.add.text(36, 82, "", {
      fontFamily: "Georgia",
      fontSize: "22px",
      color: CREAM,
      fontStyle: "italic",
    });
    this.selectionText = this.add.text(36, 116, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffd2a1",
      wordWrap: { width: 128 },
    });
    this.resolutionText = this.add.text(770, 84, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d5e5ee",
      wordWrap: { width: 150 },
    });
    this.commentaryText = this.add.text(770, 320, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#c6dbe8",
      wordWrap: { width: 170 },
    });
    this.add.text(742, 18, "Momentum", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#a7d9d2",
    });
    this.add.rectangle(824, 40, 192, 14, 0x09131a, 1).setStrokeStyle(1, 0x35566c, 0.82);
    this.momentumFill = this.add.rectangle(824, 40, 6, 10, TEAL, 1).setOrigin(0.5);
    this.add.text(770, 212, "Commands", {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: CREAM,
      fontStyle: "bold",
    });
    this.add.text(770, 432, "Recent Rounds", {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: CREAM,
      fontStyle: "bold",
    });

    for (let i = 0; i < 4; i++) {
      this.historyLines.push(
        this.add.text(770, 462 + i * 18, "", {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#c4dcea",
          wordWrap: { width: 170 },
        })
      );
    }
  }

  private createField() {
    this.fieldGfx = this.add.graphics();
    this.drawField();
    this.attackBandMarker = this.add.rectangle(FIELD_RIGHT - 78, FIELD_TOP + FIELD_HEIGHT / 2, 2, FIELD_HEIGHT + 16, 0xf0c36b, 0.78);
    this.ballMarker = this.add.circle(FIELD_LEFT, LANE_Y.CENTER, 8, 0x09131a, 1).setStrokeStyle(4, 0xf7f1db, 1);
  }

  private createTokens() {
    const tokens = this.engine.getBoardTokens();
    for (const token of tokens) {
      const body = this.add.circle(0, 0, 12, token.teamId === "HOME" ? TEAL : CORAL, 1).setInteractive({ useHandCursor: true });
      const ring = this.add.circle(0, 0, 16, 0xf0c36b, 0.12).setStrokeStyle(2, 0xf0c36b, 0.6);
      const label = this.add.text(0, 0, token.roleLabel, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: token.teamId === "HOME" ? "#08303a" : "#3a120b",
      }).setOrigin(0.5);
      const role = this.add.text(0, 0, token.roleLabel, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f6f4ea",
      }).setOrigin(0.5);
      const key = `${token.teamId}_${token.id}`;
      body.on("pointerdown", () => {
        if (token.teamId !== "HOME") return;
        if (!this.pendingCardId) return;
        if (!this.targetOptions.some((option) => option.id === token.id)) return;
        this.resolvePendingCard(token.id);
      });
      this.tokenViews.set(key, { key, body, ring, label, role, teamId: token.teamId, tokenId: token.id });
    }
  }

  private createHand() {
    for (let i = 0; i < 4; i++) {
      const x = 176 + i * 176;
      const y = 388;
      const bg = this.add
        .rectangle(x, y, 164, 106, 0x182d3e, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3b647f, 0.88)
        .setInteractive({ useHandCursor: true });
      const accent = this.add.rectangle(x, y, 164, 10, TEAL, 1).setOrigin(0, 0);
      const hotkey = this.add.text(x + 10, y + 14, `${i + 1}`, {
        fontFamily: "Georgia",
        fontSize: "20px",
        color: CREAM,
        fontStyle: "bold",
      });
      const title = this.add.text(x + 38, y + 16, "", {
        fontFamily: "Georgia",
        fontSize: "18px",
        color: CREAM,
        fontStyle: "bold",
      });
      const meta = this.add.text(x + 10, y + 44, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#97e3d9",
      });
      const body = this.add.text(x + 10, y + 62, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#d8e7ef",
        wordWrap: { width: 144 },
      });
      const index = i;
      bg.on("pointerdown", () => {
        const cardId = this.handButtons[index]?.cardId;
        if (cardId) this.onCardPicked(cardId);
      });
      this.handButtons.push({ bg, accent, hotkey, title, meta, body, cardId: null });
    }
  }

  private createCommands() {
    this.engine.getCommandStates().forEach((command, index) => {
      const y = 244 + index * 32;
      const bg = this.add
        .rectangle(770, y, 170, 26, 0x162636, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x35566d, 0.88)
        .setInteractive({ useHandCursor: true });
      const title = this.add.text(778, y + 5, command.label, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#edf5e2",
      });
      const body = this.add.text(932, y + 5, "Ready", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#9ad0c8",
      }).setOrigin(1, 0);
      bg.on("pointerdown", () => {
        if (command.used) return;
        this.selectedCommandId = this.selectedCommandId === command.id ? null : command.id;
        this.refreshCommandButtons();
      });
      this.commandButtons.push({ bg, title, body, commandId: command.id });
    });
  }

  private createPostMatchPanel() {
    this.postMatchBg = this.add.rectangle(480, 270, 420, 220, 0x0d1822, 0.96).setStrokeStyle(2, 0x7ecfd0, 0.95).setVisible(false);
    this.postMatchText = this.add
      .text(480, 236, "", {
        fontFamily: "Georgia",
        fontSize: "24px",
        color: CREAM,
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.postMatchHint = this.add
      .text(480, 316, "ENTER to return to menu", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d3e5ed",
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private bindInput() {
    this.input.keyboard?.on("keydown-ONE", () => this.playCardAtIndex(0));
    this.input.keyboard?.on("keydown-TWO", () => this.playCardAtIndex(1));
    this.input.keyboard?.on("keydown-THREE", () => this.playCardAtIndex(2));
    this.input.keyboard?.on("keydown-FOUR", () => this.playCardAtIndex(3));
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.pendingCardId) {
        this.pendingCardId = null;
        this.targetOptions = [];
        this.refreshUi(null, false);
        return;
      }
      this.scene.start("MainMenuScene");
    });
    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.engine.getState().winner) this.scene.start("MainMenuScene");
    });
  }

  private playCardAtIndex(index: number) {
    const cardId = this.handButtons[index]?.cardId;
    if (cardId) this.onCardPicked(cardId);
  }

  private onCardPicked(cardId: string) {
    const targetOptions = this.engine.getTargetOptions(cardId);
    if (targetOptions.length > 0) {
      this.pendingCardId = cardId;
      this.targetOptions = targetOptions;
      this.refreshUi(null, false);
      return;
    }
    this.executeCard(cardId);
  }

  private resolvePendingCard(targetId: TokenId) {
    if (!this.pendingCardId) return;
    this.executeCard(this.pendingCardId, targetId);
    this.pendingCardId = null;
    this.targetOptions = [];
  }

  private executeCard(cardId: string, targetId?: TokenId) {
    try {
      const result = this.engine.playUserCard(cardId, this.selectedCommandId ?? undefined, targetId);
      this.selectedCommandId = null;
      this.applyPlayResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.phaseText.setText(message);
      this.selectionText.setText("Try a different action or target.");
    }
  }

  private applyPlayResult(result: PlayResult) {
    this.activeLane = result.laneAfter;
    this.tweens.killTweensOf([this.ballMarker]);
    this.tweens.add({
      targets: this.ballMarker,
      x: this.xForZone(result.zoneAfter),
      y: this.yForLane(result.laneAfter),
      duration: 240,
      ease: "Cubic.easeOut",
      onComplete: () => this.refreshUi(result, false),
    });
    this.refreshUi(result, false);
  }

  private refreshUi(result: PlayResult | null, instant: boolean) {
    const state = this.engine.getState();
    const clock = this.engine.getClockView();
    this.scoreText.setText(`${state.homeLabel} ${state.score.HOME}  :  ${state.score.AWAY} ${state.awayLabel}`);
    this.clockText.setText(`H${clock.half}  ${clock.minute}'  |  ${state.possession === "HOME" ? "Attack Phase" : "Defense Phase"}  |  ${clock.turnsRemaining} turns left`);
    this.phaseText.setText(state.possession === "HOME" ? "Choose your action" : "Choose your defensive answer");
    this.selectionText.setText(this.pendingCardId ? `Choose the receiver or runner on the pitch.` : state.possession === "HOME" ? "Pick a card, then pick a visible target if required." : "Pick your defensive card. CPU action resolves after you commit.");
    this.resolutionText.setText(
      result
        ? `${formatCardLabel(result.userCardId)} -> ${formatCardLabel(state.possession === "HOME" ? result.defenseCardId : result.offenseCardId)}\n${result.summary}`
        : "Both sides commit one move per round.\nOutcome resolves immediately after the response."
    );
    this.commentaryText.setText(result ? result.detail : "Goalkeepers, defenders, midfielders, and forwards are all visible on the board.");

    const momentumWidth = 24 + ((state.momentum + 6) / 12) * 168;
    this.momentumFill.setDisplaySize(momentumWidth, 10);
    this.momentumFill.setPosition(728 + momentumWidth / 2, 40);
    this.momentumFill.setFillStyle(state.momentum >= 0 ? TEAL : CORAL, 1);

    this.refreshMarkers(instant);
    this.refreshHandButtons();
    this.refreshCommandButtons();
    this.refreshBoardTokens();
    this.refreshHistory();
    this.setPostMatchVisible(Boolean(state.winner));
  }

  private refreshMarkers(instant: boolean) {
    const state = this.engine.getState();
    const threatZone = state.possession === "HOME" ? 5 : 1;
    if (instant) {
      this.ballMarker.setPosition(this.xForZone(state.zone), this.yForLane(this.activeLane));
    }
    this.attackBandMarker.setPosition(this.xForZone(threatZone), FIELD_TOP + FIELD_HEIGHT / 2);
    this.attackBandMarker.setFillStyle(state.possession === "HOME" ? TEAL : CORAL, 0.74);
  }

  private refreshHandButtons() {
    const deckKind = this.engine.getUserDeckKind();
    const cards = this.engine.getUserHand();
    this.handButtons.forEach((button, index) => {
      const card = cards[index];
      button.cardId = card?.id ?? null;
      button.bg.setVisible(Boolean(card));
      button.accent.setVisible(Boolean(card));
      button.hotkey.setVisible(Boolean(card));
      button.title.setVisible(Boolean(card));
      button.meta.setVisible(Boolean(card));
      button.body.setVisible(Boolean(card));
      if (!card) return;

      const selected = this.pendingCardId === card.id;
      button.accent.setFillStyle(deckKind === "OFFENSE" ? TEAL : CORAL, 1);
      button.bg.setFillStyle(deckKind === "OFFENSE" ? 0x173041 : 0x352521, 1);
      button.bg.setStrokeStyle(2, selected ? 0xf0c36b : 0x416883, 0.95);
      button.title.setText(card.name);
      button.meta.setText(`${deckKind} | ${card.lane}`);
      button.body.setText(card.description);
    });
  }

  private refreshCommandButtons() {
    const commandStates = this.engine.getCommandStates();
    this.commandButtons.forEach((button) => {
      const state = commandStates.find((entry) => entry.id === button.commandId);
      if (!state) return;
      const selected = this.selectedCommandId === state.id;
      button.bg.setFillStyle(state.used ? 0x1c252c : selected ? 0x35442f : 0x152636, 1);
      button.bg.setStrokeStyle(1, state.used ? 0x55626d : selected ? 0xf0c36b : 0x35566d, 0.9);
      button.title.setAlpha(state.used ? 0.42 : 1);
      button.body.setAlpha(state.used ? 0.42 : 1);
      button.body.setText(state.used ? "Spent" : selected ? "Armed" : "Ready");
    });
  }

  private refreshBoardTokens() {
    const tokens = this.engine.getBoardTokens();
    const targetMap = new Map(this.targetOptions.map((option) => [option.id, option]));
    for (const token of tokens) {
      const view = this.tokenViews.get(`${token.teamId}_${token.id}`);
      if (!view) continue;
      const x = this.xForZone(token.zone);
      const y = this.yForLane(token.lane);
      const selectable = token.teamId === "HOME" && targetMap.has(token.id);
      view.body.setPosition(x, y);
      view.ring.setPosition(x, y);
      view.label.setPosition(x, y);
      view.role.setPosition(x, y + 20);
      view.body.setFillStyle(token.teamId === "HOME" ? TEAL : CORAL, 1);
      view.ring.setVisible(token.hasBall || selectable);
      view.ring.setStrokeStyle(2, selectable ? 0xf0c36b : 0xffffff, selectable ? 1 : 0.5);
      view.label.setText(token.roleLabel);
      view.role.setText(selectable ? targetMap.get(token.id)?.label ?? token.roleLabel : token.roleLabel);
      view.body.setScale(token.hasBall ? 1.15 : selectable ? 1.08 : 1);
      view.body.setAlpha(selectable || token.hasBall ? 1 : 0.9);
    }
  }

  private refreshHistory() {
    const history = this.engine.getState().history;
    this.historyLines.forEach((line, index) => {
      const play = history[index];
      line.setText(play ? `${play.summary}` : "");
    });
  }

  private setPostMatchVisible(visible: boolean) {
    this.postMatchBg.setVisible(visible);
    this.postMatchText.setVisible(visible);
    this.postMatchHint.setVisible(visible);
    if (!visible) return;
    const state = this.engine.getState();
    const result =
      state.winner === "HOME" ? "You managed the better tactical match." : state.winner === "AWAY" ? "The CPU outplayed your decisions." : "Stalemate. No side found the killer move.";
    this.postMatchText.setText(`Full Time\n${state.homeLabel} ${state.score.HOME} - ${state.score.AWAY} ${state.awayLabel}\n\n${result}`);
  }

  private drawField() {
    const g = this.fieldGfx;
    g.clear();
    g.fillStyle(0x1f5b46, 1);
    g.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_WIDTH, FIELD_HEIGHT);
    for (let i = 0; i < 7; i++) {
      const stripeX = FIELD_LEFT + i * (FIELD_WIDTH / 7);
      g.fillStyle(i % 2 === 0 ? 0x255f4a : 0x215b47, 1);
      g.fillRect(stripeX, FIELD_TOP, FIELD_WIDTH / 7, FIELD_HEIGHT);
      g.lineStyle(1, 0xe4f2eb, 0.18);
      g.beginPath();
      g.moveTo(stripeX, FIELD_TOP);
      g.lineTo(stripeX, FIELD_BOTTOM);
      g.strokePath();
    }
    g.lineStyle(2, 0xecf5ef, 0.96);
    g.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_WIDTH, FIELD_HEIGHT);
    g.beginPath();
    g.moveTo(FIELD_LEFT + FIELD_WIDTH / 2, FIELD_TOP);
    g.lineTo(FIELD_LEFT + FIELD_WIDTH / 2, FIELD_BOTTOM);
    g.strokePath();
    g.strokeCircle(FIELD_LEFT + FIELD_WIDTH / 2, FIELD_TOP + FIELD_HEIGHT / 2, 30);
    g.fillStyle(0xecf5ef, 0.96);
    g.fillCircle(FIELD_LEFT + FIELD_WIDTH / 2, FIELD_TOP + FIELD_HEIGHT / 2, 2);
    g.strokeRect(FIELD_LEFT, FIELD_TOP + 48, 72, FIELD_HEIGHT - 96);
    g.strokeRect(FIELD_RIGHT - 72, FIELD_TOP + 48, 72, FIELD_HEIGHT - 96);
    g.strokeRect(FIELD_LEFT, FIELD_TOP + 78, 26, FIELD_HEIGHT - 156);
    g.strokeRect(FIELD_RIGHT - 26, FIELD_TOP + 78, 26, FIELD_HEIGHT - 156);
    for (const lane of ["LEFT", "CENTER", "RIGHT"] as Lane[]) {
      g.lineStyle(1, 0xecf5ef, 0.16);
      g.beginPath();
      g.moveTo(FIELD_LEFT, LANE_Y[lane]);
      g.lineTo(FIELD_RIGHT, LANE_Y[lane]);
      g.strokePath();
    }
  }

  private xForZone(zone: number) {
    const cellWidth = FIELD_WIDTH / 7;
    return FIELD_LEFT + cellWidth * zone + cellWidth / 2;
  }

  private yForLane(lane: Lane) {
    return LANE_Y[lane];
  }
}

function formatCardLabel(id: string) {
  return id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
