# Step 3 - AI Behavior v2

## Goal

Upgrade AI from "functional" to "tactically legible":

- Anchor + leash positioning
- Cleaner offense/defense state behavior
- Better press, support, and run triggers

## Scope

- Introduce explicit per-player behavior state enum in sim.
- Implement press triangle behavior (presser + cover support).
- Add run trigger throttling (max simultaneous runs, reset windows).
- Strengthen command override priority rules.
- Add debug overlays/toggles for AI diagnostics.

## Implementation focus

- `src/sim/systems/AISystem.ts`
- `src/sim/systems/MovementSystem.ts`
- `src/sim/state/MatchState.ts`
- `src/game/scenes/MatchScene.ts` (debug toggles)
- `tests/sim/systems/aiSystem.test.ts`
- `tests/sim/systems/movementSystem.test.ts`

## Out of scope

- Physics rework
- Visual polish beyond debug readability

## Acceptance criteria

- Team shape is retained under pressure with fewer chaotic collapses.
- Press actions no longer pull whole team out of structure.
- Runs feel purposeful and limited, not random swarming.
- Debug view can show state/anchor/leash information.
