import Phaser from "phaser";
import { CardView } from "./CardView";

export class HandView extends Phaser.GameObjects.Container {
  private slots: CardView[] = [];
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
      this.add(card);
    }
  }

  setCards(cardIds: string[]) {
    for (let i = 0; i < this.slots.length; i++) {
      const id = cardIds[i] ?? "";
      this.slots[i].setCard(id);
    }
  }
}
