import Phaser from "phaser";
import attackCards from "../../data/cards.attack.json";
import defenseCards from "../../data/cards.defense.json";
import { HAND_SIZE } from "../../sim/config/MatchConfig";
import { MAX_SIM_STEPS_PER_FRAME, SIM_TICK_MS } from "../../sim/config/SimulationConfig";
import type { CardDef } from "../../sim/cards/types";
import { MatchSim } from "../../sim/MatchSim";
import { HandView } from "../ui/HandView";

type CatalogJson = { cards: CardDef[] };

export class MatchScene extends Phaser.Scene {
  private sim!: MatchSim;
  private handView!: HandView;
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private simAccumulatorMs = 0;

  constructor() {
    super("MatchScene");
  }

  create() {
    this.sim = MatchSim.createFromCatalogs({
      attackCatalog: attackCards as CatalogJson,
      defenseCatalog: defenseCards as CatalogJson,
      rngSeed: 1337,
    });

    this.pitchGfx = this.add.graphics();
    this.drawPitch();

    this.handView = new HandView(this, 16, 540 - 140, HAND_SIZE, (cardId) => {
      const ok = this.sim.playCard(cardId, { direction: { x: 1, y: 0 } });
      if (!ok) return;
      this.refreshHand();
    });

    this.refreshHand();

    this.add
      .text(16, 16, "P: toggle possession | Click a card to play it", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#eafff6",
      })
      .setShadow(1, 1, "#000", 2);

    this.input.keyboard?.on("keydown-P", () => {
      this.sim.togglePossession();
      this.refreshHand();
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

    const events = this.sim.drainEvents();
    if (events.length > 0) {
      this.refreshHand();
    }
  }

  private refreshHand() {
    this.handView.setCards(this.sim.getActiveHandCardIds());
  }

  private drawPitch() {
    const g = this.pitchGfx;
    g.clear();

    const margin = 24;
    const pitchX = margin;
    const pitchY = 60;
    const pitchW = 960 - margin * 2;
    const pitchH = 540 - 60 - 160;

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

    this.add
      .text(pitchX, pitchY - 22, "Pitch (placeholder)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#eafff6",
      })
      .setAlpha(0.85);
  }
}
