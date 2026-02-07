# Phase 07 - Render Integration + Animation

Goal:
Map simulation state cleanly to a readable top-down match presentation.

Scope:
- Render player and ball entities from sim state.
- Sync sprite transforms from sim snapshots.
- Add minimal animation states (idle/run/kick/tackle).
- Add simple camera behavior and pixel-safe scaling.
- Improve pitch markings and team visual distinction.

Deliverables:
- Entity view layer (`game/view/*`) bound to sim IDs.
- Sprite atlas/sheet loading pipeline in preload.
- Visual feedback for ball state (in-flight/shot/loose).

Acceptance criteria:
- Match is readable at gameplay speed.
- No desync between visual entities and sim state.
- Stable performance on desktop target (60 FPS typical scene).
