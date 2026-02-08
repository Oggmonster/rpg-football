import Phaser from "phaser";
import { CardView, type CardVisualStatus } from "./CardView";

export interface HandCardUiState {
  status: CardVisualStatus;
  cooldownMs: number;
  hint: string;
  selected: boolean;
}

export class HandView extends Phaser.GameObjects.Container {
  private slots: CardView[] = [];
  private slotIds: string[] = [];
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
      this.slotIds.push("");
      this.add(card);
    }
  }

  setCards(cardIds: string[], cardState?: Record<string, HandCardUiState>) {
    for (let i = 0; i < this.slots.length; i++) {
      const id = cardIds[i] ?? "";
      this.slotIds[i] = id;
      const meta = id && cardState ? cardState[id] : undefined;
      this.slots[i].setCard(id, {
        status: meta?.status ?? "READY",
        cooldownMs: meta?.cooldownMs ?? 0,
        selected: meta?.selected ?? false,
        hint: meta?.hint ?? "",
      });
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
