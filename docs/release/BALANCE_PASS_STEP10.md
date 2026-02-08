# Step 10 Balance Pass Notes

## Goals
- Stabilize command readability while preserving tactical variety.
- Ensure weekly event modifiers create meaningful but bounded gameplay shifts.
- Keep reward pacing aligned with progression step thresholds.

## Gameplay Tuning Applied
- Added event gameplay modifiers to match simulation:
  - cooldown multiplier
  - momentum multiplier
  - pass / shot / dribble success bonuses
- Event rotation is weekly-by-match-block (5 matches per week, 20 matches per season).

## Economy and Progression Tuning Applied
- Match rewards now scale by active weekly event modifiers.
- Manager season/division progression is reset-safe:
  - season rollover every 20 matches
  - promotion/relegation only evaluated on rollover
- Post-match summary surfaces reward and progression deltas in one screen.

## Validation Targets
- Event-modified matches should still complete within normal timing and no deadlocks.
- Promotion/relegation should never happen mid-season.
- Progression writes should be idempotent per completed match (single apply at full-time).
