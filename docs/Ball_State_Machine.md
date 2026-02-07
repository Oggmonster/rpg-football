# Pocket Gaffer – Ball State Machine (v1)

---

# 1. STATES

- KICKOFF  
- CARRIED  
- IN_FLIGHT  
- SHOT  
- LOOSE  
- CONTROL_CONTEST  
- GOAL  
- OUT_OF_PLAY (optional v1)

---

# 2. TRANSITIONS

## Carried
CARRIED → PASS → IN_FLIGHT  
CARRIED → SHOOT → SHOT  
CARRIED → TACKLE → CARRIED (other team)  
CARRIED → Miscontrol → LOOSE  

## In Flight
IN_FLIGHT → Receiver → CARRIED  
IN_FLIGHT → Interception → CARRIED (defender)  
IN_FLIGHT → No control → LOOSE  

## Shot
SHOT → Goal → GOAL  
SHOT → Save/Block → LOOSE or CARRIED(GK)  
SHOT → Miss → OUT_OF_PLAY or LOOSE  

## Loose
LOOSE → Pickup → CARRIED  
LOOSE → Scramble → CONTROL_CONTEST  
CONTROL_CONTEST → Winner → CARRIED  
CONTROL_CONTEST → Scramble fail → LOOSE  

---

# 3. POSSESSION MODEL

- CARRIED → possession = carrier team  
- IN_FLIGHT → possession = lastTouchTeam  
- LOOSE → possession = lastTouchTeam  
- CONTROL_CONTEST → possession = neutral (UI may keep lastTouchTeam)

---

# 4. PHYSICS OUTLINES

### CARRIED
Ball follows carrier with small offset.

### IN_FLIGHT
Ball moves toward targetPos; interception checks run every step.

### SHOT
Higher speed; checks goal line, GK, blocks.

### LOOSE
Velocity decays with friction; players can contest pickup.

---

# 5. INTERCEPT & BLOCK LOGIC

### Interception
- distance-to-segment < interceptRadius  
- defender DEF stat boosts chance  

### Block
- defender between shooter and goal  
- DEF/PHY influences block chance  

---

# 6. TACKLE LOGIC
Success = weighted DEF + PHY + proximity  
Fail = overcommit penalty for tackler  

---

# 7. TUNING

- interceptRadius  
- pickupRadius  
- arriveThreshold  
- shotSpeed  
- passSpeed  
- scrambleChance  
- goalLineTolerance  

---
