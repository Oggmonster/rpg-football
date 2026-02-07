# Phase 09 - Deck Builder + Player Collection

Goal:
Ship the remaining GDD MVP meta features outside match gameplay.

Scope:
- Implement deck builder with constraints validation.
- Implement simple player collection screen and roster selection.
- Persist decks/roster locally (localStorage for v1).
- Add navigation shell between Quick Match, Deck Builder, Collection.

Deliverables:
- Deck builder UI with validation errors and save flow.
- Collection UI with player cards and selected squad.
- Load selected deck + squad into Quick Match.

Acceptance criteria:
- User can create a legal 15-card attack and defense deck.
- Saved deck persists across reload.
- Quick Match uses saved deck configuration.
