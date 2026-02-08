# Step 2 - Team Commands and Momentum

## Goal

Add tactical swing systems that create match drama:

- Team command cards (macro tactics)
- Momentum bar with gameplay effects

## Scope

- Create a separate team-command deck/pool (limited-use per match).
- Implement at least 5 command cards from `make_it_fun/e`:
  - All Out Attack
  - Park the Bus
  - Fast Counter
  - High Press
  - Slow Build-Up
- Add momentum model and event-driven updates.
- Expose momentum in HUD and apply to:
  - Card cooldown modifiers
  - Pass/shot/tackle probabilities

## Implementation focus

- `src/sim/state/MatchState.ts` (team command + momentum state)
- `src/sim/MatchSim.ts`
- `src/sim/systems/AISystem.ts`
- `src/sim/systems/PassSystem.ts`
- `src/sim/systems/TackleSystem.ts`
- `src/game/ui/Hud.ts`
- `src/data/*` (team command catalog)
- `tests/sim/matchFlow.test.ts`

## Out of scope

- Full progression for team command leveling
- Polished effects/animations

## Acceptance criteria

- Player can equip and activate team commands during match.
- Each command visibly changes team behavior for a duration.
- Momentum moves in both directions and is visible at all times.
- Momentum impacts at least 3 mechanics in a measurable way.
