import Phaser from "phaser";
import { CardView, type CardVisualStatus } from "./CardView";
const HAND_SLOT_HOTKEYS = ["A", "S", "D"] as const;

export interface HandCardUiState {
  status: CardVisualStatus;
  cooldownMs: number;
  hint: string;
  selected: boolean;
}

export class HandView extends Phaser.GameObjects.Container {
  private slots: CardView[] = [];
  private slotIds: string[] = [];
  private hotkeyTags: Phaser.GameObjects.Text[] = [];
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
      const key = HAND_SLOT_HOTKEYS[i] ?? "";
      const hotkeyTag = scene.add
        .text(cardW - 8, 4, key ? `[${key}]` : "", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#f8ffe4",
        })
        .setOrigin(1, 0)
        .setAlpha(key ? 0.92 : 0);
      card.add(hotkeyTag);
      this.slots.push(card);
      this.slotIds.push("");
      this.hotkeyTags.push(hotkeyTag);
      this.add(card);
    }
  }

  setCards(cardIds: string[], cardState?: Record<string, HandCardUiState>, cardLabels?: Record<string, string>) {
    for (let i = 0; i < this.slots.length; i++) {
      const id = cardIds[i] ?? "";
      this.slotIds[i] = id;
      const meta = id && cardState ? cardState[id] : undefined;
      const title = id && cardLabels ? cardLabels[id] : undefined;
      this.slots[i].setCard(id, {
        status: meta?.status ?? "READY",
        cooldownMs: meta?.cooldownMs ?? 0,
        selected: meta?.selected ?? false,
        hint: meta?.hint ?? "",
        title,
      });
      const hasCard = Boolean(id);
      const tag = this.hotkeyTags[i];
      if (tag) {
        const hasKey = Boolean(HAND_SLOT_HOTKEYS[i]);
        tag.setAlpha(hasKey ? (hasCard ? 0.92 : 0.35) : 0);
      }
    }
  }

  pulseInvalid(cardId: string) {
    const idx = this.slotIds.indexOf(cardId);
    if (idx < 0) return;
    this.slots[idx].pulseInvalid();
  }

  pulsePlayed(cardId: string) {
    const idx = this.slotIds.indexOf(cardId);
    if (idx < 0) return;
    this.slots[idx].pulsePlayed();
  }
}
