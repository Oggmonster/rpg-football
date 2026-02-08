# Step 8 - Content: Archetypes and Starter Sets

## Goal

Expand football identity and strategic variety through structured content (`make_it_fun/e`, `make_it_fun/l`).

## Scope

- Add first 20 archetypes with role identity and stat caps.
- Expand player collection data model:
  - archetype id
  - trait list
  - perk slots (locked/unlocked placeholder)
  - growth caps
- Implement starter team-command set and onboarding deck presets.
- Update collection/deck builder UI to show archetype and trait data.

## Implementation focus

- `src/data/players.collection.json`
- `src/data/cards.attack.json`
- `src/data/cards.defense.json`
- new `src/data/cards.team_commands.json`
- `src/game/scenes/CollectionScene.ts`
- `src/game/scenes/DeckBuilderScene.ts`
- `src/game/profile/ProfileStore.ts`

## Out of scope

- Full progression unlock economy
- Seasonal reward tables

## Acceptance criteria

- Collection screen supports archetype-level identity, not just raw stats.
- User can build around distinct tactical identities (press, counter, control, etc.).
- Starter content enables multiple viable playstyles.
