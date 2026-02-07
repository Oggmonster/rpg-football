# Phase 06 - Match Rules + Flow

Goal:
Make Quick Match fully playable as a rules-complete MVP loop.

Scope:
- Implement kickoff and restart flow after goals.
- Implement score updates and 4-minute match timer.
- Implement end-of-match state and reset path.
- Implement basic keeper behavior for saves and pickups.
- Handle out-of-play decisions for shots/misses (minimal v1 behavior).

Deliverables:
- Match flow state machine.
- Timer + score integration in sim.
- Goal and restart events exposed to UI.

Acceptance criteria:
- Full match runs from kickoff to final whistle.
- Goals update score and restart correctly.
- No soft-lock state after goal, miss, or contest.
