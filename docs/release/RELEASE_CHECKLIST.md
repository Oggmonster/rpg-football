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
- [ ] Collection saves exactly 7-player squad and Quick Match uses it

## Performance Validation
- [ ] F3 overlay reports stable 60 FPS on desktop target hardware
- [ ] No obvious frame spikes during goal resets and heavy event bursts
- [ ] Build size warning reviewed and accepted for MVP scope

## Release Artifacts
- [ ] Release notes updated
- [ ] Known limitations documented
- [ ] Deploy runbook verified
