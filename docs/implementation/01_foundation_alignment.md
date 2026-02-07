# Phase 01 - Foundation Alignment

Goal:
Align the current bootstrap with GDD/TAD conventions so future systems plug in cleanly.

Scope:
- Normalize project structure to match TAD sections.
- Add clear sim/game boundaries (no sim logic in Phaser scene files).
- Add shared constants and config for match timing, team size, tuning knobs.
- Add typed event channel from sim -> UI (minimal event model).
- Add fixed timestep loop wrapper in MatchScene (accumulator, 60 Hz sim tick).

Deliverables:
- `src/sim/config/*` for tuning constants.
- `src/sim/events/*` for emitted sim events.
- MatchScene uses fixed-step update and render interpolation placeholder.
- Remove leftover Vite demo artifacts not used by game.

Acceptance criteria:
- `npm run build` passes.
- Sim step rate is stable at 60 Hz regardless of render FPS.
- No direct gameplay mutation outside sim layer.
