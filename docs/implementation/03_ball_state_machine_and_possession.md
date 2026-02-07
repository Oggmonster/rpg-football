# Phase 03 - Ball State Machine + Possession

Goal:
Implement the ball lifecycle and possession semantics from `Ball_State_Machine.md`.

Scope:
- Implement states: KICKOFF, CARRIED, IN_FLIGHT, SHOT, LOOSE, CONTROL_CONTEST, GOAL.
- Implement transitions and guards.
- Implement pass/shot/loose physics updates and friction.
- Implement possession rules by ball state.
- Emit transition events for UI and debugging.

Deliverables:
- `BallSystem` with transition table and update logic.
- Possession resolver integrated with state.
- Tuning values for pass speed, shot speed, intercept radius, pickup radius.

Acceptance criteria:
- Transition graph behavior matches design doc.
- Possession switches correctly across carried/in-flight/loose/contest.
- Unit tests validate key transition paths and invalid transitions.
