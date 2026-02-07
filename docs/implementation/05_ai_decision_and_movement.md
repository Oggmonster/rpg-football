# Phase 05 - AI Decision + Movement Systems

Goal:
Implement baseline football AI behaviors from TAD pseudocode.

Scope:
- Build movement steering system with stamina + PAC influence.
- Implement defensive roles: marker assignment and zonal anchors.
- Implement attacking support triangles and forward runs.
- Implement ball carrier decision priority:
  1) card intent
  2) shot quality check
  3) safe/progressive pass
  4) carry
- Implement pressure and lane threat scoring.

Deliverables:
- `MovementSystem`, `AISystem`, `PassSystem`, `TackleSystem`, `InterceptSystem`.
- Intent expiry and priority handling.
- Configurable tuning knobs (`passAssist`, `runFrequency`, `tackleAggression`).

Acceptance criteria:
- Players maintain team shape and react to ball side.
- Card intents visibly influence the next actions.
- Pass/tackle/intercept outcomes are statistically plausible.
- Unit tests cover pressure, pass lane, tackle probability logic.
