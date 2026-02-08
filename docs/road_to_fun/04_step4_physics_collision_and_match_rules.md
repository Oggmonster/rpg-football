# Step 4 - Physics, Collisions, and Match Rules

## Goal

Make on-pitch outcomes feel fair, predictable, and story-rich:

- Cleaner ball interactions
- Better tackle and interception volumes
- More complete match flow rules

## Scope

- Refine ball friction/speed curves for pass vs shot readability.
- Implement pass/through/shot cone evaluation for interception risk.
- Add tackle arc/box checks rather than pure distance checks.
- Improve goalkeeper zone logic and save/rush behavior.
- Expand match flow with halftime and basic foul handling.

## Implementation focus

- `src/sim/systems/BallSystem.ts`
- `src/sim/systems/PassSystem.ts`
- `src/sim/systems/TackleSystem.ts`
- `src/sim/MatchSim.ts`
- `src/sim/config/TuningConfig.ts`
- `tests/sim/systems/ballSystem.test.ts`
- `tests/sim/systems/tackleSystem.test.ts`
- `tests/sim/matchFlow.test.ts`

## Out of scope

- Replay/cinematic camera
- Full referee simulation

## Acceptance criteria

- Passing and shooting lanes produce believable interception variance.
- Tackle outcomes reflect angle/range, not only proximity.
- GK behavior is more consistent in-box.
- Match handles halftime and restart states without soft locks.
