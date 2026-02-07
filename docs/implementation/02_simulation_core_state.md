# Phase 02 - Simulation Core State

Goal:
Establish complete and testable match state structures for teams, players, ball, and intents.

Scope:
- Expand `MatchState` with:
  - score, period/match clock, kickoff state
  - players (7v7 or 8v8), role, stamina, stats
  - ball state container
  - possession metadata
- Add `PlayerState`, `BallState`, `Intent`, `TeamTacticalState`.
- Add state initialization factories and seed-based deterministic setup.

Deliverables:
- Typed state models under `src/sim/state/*`.
- Initial lineup spawn logic.
- Deterministic state snapshot serializer (for debugging/tests).

Acceptance criteria:
- Starting a match produces valid players, ball, score, possession.
- Recreating with same seed yields same initial state.
- Unit tests cover state initialization invariants.
