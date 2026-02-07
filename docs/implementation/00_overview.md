# Pocket Gaffer Implementation Plan

Current status (as of this plan):
- Vite + TypeScript + Phaser bootstrap is running.
- Basic scene flow exists (Boot -> Preload -> Match).
- Placeholder pitch and card hand UI are visible.
- Basic deck cycling and cooldown scaffolding exists.

Execution order:
1. Phase 01 - Foundation Alignment
2. Phase 02 - Simulation Core State
3. Phase 03 - Ball State Machine + Possession
4. Phase 04 - Card Lifecycle + Hand Swap
5. Phase 05 - AI Decision + Movement Systems
6. Phase 06 - Match Rules + Flow
7. Phase 07 - Render Integration + Animation
8. Phase 08 - HUD + Input + Feedback
9. Phase 09 - Deck Builder + Player Collection
10. Phase 10 - Balancing, Tests, Performance, Release

Working method:
- Complete phases in order.
- Each phase ends with explicit acceptance criteria.
- Do not start the next phase until current acceptance checks pass.
