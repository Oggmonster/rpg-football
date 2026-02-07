import Phaser from "phaser";
import type { MatchState } from "../../sim/state/MatchState";
import { BallView } from "./BallView";
import { PlayerView } from "./PlayerView";

export class MatchView {
  private scene: Phaser.Scene;
  private players = new Map<string, PlayerView>();
  private ball: BallView;

  constructor(scene: Phaser.Scene, initialState: MatchState) {
    this.scene = scene;

    for (const p of Object.values(initialState.players)) {
      this.players.set(p.id, new PlayerView(scene, p));
    }

    this.ball = new BallView(scene, initialState.ball.pos.x, initialState.ball.pos.y);
  }

  destroy() {
    for (const view of this.players.values()) {
      view.destroy();
    }
    this.players.clear();
    this.ball.destroy();
  }

  render(state: MatchState, alpha: number) {
    for (const p of Object.values(state.players)) {
      const view = this.players.get(p.id);
      if (view) {
        view.update(p, alpha, state.ball.carrierId === p.id);
      } else {
        this.players.set(p.id, new PlayerView(this.scene, p));
      }
    }

    this.ball.update(state.ball);
  }
}
