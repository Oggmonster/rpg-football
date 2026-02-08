# Step 5 - HUD UX and Match Presentation

## Goal

Ship the full tactical layout from `make_it_fun/c` so decisions are fast and readable.

## Scope

- Rebuild match HUD layout:
  - Top: score, timer, momentum
  - Bottom: action hand
  - Right: team command panel
- Improve card states:
  - Selected, cooldown, invalid, unavailable-by-context
- Add clear possession and active executor indicators.
- Add optional compact tactical pause overlay (formation/substitutions placeholder).

## Implementation focus

- `src/game/scenes/MatchScene.ts`
- `src/game/ui/Hud.ts`
- `src/game/ui/HandView.ts`
- `src/game/ui/CardView.ts`
- `src/game/ui/ActivePlayerPanel.ts`
- `src/game/ui/DirectionPad.ts` (or replacement)

## Out of scope

- Final art style and sprite polish
- Audio polish

## Acceptance criteria

- Player can always read score/time/possession/momentum.
- Team commands are visible and activatable without obscuring the pitch.
- Directional card targeting requires no keyboard fallback.
- Fewer misplays due to unclear card state.
