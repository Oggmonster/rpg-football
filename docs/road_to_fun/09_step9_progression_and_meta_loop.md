# Step 9 - Progression and Meta Loop

## Goal

Implement the RPG growth loop that keeps matches meaningful (`make_it_fun/b`, `make_it_fun/d`, `make_it_fun/f`).

## Scope

- Add match rewards and post-match summary pipeline.
- Add player XP and leveling with stat cap constraints.
- Add trait/perk unlock milestones.
- Add manager progression with feature unlocks.
- Persist progression state in profile storage.

## Implementation focus

- `src/sim/MatchSim.ts` (performance events/stat extraction)
- `src/game/profile/ProfileStore.ts`
- new `src/game/progression/*`
- `src/game/scenes/MatchScene.ts` (result screen transition)
- `src/game/scenes/MainMenuScene.ts` (manager level summary)

## Out of scope

- Full facilities and construction timers
- Full live-service operations

## Acceptance criteria

- Completing matches yields persistent progression changes.
- Player growth respects role identity and hard caps.
- Deck/squad tuning decisions become meaningfully better over time.
