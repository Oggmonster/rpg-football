Original prompt: I've attached a video of the current state of the game. Look at the video and come up with suggestions on how to make the game more fun and with improved graphics and gameplay.

2026-03-13

- Reviewed gameplay video and extracted representative frames.
- Main conclusion: the tactical card loop is promising, but the on-pitch payoff is too flat. The biggest gains will come from readability, consequence, pacing, and layered feedback.
- Inspected current implementation seams:
  - `src/game/scenes/MatchScene.ts` owns most tactical-board HUD and presentation.
  - `src/game/drive/DriveMatchEngine.ts` is the current fast loop for attack/defend rounds.
  - `src/game/view/PlayerView.ts` and `src/game/view/BallView.ts` already have lightweight animation/VFX hooks.
  - `src/game/scenes/PreloadScene.ts` currently generates runtime placeholder art, so visual upgrades can ship before a full external asset pipeline.
  - `src/game/audio/AudioBus.ts` and `src/game/commentary/*` exist, so presentation improvements do not need to start from zero.

Implementation plan summary:

1. Match readability and decision clarity first.
2. Resolve actions with stronger visual/audio payoff.
3. Add tactical depth via card synergies, trait-driven outcomes, and higher-drama events.
4. Improve content variety and progression after the core match feels good every turn.

Planned execution order:

- Phase 1: HUD + field readability + targeting previews + action pacing in `MatchScene`.
- Phase 2: stronger VFX, token hierarchy, ball trails, impact states, and camera juice in `PlayerView` / `BallView` / scene glue.
- Phase 3: card combo rules, trait/archetype hooks, second-ball/scramble outcomes, and smarter defensive traps in `DriveMatchEngine`.
- Phase 4: scenario variety, roster identity, and progression/deck rewards using the existing profile / collection / season systems.

TODOs:

- Convert the phase plan into a concrete milestone checklist with acceptance criteria.
- Start implementation with Phase 1 because it offers the largest perceived quality gain for the least systemic risk.

2026-03-13 - Phase 1 implementation

- Implemented Phase 1 presentation/readability pass in `src/game/scenes/CardPrototypeMatchScene.ts`.
- Added clearer turn-state presentation:
  - attack/defend badge in the top bar
  - short tactical detail line for the current state
  - tighter round label formatting
- Added stronger on-pitch readability:
  - active danger-third / box tint based on possession
  - ball-carrier spotlight
  - pass-lane preview lines
  - dribble path preview and destination marker
- Improved hand usability:
  - numeric hotkeys `1/2/3`
  - selected card emphasis
  - non-selected card dimming during selection
- Improved token readability during selection:
  - de-emphasize non-relevant players while targeting
  - keep target rings / chance labels visible
- Tightened pacing:
  - reduced movement tween duration
  - shortened round recovery / result banner timing
- Added `window.render_game_to_text()` for browser automation/state capture.

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `70` tests).
- Browser verification completed with Playwright:
  - confirmed attack/defend badge and prompt changes
  - confirmed dribble selection circle and focused card state
  - noted canvas-only screenshots were black in the supplied client, so full-page Playwright screenshots were used for visual checks instead

Next likely phase:

- Phase 2 should build directly on this scene work: stronger action VFX, better result callouts, punchier ball trails, and richer token hierarchy without changing the match rules yet.

2026-03-13 - Phase 2 implementation

- Implemented a game-feel / VFX pass in `src/game/scenes/CardPrototypeMatchScene.ts`.
- Added stronger action payoff:
  - richer result banner with title + summary
  - color-coded action pulse at the ball
  - contact bursts and impact shard effects
  - brighter multi-layer ball trails for passes, dribbles, and shots
  - goal-mouth flash on shot outcomes
  - light screen flash on major moments
- Improved token hierarchy:
  - pulsing carrier aura behind the ball-holder
  - extra ball-carrier highlight in sprite motion/tint
- Kept the work scoped to presentation only:
  - no match-rule changes
  - reused existing resolution data (`title`, `summary`, `goalScored`, `restart`, movement animations)

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `70` tests).
- Browser verification completed with Playwright full-page screenshots:
  - defense-state result banner visible
  - attack-state carrier aura visible
  - shot setup overlay visible with stronger aiming/readability

Notes:

- The top bar is improved, but it still has limited horizontal space for auxiliary detail text during some states. If Phase 3 keeps adding state context, the next sensible step is a small top-bar layout refactor instead of further squeezing copy.

Next likely phase:

- Phase 3 should focus on tactical depth rather than more presentation polish: combo rules, trait/archetype hooks, rebound/second-ball drama, and better defensive trap outcomes.

2026-03-13 - Follow-up bug fix after Phase 2

- Investigated player feedback that:
  - the highlighted player looked strange
  - after `One-Two`, later passes and shots seemed to keep using the same bent / indirect path
- Diagnosis:
  - no persistent gameplay-state leak was found in `CardFootballEngine`
  - the visual issue came from `src/game/scenes/CardPrototypeMatchScene.ts`
  - all pass trails were being rendered with a forced curve, and all shots used a heavy arc as well, which made ordinary actions look like they were routing through another player
  - the new carrier highlight also used a sprite tint fill that made the active player look washed out
- Fixes implemented in `src/game/scenes/CardPrototypeMatchScene.ts`:
  - added card-specific trail styles instead of a single forced curved path for every pass and shot
  - made short/simple passes (`SHORT_PASS`, `ONE_TWO`, `HOLD_UP_PLAY`) render straight
  - kept stronger arc only for passes that should visually bend more (`CROSS`, `SWITCH_PLAY`, etc.)
  - made `POWER_SHOT` render straight instead of using the same exaggerated arc as every shot
  - changed the carrier highlight from a broad body tint to a subtler ground halo
  - reduced halo size / alpha so the ball carrier reads clearly without looking visually broken

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `70` tests).
- Ran the `develop-web-game` Playwright client again with a no-op action file.
- Browser verification completed with Playwright screenshots:
  - confirmed the start screen still loads
  - confirmed the in-match carrier halo now reads as a floor-level highlight instead of a washed-out sprite
  - confirmed pass selection / pass-target flow still works after the trail-style change

Notes:

- The reported `One-Two` behavior was presentation-driven rather than a rules bug.
- If a later gameplay phase gives `One-Two` a bespoke give-and-go animation, that should be implemented as an explicit per-card sequence rather than by reusing the default pass trail for every action.

2026-03-13 - Kickoff randomness fix

- Investigated report that the player never seemed to win the opening kickoff.
- Root cause:
  - `src/game/scenes/CardPrototypeMatchScene.ts` was always constructing `CardFootballEngine` with `rngSeed: 1337`
  - the engine kickoff selection is already 50/50 when given a varying seed, but the fixed scene seed forced the same opening match state every time
- Fix:
  - added a small `createMatchSeed()` helper in `src/game/scenes/CardPrototypeMatchScene.ts`
  - the prototype scene now creates each new match with a fresh random seed instead of always using `1337`
  - added a regression test in `tests/game/match/cardFootballEngine.test.ts` to verify different seeds can produce both `HOME` and `AWAY` kickoff teams

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `71` tests).
- Browser verification across fresh match loads showed both opening states:
  - `PLAYER_ATTACK / HOME`
  - `PLAYER_DEFENSE / AWAY`

2026-03-13 - Phase 3 implementation (gameplay depth slice)

- Implemented the first Phase 3 rules pass in `src/game/match/CardFootballEngine.ts`.
- Added player identity hooks from the collection data:
  - roster players now carry `archetypeName` and `traits`
  - pitch player views expose those fields so the scene can surface them
- Added lightweight combo chaining:
  - the engine now tracks the previous successful attack card inside a live round
  - follow-up cards get situational bonuses for natural sequences such as:
    - `OVERLAP_RUN -> CROSS`
    - `THREAD_PASS/THROUGH_BALL -> SHOT`
    - `ONE_TWO/HOLD_UP_PLAY -> SHOT`
    - dribble move -> shot
- Added archetype / trait-driven match effects:
  - creative passers improve threaded / link-up passing
  - runners and wide threats improve release timing on vertical passes
  - press-resistant / speed / inside-cut traits improve dribble resolution
  - poacher / shadow-striker / target-man style finishers improve shots
  - shot-stopper / sweeper-keeper profiles reduce goal and spill odds
- Added smarter defensive trap behavior:
  - `PRESS_TRAP` can explicitly spring an interception lane
  - `TRACK_RUNNER` squeezes direct / runner-focused passes more aggressively
  - `DOUBLE_TEAM` / `DOUBLE_PRESS` create wider clean-tackle windows on dribbles
  - trap outcomes now produce distinct titles / commentary instead of only hidden stat shifts
- Added visibility for player identity in `src/game/scenes/CardPrototypeMatchScene.ts`:
  - tooltip now shows archetype + up to two traits
  - tooltip panel height / wrap adjusted to fit the new information

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `74` tests).
- Added targeted regression tests in `tests/game/match/cardFootballEngine.test.ts` for:
  - combo context
  - pass trait context
  - pass / dribble trap context
- Browser verification completed with Playwright:
  - confirmed in-match tooltip shows archetype and traits
  - confirmed several live turns play through without browser/runtime issues after the deeper engine changes

Notes:

- This is the first gameplay-depth slice, not the full Phase 3 scope.
- Rebounds / second-ball drama already existed in the engine, so this pass focused on the gaps that were still shallow: identity, chaining, and trap distinction.
- The next sensible follow-up is to make combo / trait effects more legible in the HUD itself, not just in commentary and tooltips.

2026-03-13 - Phase 3 HUD surfacing pass

- Implemented a visibility pass for the new gameplay-depth systems in `src/game/scenes/CardPrototypeMatchScene.ts` and `src/game/match/CardFootballEngine.ts`.
- Added engine-facing HUD data:
  - `MatchStateView.combo` now exposes the live combo chain with last-card name
  - `CardFootballEngine.getComboPreview()` exposes follow-up combo bonuses for candidate cards
  - `ActionResolutionView.insights` now carries explicit `combo`, `trait`, and `trap` metadata instead of forcing the scene to infer them from commentary copy
- Added in-match HUD surfacing:
  - hand cards now show short readiness tags such as combo bonuses, trait-fit tags, or trap tags
  - top-bar detail now reflects active combo rhythm, selected combo payoff, or trap readiness, with truncation to avoid pressure-bar overlap
  - player tooltip now renders trait pills instead of burying traits in a single text line
  - result banner now renders insight tags (for example `TRAIT FIT`) from resolution metadata
  - `render_game_to_text()` now includes live combo state and last-resolution insight data for browser automation
- Added regression coverage in `tests/game/match/cardFootballEngine.test.ts`:
  - verified active combo state is exposed to the HUD with a matching combo preview

Validation:

- `npm run build` passed.
- `npm run test` passed (`16` files, `75` tests).
- Ran the `develop-web-game` Playwright client again with the no-op action payload.
- Browser verification completed with Playwright screenshots:
  - `.codex-temp/phase3-hud-defense.png` confirmed hand-card trait tags
  - `.codex-temp/phase3-hud-defense-tooltip.png` confirmed tooltip trait pills
  - `.codex-temp/phase3-hud-final-match.png` confirmed top-bar truncation and selected-card HUD state
  - `.codex-temp/phase3-hud-result-banner.png` confirmed live result-banner insight tags

Notes:

- The top bar still has limited room for long tactical copy; short labels work well, but richer explanations should stay in the bottom panels, commentary, or tooltip layer.
