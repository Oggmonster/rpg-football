# Pocket Gaffer v1 Release Checklist

## Build and Test
- [ ] `npm ci` succeeds on clean machine
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run test` passes in CI
- [ ] Production build opens and runs in browser

## Core Gameplay Validation
- [ ] Match runs full 4 minutes and ends correctly
- [ ] Goal triggers reset window and proper kickoff restart
- [ ] Attack/Defense hand swaps with possession
- [ ] Card cooldowns and lockout behave as expected
- [ ] Deck builder saves legal 15-card attack and defense decks
- [ ] Collection saves exactly 11-player squad and Quick Match uses it
- [ ] Weekly event modifier is shown in main menu and applied in-match
- [ ] Post-match progression overlay appears once and persists profile updates
- [ ] Manager level/xp/coins update correctly after full-time
- [ ] Season points update each match and season rollover behaves safely
- [ ] Promotion/relegation logic only changes division at season rollover

## Performance Validation
- [ ] F3 overlay reports stable 60 FPS on desktop target hardware
- [ ] No obvious frame spikes during goal resets and heavy event bursts
- [ ] Build size warning reviewed and accepted for MVP scope

## Release Artifacts
- [ ] Release notes updated
- [ ] Known limitations documented
- [ ] Deploy runbook verified
