import Phaser from "phaser";

const DIRECTIONS = [
  { label: "N", x: 0, y: -1 },
  { label: "E", x: 1, y: 0 },
  { label: "S", x: 0, y: 1 },
  { label: "W", x: -1, y: 0 },
] as const;

export class DirectionPad extends Phaser.GameObjects.Container {
  private buttons: Phaser.GameObjects.Container[] = [];
  private selectedIndex = 1;
  private onDirection: (dir: { x: number; y: number }) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onDirection: (dir: { x: number; y: number }) => void
  ) {
    super(scene, x, y);
    this.onDirection = onDirection;
    scene.add.existing(this);
    this.build();
    this.emitDirection();
  }

  getDirection() {
    const d = DIRECTIONS[this.selectedIndex];
    return { x: d.x, y: d.y };
  }

  private build() {
    const title = this.scene.add.text(0, -38, "Direction", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#eafff6",
    });
    this.add(title);

    const size = 28;
    const gap = 6;
    const positions = [
      { x: size + gap, y: 0 },
      { x: size * 2 + gap * 2, y: size + gap },
      { x: size + gap, y: size * 2 + gap * 2 },
      { x: 0, y: size + gap },
    ];

    DIRECTIONS.forEach((dir, i) => {
      const cell = this.scene.add.container(positions[i].x, positions[i].y);
      const bg = this.scene.add
        .rectangle(0, 0, size, size, 0x0f2a20, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0xb7ffe3, 0.8);
      const label = this.scene.add
        .text(size / 2, size / 2, dir.label, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#eafff6",
        })
        .setOrigin(0.5, 0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        this.selectedIndex = i;
        this.refreshStyles();
        this.emitDirection();
      });

      cell.add([bg, label]);
      this.buttons.push(cell);
      this.add(cell);
    });

    this.refreshStyles();
  }

  private emitDirection() {
    this.onDirection(this.getDirection());
  }

  private refreshStyles() {
    this.buttons.forEach((btn, i) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      if (i === this.selectedIndex) {
        bg.setFillStyle(0x2f7e5d, 1);
        bg.setStrokeStyle(2, 0xeafff6, 1);
      } else {
        bg.setFillStyle(0x0f2a20, 1);
        bg.setStrokeStyle(1, 0xb7ffe3, 0.8);
      }
    });
  }
}
