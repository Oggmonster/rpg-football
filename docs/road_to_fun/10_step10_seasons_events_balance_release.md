# Step 10 - Seasons, Events, Balance, Release

## Goal

Convert the upgraded game into a repeatable long-term loop with stable quality (`make_it_fun/d`, `make_it_fun/f`).

## Scope

- Add division/season structure with reset-safe rules.
- Add event modifiers (weekly tactical focus modes).
- Add balancing pass across cards, momentum, AI, and rewards.
- Extend automated coverage for new systems.
- Final performance and deployability hardening.

## Implementation focus

- new `src/game/seasons/*`
- new `src/game/events/*`
- `src/sim/config/TuningConfig.ts`
- `tests/sim/*` (expanded)
- `docs/release/*` updates

## Out of scope

- Network multiplayer
- Full monetization model

## Acceptance criteria

- Season loop can run end-to-end with persistent profile safety.
- Event mode changes gameplay in testable ways without hard forks.
- Build + tests are stable; no known high-severity gameplay blockers.

## Completion checkpoint

When this step exits, the project should satisfy the main `make_it_fun` target:

- Fun command loop
- Tactical variety
- Strong match presentation
- RPG progression and replay motivation
