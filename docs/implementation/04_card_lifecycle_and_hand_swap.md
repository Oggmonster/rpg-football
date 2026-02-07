# Phase 04 - Card Lifecycle + Hand Swap

Goal:
Complete the MVP card loop and possession-based hand swapping.

Scope:
- Enforce deck constraints for attack and defense decks (15 cards each).
- Implement context validation for MVP cards:
  - Attack: PASS, THROUGH_PASS, DRIBBLE, RUSH, SHOOT
  - Defense: TACKLE, PRESS, COVER, INTERCEPT
- Execute card intent creation with TTL/cooldown.
- Move played card to bottom, draw replacement.
- Show attack hand when in possession, defense hand when out of possession.
- Optional global lockout hook for anti-spam (0.25s config toggle).

Deliverables:
- `CardResolver` with context + effect dispatch.
- Hand/deck manager handling both decks per team.
- UI hand swap integration with possession events.

Acceptance criteria:
- Hand swaps instantly on possession change.
- Card play rules reject invalid context and respect cooldown.
- Deck cycle is infinite and deterministic for a seed.
- Unit tests cover deck validator and card lifecycle.
