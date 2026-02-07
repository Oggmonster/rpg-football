# Phase 08 - HUD + Input + Feedback

Goal:
Complete tactical UX for card play clarity and match readability.

Scope:
- Build HUD elements: timer, score, possession indicator.
- Implement direction pad for directional cards.
- Card feedback states: hover, disabled, cooldown, selected.
- Add contextual prompts and short event toasts.
- Add optional accessibility toggles (reduced motion, larger card text).

Deliverables:
- `Hud` and `DirectionPad` functional implementations.
- Card interaction state machine in UI.
- Sim event -> UI feedback wiring.

Acceptance criteria:
- Users can reliably choose and target cards quickly.
- Cooldown and invalid actions are clearly communicated.
- Match state (time/score/possession) is always visible.
