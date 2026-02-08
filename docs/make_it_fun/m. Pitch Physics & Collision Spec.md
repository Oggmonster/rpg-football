Great — here is **Option M: Pitch Physics & Collision Spec**.
This defines how the **ball**, **players**, **pitch**, **zones**, **collisions**, and **interaction volumes** behave in your football–RPG–card–tactics match engine.

I’ll include **one image group** to anchor the style of top-down football spatial layouts.

![Image](https://images.openai.com/static-rsc-3/cvcpEBFihAmjjk0p2SH5z27e9ReS0Q4KCpIRPJ1m6kS7YnocWSbVrvWHzJscEGV5G6HSo84LvQ4KSgmn0J4qOG5ULzYRp0Sf_d0zCdSC4YE?purpose=fullsize\&v=1)

![Image](https://img.itch.zone/aW1nLzE2NTE5OTUzLnBuZw%3D%3D/original/r7p11O.png)

![Image](https://images.openai.com/static-rsc-3/kw9ckWxMBWWiKSOP2tLT5Lc_k7idpmTfFoAcP0iQyVC6S8ONiFo7rTd88sjGFF0cnbufM22yciW_DOLinHcTMo-AWVNzRQEcjDJ7N-P_dUw?purpose=fullsize\&v=1)

---

# 🅜 — **PITCH PHYSICS & COLLISION SPEC**

### *“Tight, readable, predictable physics that feel tactical, not chaotic.”*

Your game does **not** require realistic physics — it needs **clean, controllable, fair interactions** that support a card-driven tactical loop.

This spec gives you a *complete physics model* for a top-down, pixel-style football match engine.

---

# ⭐ 1. Pitch Coordinate System

### **1. Global Coordinate Grid**

* Origin `(0,0)` = top-left corner
* X grows right
* Y grows downward
* Resolution: **640×360** (or equivalent scaling)
* Internally use float precision

```
  (0,0) ------------------ (640,0)
     |                      |
     |      PITCH           |
     |                      |
 (0,360) ---------------- (640,360)
```

### **2. Playable Field Bounds**

Recommended internal pitch rectangle:

```
Left:   40 px
Right:  600 px
Top:    20 px
Bottom: 340 px
```

This gives space for UI & margin breathing room.

---

# ⭐ 2. Ball Physics Model

The ball uses **simple but expressive** 2D physics.

## **2.1 Ball Properties**

```
radius = 3 px
mass = lightweight (pure velocity model)
baseFriction = 0.82–0.88 per second
bounceFactor = -0.35 (so bounces are small)
```

## **2.2 Ball State Machine**

1. **Attached** to a player (hasBall = true)
2. **Free-moving** (after pass, shot, tackle, deflection)
3. **Loose** (no ownership but moving slowly)

## **2.3 Ball Movement Equation**

```
pos += vel * dt
vel *= (1 - friction * dt)
if |vel| < threshold → vel = 0
```

### Cropping Free Speed

Clamp max free-ball speed so it never outruns players too wildly:

```
vel = ClampMagnitude(vel, maxBallSpeed)
```

Recommended:

* Normal pass: 180–220 px/s
* Shot: 240–300 px/s

---

# ⭐ 3. Player Collision Model

### **3.1 Player Collision Capsule**

Player collision radius: **8–10 px**

You can treat players as circular bodies for simplicity.

### **3.2 Player ↔ Player Collision**

Very light “avoidance push” system:

```
if dist < (r1 + r2):
   overlap = (r1+r2 - dist)
   push players apart by overlap/2 along direction vector
```

Smooth, deterministic, avoids physics chaos.

### **3.3 Player ↔ Ball Collision**

Only matters when **ball is free**:

```
if freeBall AND dist < (player.radius + ball.radius):
    ball.vel += normalize(ball.pos - player.pos) * bumpForce
```

This creates soft, readable deflections.

---

# ⭐ 4. Possession & Pickup Logic

### **4.1 Possession Priority**

When the ball is near multiple players:

1. **Ball carrier intent lock** (if he just kicked)
2. **Closest player inside pickup radius**
3. **If tie:**

   * The player in front of the ball wins
   * If still tie → random 50/50

### **4.2 Pickup Radius**

```
pickupRadius = player.radius + ball.radius + 2 px
```

### **4.3 Pickup Conditions**

A player picks up ball ONLY if:

* Ball speed < pickupThreshold
* Player is facing ball OR approaching ball
* Not currently knocked back by tackle

---

# ⭐ 5. Passing & Shooting Cones

This is crucial: your game uses **directional cards**, so cones determine possible success and interception.

## **5.1 Pass Cone**

```
angle = ~22–30 degrees
length = pass distance
```

Any opponent inside the cone influences outcome.

### **Interception Risk Formula**

```
risk = Σ (opponent_pos inside cone):
          (1 / distanceToPassLine) * weight
```

Clamp result 0 → 1.

## **5.2 Through Ball Cone**

* Much narrower (12–18 degrees)
* Medium–high risk
* Higher success with Vision + momentum

## **5.3 Shooting Cone**

* Wide near box (35–45 degrees)
* Narrows with distance (0.5% per px away)

---

# ⭐ 6. Tackle Boxes & Challenge Volumes

Your tackle system looks “smart” if you use **tackle volumes** instead of direct collisions.

## **6.1 Tackle Box**

A **thin arc** in front of the defender:

```
radius = 14–18 px
angle = 90 degrees
alignment requirement = defender facing roughly toward ball (±60°)
```

## **6.2 Tackle Win Chance**

Based on:

* defender Defense + Physical
* attacker Dribbling + Balance
* momentum
* approach angle

### Suggested base formula:

```
winChance =
  (defenseStat * 0.6 + physicalStat * 0.4) 
  - (dribbling * 0.6 + balance * 0.4) 
  + momentumModifier
```

Clamp to 10–90%.

---

# ⭐ 7. Pressing Volumes

Pressing is fundamental in your game.

## **7.1 Press Trigger Radius**

```
pressRadius = 60 px (AI looks “active”)
```

## **7.2 Press Engagement Radius**

```
engageRadius = 24 px
```

Nearest player applies pressure; second player sets a **shadow block**.

---

# ⭐ 8. Goalkeeper Zones

Goalkeeper behavior becomes readable using **zones**:

## **8.1 GK Home Zone (default position)**

A rectangle:

```
width: penalty box width
height: 30–40 px from goal line
```

GK oscillates between:

* **near post coverage**
* **central angle**
* **anticipation shifts**

## **8.2 Rush Zone**

GK may rush out only if:

```
distance(ball, goal) < 100 px
AND
attacker is facing goal
AND
no defender between ball and goal
```

## **8.3 Save Cone**

Goalkeeper tries to intercept within a cone:

```
angle: 50–60 degrees
distance: 60–80 px
```

Ball inside cone → save attempt triggers.

---

# ⭐ 9. Ball–Goal Interaction

### **Net Hit Behavior**

When ball enters goal area:

* Ball bounces lightly against line (bounceFactor -0.1)
* Net animation: 1–2 px vertical jiggle for 150–200 ms

---

# ⭐ 10. Physics Tuning Variables (Expose in Debug Menu)

Essential tuning sliders:

### **Ball**

* passSpeed
* shotSpeed
* friction
* bounceFactor
* pickupThreshold

### **Players**

* moveSpeed
* acceleration
* turnSpeed
* tackleRange
* collisionRadius

### **AI**

* chaseAggression
* pressIntensity
* runTriggerSensitivity

These variables define the “feel” of the gamemore than any other system.

---

# ⭐ 11. “Feel” Decisions (Important!)

### ✔ Ball should **never** jitter randomly

### ✔ All collisions must be **soft**

### ✔ No unpredictable rebounds

### ✔ Passes must travel in smooth, clean arcs/lines

### ✔ Shots must be dramatic but readable

### ✔ Tackles must feel “decisive” (impact burst + clear result)

### ✔ Pressing must look **organized**, not frantic

Football sims often fail because physics are “too real,” creating messy, uncontrolled gameplay.
Your physics must feel **consistent**, **predictable**, and **gamey**.

---

# ⭐ 12. Pseudo-code Summary (Minimal Implementation)

### Ball movement:

```
ball.pos += ball.vel * dt
ball.vel *= (1 - friction * dt)
if |ball.vel| ≤ tiny → ball.vel = 0
```

### Collision:

```
for player:
  if freeBall && dist(player, ball) < pickupRadius:
      pickup

  if freeBall && dist(player, ball) < collisionRadius:
      apply small deflection
```

### Passing:

```
aim = player.pos + normalized(input) * desiredDistance
risk = ComputeInterceptionRisk(...)
if rand < PassSuccessChance - risk:
    KickBall(aim, speed)
else:
    KickBall(aim with random error)
```

### Tackle:

```
if BallInTackleBox(player):
    resolve tackle chance
```

---

# ⭐ Option M Complete.

You now have a **full football physics + collision + pitch spec** tailored for a tactical pixel art game.

If you'd like, I can continue with:

* **Option N — Sound Design Guide**
* **Option O — Match Commentary Flows (lightweight text pop-ups)**
* **Option P — Live Service Event Design**
* **Option Q — Monetization (ethical version)**
* **Option R — Full Pre-production GDD assembly (all sections combined)**

Just say **“Next: N”** or whichever direction you’d like!
