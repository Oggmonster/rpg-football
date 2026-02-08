# Current State vs Make It Fun

## Summary

The project already has a solid MVP simulation base:

- Deterministic sim loop and tests
- Core ball state machine and possession
- Attack/defense card decks with cooldown cycling
- Basic AI, movement, tackles, and restarts
- Playable match scene plus deck builder and collection screens

Main gap: the game is mechanically functional but lacks the "fun layer" from `make_it_fun`: tactical swings, expressive presentation, progression depth, and emotional feedback.

## Status legend

- `Done`: implemented and usable now
- `Partial`: implemented at MVP level, needs expansion/rework
- `Missing`: not implemented yet

## Mapping matrix

| Make-it-fun doc | Current status | Notes | Road step |
| --- | --- | --- | --- |
| `a. match_flow_design_document.md` | Partial | Match loop exists, but no halftime adjustments, no rich momentum story, no tactical phase drama | 1, 2, 4 |
| `b. player_card_system.md` | Partial | Basic player stats exist; no growth caps, perks, trait unlock path | 8, 9 |
| `c. full ui mockup and screen layout design.md` | Partial | Minimal HUD/hand UI exists; no full layout, no directional UX, no tactical panel | 5 |
| `d. full proression system.md` | Missing | No XP, leveling, manager level, facilities, season rank | 9, 10 |
| `e. Starter deck design and team command cards.md` | Partial | Action card decks exist; team command card system is missing | 2, 8 |
| `f. complete game loop diagram.md` | Partial | Match loop exists; long-term loop/economy loop missing | 9, 10 |
| `g. fully-playable-prototype.md` | Partial | Prototype is playable; needs higher-control card targeting and better feedback | 1, 5 |
| `h. AI Behavior Deep Dive.md` | Partial | Intent-based AI exists; no explicit full state machine, press triangle, run trigger controls | 3 |
| `i. match engine pseudo-code.md` | Partial | Core engine mostly aligned, but lacks momentum/tactical overlays/full command pipeline | 1, 2, 3 |
| `j. The Full Art Bible.md` | Missing | Placeholder primitives only; no sprite pipeline/palette/style lock | 6 |
| `k. Card & HUD Animation Guide.md` | Partial | Small card pulses exist; no full animation language | 6 |
| `l. The First 20 Player Archetypes.md` | Missing | Current collection has 12 generic players, no archetype identity system | 8 |
| `m. Pitch Physics & Collision Spec.md` | Partial | Ball and tackle logic exist; collision model and passing/tackle volumes need refinement | 4 |
| `n. Sound Design Guide.md` | Missing | No game audio pipeline in scenes yet | 7 |
| `o. match commentary flows.md` | Partial | Basic feedback text exists; no trigger-driven commentary dictionary/queue | 7 |

## Code-level baseline notes

- Strongest current systems:
  - `src/sim/MatchSim.ts`
  - `src/sim/systems/BallSystem.ts`
  - `src/sim/systems/AISystem.ts`
  - `src/sim/systems/MovementSystem.ts`
  - `tests/sim/*` (33 passing tests)
- Underused or not integrated yet:
  - `src/game/ui/DirectionPad.ts` (present but not used in match scene)
- Major missing pillars:
  - Team command cards
  - Momentum system
  - Audio/commentary pipeline
  - Art/animation/VFX production pipeline
  - Progression/economy/seasons
