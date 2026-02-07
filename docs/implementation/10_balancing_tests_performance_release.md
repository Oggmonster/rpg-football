# Phase 10 - Balancing, Tests, Performance, Release

Goal:
Stabilize and tune the MVP for handoff/release readiness.

Scope:
- Expand automated tests (sim rules, card lifecycle, match flow).
- Add deterministic replay/debug logs for issue triage.
- Tune gameplay values for match pacing and card usefulness.
- Profile CPU hotspots and reduce per-tick allocations.
- Add release checklist and deployment setup for browser build.

Deliverables:
- Test suite with meaningful coverage for core sim systems.
- Performance pass for desktop/mobile targets.
- Release notes and known limitations doc.

Acceptance criteria:
- `npm run build` and test suite pass consistently.
- Match pacing feels coherent in 4-minute format.
- No high-severity known bugs in core loop.
- Deployable build artifact and runbook are documented.
