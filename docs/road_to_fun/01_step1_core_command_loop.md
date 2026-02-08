# Step 1 - Core Command Loop

## Goal

Make the core match interaction immediately more fun and readable:

- Better command responsiveness
- Directional targeting for relevant cards
- Clear intent/result feedback per action

## Why this is first

Most `make_it_fun` outcomes depend on better match feel before adding more systems.

## Scope

- Integrate directional input into `MatchScene` card play flow.
- Use command payloads in `MatchSim.playCard(...)` (currently ignored).
- Add card-specific success/failure feedback events.
- Tighten cooldown pacing for fast decision cadence.

## Implementation focus

- `src/game/scenes/MatchScene.ts`
- `src/game/ui/DirectionPad.ts` (or replacement aiming UI)
- `src/sim/cards/CardResolver.ts`
- `src/sim/MatchSim.ts`
- `src/sim/events/SimEvent.ts`
- `tests/sim/matchSim.cards.test.ts`

## Out of scope

- Team command cards
- Momentum
- New art/audio

## Acceptance criteria

- Pass, shoot, through, and cross consume direction/target input.
- Invalid contexts return clear, player-facing reason.
- Player can issue 5+ actions in 10 seconds without UI confusion.
- New and existing sim tests pass.
