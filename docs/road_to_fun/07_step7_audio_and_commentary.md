# Step 7 - Audio and Commentary

## Goal

Add reactive sound and lightweight commentary to make matches feel alive (`make_it_fun/n`, `make_it_fun/o`).

## Scope

- Implement SFX bus and event-to-audio mapping:
  - Card select/play/error
  - Pass/shot/tackle/save/goal
  - Momentum up/down cues
- Add basic ambient crowd bed with intensity changes.
- Implement commentary popup queue with trigger dictionary and anti-spam rules.

## Implementation focus

- `src/game/scenes/PreloadScene.ts`
- `src/game/scenes/MatchScene.ts`
- `src/sim/events/SimEvent.ts` (expanded triggers)
- new `src/game/audio/*`
- new `src/game/commentary/*`

## Out of scope

- Voice commentary
- Full music album production

## Acceptance criteria

- Every high-value gameplay event has both visual and audio confirmation.
- Commentary popups are informative, short, and non-spammy.
- Audio mix does not mask tactical UI cues.
