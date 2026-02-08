# Step 6 - Animation and VFX

## Goal

Add the game-feel layer defined in `make_it_fun/j` and `make_it_fun/k`.

## Scope

- Introduce first real sprite/animation asset pipeline.
- Add core animation states:
  - Idle, run, kick, tackle, save
- Add card/HUD animations:
  - Draw, select, execute, cooldown-ready, invalid
- Add pitch VFX:
  - Pass trails, shot bursts, tackle impact, command activation overlays

## Implementation focus

- `src/game/scenes/PreloadScene.ts`
- `src/game/view/PlayerView.ts`
- `src/game/view/BallView.ts`
- `src/game/view/MatchView.ts`
- `src/game/ui/CardView.ts`
- new asset folders under `src/game/assets/*` (or `public/assets/*`)

## Out of scope

- Full art bible completion for all future content
- Audio implementation

## Acceptance criteria

- Actions have immediate visual feedback and are distinguishable at gameplay speed.
- Player and ball readability improves over placeholder rectangles.
- No FPS regression beyond agreed budget under normal match load.
