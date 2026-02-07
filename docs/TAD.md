# Technical Architecture Document (TAD)
## Pocket Gaffer – Browser Edition
## Engine: Phaser 3 + TypeScript

---

# 1. OVERVIEW
Pocket Gaffer uses a hybrid architecture:

1. **Simulation Layer (Pure TS):**
   - Match state  
   - Ball physics  
   - AI movement  
   - Card resolution  
   - Deck/hand systems  

2. **Phaser Rendering Layer:**
   - Field  
   - Sprites  
   - UI (hand, cards, direction pad)  
   - Input  

This separation ensures deterministic-ish behavior and testability.

---

# 2. PROJECT STRUCTURE

src/
main.ts
game/
GameConfig.ts
scenes/
ui/
sim/
MatchSim.ts
systems/
state/
cards/
math/
data/
docs/
GDD.md
TAD.md
AI_Pseudocode.md
Card_Behaviors.md
Ball_State_Machine.md


---

# 3. PHASER CONFIG

```ts
export const gameConfig = {
  type: Phaser.AUTO,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT },
  scene: [BootScene, PreloadScene, MatchScene]
}

Camera uses integer scaling and no smoothing.

4. SIMULATION LAYER
Key responsibilities

Player movement

Ball state machine

Card resolution

Cooldowns

Possession logic

MatchSim responsibilities:

step(dt) handles fixed-timestep logic

Delegates to systems:

MovementSystem

PassSystem

TackleSystem

InterceptSystem

BallSystem

CooldownSystem

State objects:

MatchState

TeamState

PlayerState

BallState

Intent

5. CARD ARCHITECTURE
CardCatalog

Loads card definitions via JSON.

DeckState
draw: string[]

HandState
cards: string[]

CardResolver

Validates + executes card intents.

6. POSSESSION & HAND SWAP

If your team has the ball → Attack Hand visible

If opponent has ball → Defense Hand visible

Instant swap when possession changes

Short global lockout optional

7. AI SYSTEMS (see AI_Pseudocode.md)

Attack support

Pressure & marking

Run generation

Ball carrier decisions

Safe/progressive passes

Simulation runs at fixed timestep (60 Hz).

8. BALL SYSTEM

(See Ball_State_Machine.md)

Carried

In flight

Shot

Loose

Contest

Goal

Out of play (later)

9. TESTABILITY

Simulation is pure TS → unit tests with Vitest:

Pass success

Tackle success

Intercept lanes

Deck validation

Possession detection

10. PERFORMANCE TARGET

60 FPS desktop

30–60 FPS mobile

≤ 100 entities active

11. FUTURE TECH FEATURES

Replay logs

Async PvP (seed + action stream)

Performance metrics overlays


---

# 📄 **docs/AI_Pseudocode.md**

```markdown
# AI Logic Pseudocode
## Pocket Gaffer – v1

---

# 0. DATA STRUCTURES

### Player
- id  
- teamId  
- role  
- position  
- velocity  
- stamina  
- stats  
- intent?  
- markTarget?  

### Ball
- pos  
- vel  
- carrierId?  
- lastTouchTeam  
- state (CARRIED / IN_FLIGHT / SHOT / LOOSE / CONTEST / GOAL)  

### Intent
- type  
- direction?  
- targetPlayerId?  
- targetPos?  
- expiresAt  
- priority  

---

# 1. SIM LOOP (Fixed 60Hz)

```pseudo
SIM_STEP(dt):
    updateCooldowns()
    updateStamina()
    updatePossession()
    decideRolesAndMarks()
    decideBallCarrierAction()
    decideOffBallMovement()
    applySteeringMovement()
    updateBallPhysics()
    emitEventsToUI()


2. DEFENSIVE AI (Marking + Shape)
Mark top 1–2 threats
assignRolesAndMarks():
    threats = opponents sorted by danger
    defenders = our defenders + mids

    for each top threat:
        marker = closest defender
        marker.intent = MARK_TARGET(threat)

Zonal shape

Others move to formation anchors adjusted for ball position.

3. ATTACK AI (Support + Runs)
decideOffBallMovement():
    if ATTACK:
        if striker:
            if space behind line: make run
            else: support triangle
        if mid: support triangle
        if def: hold anchor
    else: (DEFENSE)
        if marker: goal-side marking
        else: zone anchor

4. BALL CARRIER DECISIONS

Priority:

Card Intent

Shot if high quality

Under pressure → safe pass

Build-up → progressive pass or carry

decideBallCarrierAction():
    if cardIntent: resolve
    if good shot: shoot
    if pressure high:
        if safe pass exists: pass
        else dribble escape
    else if progressive pass exists: pass
    else carry

5. PRESSURE, SHOT QUALITY, PASS DECISIONS
Pressure
pressure = sum(distance-based threat of defenders)

Shot quality

Combines:

distance

angle

laneClear

SHO stat

Pass selection

Safe pass (low lane threat)

Progressive pass (toward goal)

6. INTENT RESOLUTION
PASS_TO_TARGET
PASS_TO_DIRECTION
THROUGH_TO_DIRECTION
SHOOT_TO_DIRECTION
DRIBBLE_TO_DIRECTION
TACKLE_TARGET
PRESS_ZONE
COVER_ZONE
INTERCEPT_LANE

Each modifies intent or triggers direct action.

7. MOVEMENT SYSTEM
applySteering():
    for each player:
        desired = intentTarget or formationAnchor
        velocity = approach(desired, PAC, stamina)
        pos += velocity * dt

8. TACKLE & INTERCEPT MODELS
Tackle

Success = DEF/PHY vs DRI/PAC

Intercept

Determined by distance to pass line and DEF stat.

9. FUN TUNING KNOBS

passAssist

runFrequency

interceptRadius

tackleAggression

light “biases” to avoid perfect AI


---

# 📄 **docs/Card_Behaviors.md**

```markdown
# Pocket Gaffer – Card Behaviors (v1)

---

# 1. CARD LIFECYCLE

- Player clicks a card
- Validate context
- Set an Intent on correct player(s)
- Put card on cooldown
- Move to bottom of deck
- Draw 1 new card

---

# 2. ATTACK CARDS

## PASS
- Intent: PASS_TO_TARGET or PASS_TO_DIRECTION  
- TTL: 800ms  
- Context: carrier has ball  
- Outcome: ball enters IN_FLIGHT  

## THROUGH PASS
- Intent: THROUGH_TO_DIRECTION  
- TTL: 900ms  
- Context: must have viable runner  
- Outcome: ball to lead space  

## DRIBBLE
- Intent: DRIBBLE_TO_DIRECTION  
- TTL: 600ms  
- Burst speed, tackle resistance  

## RUSH
- Intent: CARRY_BURST  
- TTL: 900ms  
- Higher top speed, lower control  

## SHOOT
- Intent: SHOOT_TO_DIRECTION  
- TTL: 500ms  
- Outcome: SHOT → goal/blocked/saved/gone wide

---

# 3. DEFENSE CARDS

## TACKLE
- Intent: TACKLE_TARGET  
- TTL: 600ms  
- Closest defender attempts tackle  

## PRESS
- Team modifier: PRESS_BURST  
- TTL: 1200ms  
- Nearest players press harder  

## COVER
- Intent: COVER_ZONE  
- TTL: 1500ms  
- Defensive line drops, shape tightens  

## INTERCEPT
- Intent: INTERCEPT_LANE  
- TTL: 1200ms  
- 1–2 defenders occupy passing lane  

---

# 4. OPTIONAL CARDS (Post-v1)
- CROSS  
- LONG BALL  
- MARK  
- BLOCK  
- DOUBLE TEAM  
- RUSH KEEPER  

---