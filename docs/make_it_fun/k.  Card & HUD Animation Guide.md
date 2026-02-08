Great — here is **Option K: Card & HUD Animation Guide**.
This defines all the **game feel**, **timing**, **snappiness**, **hit reactions**, and **FX polish** that will make your game feel premium even with pixel art.

I’ll include **one image group** to anchor the feel of “pixel UI animations / card interactions.”

![Image](https://images.squarespace-cdn.com/content/v1/551a19f8e4b0e8322a93850a/1582952390614-9W693D1GRE5EPSV6534H/68-Common_Resources_P.gif)

![Image](https://streak.club/img/Mix1c2VyX2NvbnRlbnQvdXBsb2Fkcy9pbWFnZS84NDguZ2lm/original/5cPNdT.gif)

![Image](https://s3.envato.com/files/640600149/Pic%20Ae.jpg)

![Image](https://img.itch.zone/aW1nLzIwNDA3ODI4LnBuZw%3D%3D/315x250%23c/%2F1qE%2FS.png)

---

# 🅚 — CARD & HUD ANIMATION GUIDE

### *“Juice, clarity, timing, and satisfying feedback”*

This guide is about:

* how your **cards animate when played**
* how your **HUD elements respond** to player actions
* how to make the whole interface feel **alive and satisfying**

Card-based command games thrive on **crisp feedback**, and with pixel art, the trick is to keep animations small but expressive.

---

# ⭐ 1. Animation Philosophy

### ✔ **Fast**

90% of animations should be **100–250 ms**.

### ✔ **Readable**

Animations must **never** block the pitch.

### ✔ **Pixel-clean**

All movement is done in **whole pixel increments**.

### ✔ **Diegetic feedback**

Animations communicate:

* success
* failure
* cooldowns
* risk

### ✔ **Player-first responsiveness**

Tap → immediate response → tiny delay for anticipation → effect.

---

# ⭐ 2. Card Animations (Bottom HUD)

Below are the core animations needed.

---

## 2.1 CARD DRAW (when cooldown finishes)

**Timing:** 150 ms
**Motion:**

* Card fades in from 0% → 100% opacity
* Moves upward by **1 pixel**, then drops back

**Ease:**

* Ease out on rise
* Linear fall

**Particles:**

* 4 small 1px sparkles (random direction)
* Color: cool white or team color

---

## 2.2 CARD HOVER (when finger/mouse over)

**Timing:** Real-time
**Motion:**

* Card lifts up by **1–2 px**
* Slight brightness increase (+10%)
* Border glows (1px light outline)

**No particle needed.**

---

## 2.3 CARD TAP / SELECT (arming the command)

**Timing:** 120 ms
**Motion:**

* Rapid shrink to **95% size**
* Then pop to **102% size**
* Then settle at **100%**

**Audio:**

* “Tick” or “clack” sound (low-frequency pop)

**Visual:**

* Border color becomes bold
* Card icon pulses once

---

## 2.4 AIMING MODE (for directional cards)

**Pitch interaction:**

* A thin **pixel arrow** extends from player in real time
* Arrow tip pulses with 2-frame animation
* Color matches card type (shoot = orange, pass = blue)

**HUD feedback:**

* Card stays lifted
* Cooldown indicator grays out (can’t tap again)

---

## 2.5 CARD PLAYED (execution moment)

**Timing:** 180 ms
**Motion Sequence:**

1. **Lift** (card moves upward by 1–2 px, 50 ms)
2. **Flash white** quickly (20 ms)
3. **Explode to particles** (60 ms)
4. **Fade-out** (50 ms)

**Particles:**

* 6–10 pixels bursting outward
* Lifetime: 100–200 ms
* Use colors from the card’s palette

---

## 2.6 CARD ON COOLDOWN

### Cooldown Wheel

* A radial wipe (1 px thickness) that empties counterclockwise
* Color = desaturated version of card’s main color
* Opacity lowered to 40% during cooldown

### Cooldown Pulse

Every 1 sec:

* Card border pulses slightly to show it's “charging”

---

## 2.7 CARD ERROR (using at wrong time)

**Animation:**

* Shake horizontally **1 px** left-right (40–40 ms each)
* Red outline flash (150 ms)
* No particles

**Optional:**
Add a tiny “X!” pixel text above card.

---

# ⭐ 3. Team Command Card Animations (Right HUD Column)

These are more dramatic than action cards.

---

## 3.1 READY STATE (default)

* Slight idle bounce (1 px every 1.2 seconds)
* Soft glow on edges

This makes them feel powerful and special.

---

## 3.2 ACTIVATION

### On tap:

**Timing:** 250–300 ms
**Motion:**

* Card rises by **3 px**
* Grows to **110% size**
* Emits gold/colored outline burst
* Plays a bold SFX (“whoosh + thump”)

### Pitch FX:

Each team command triggers a **tactical overlay**:

* All Out Attack → orange arrows pointing forward
* Park the Bus → blue shrinking frame
* Fast Counter → streak lines on forwards
* High Press → red triangles pointing at ball

Duration: 0.5–1 sec visuals.
Gameplay effect lasts independently.

---

## 3.3 ACTIVE STATE

While the command is active:

* Card becomes grayscale or desaturated
* A thin **duration bar** drains vertically
* Pulses slowly (rhythm = 1.5 sec)

---

## 3.4 END OF COMMAND

**Animation:**

* Fade to 50% opacity
* “SPENT” stamp appears in pixel font
* Card disintegrates into grey pixels (optional)

---

# ⭐ 4. HUD Animations (Top Bar & Feedback)

---

## 4.1 Score Animation (goal scored)

When a goal is scored:

**Timing:** ~800 ms total
**Sequence:**

1. Score number **jumps up** 2 px (50 ms)
2. **Punch scale** (110% → 100%)
3. Glow streak behind score (150 ms)
4. Tiny celebratory pixels burst (team color)

---

## 4.2 Timer Animation

Timer flashes when:

* new half begins
* 1 minute left
* extra time begins

**Flash:**

* Color invert or brightness pulse
* Duration: 300 ms

---

## 4.3 Momentum Bar Animation

When momentum shifts:

* Bar slider moves smoothly (200–300 ms)
* Tiny sparks fly to the new direction
* Edge of the gaining team glows

---

# ⭐ 5. Pitch-Level Animations (Micro FX)

These make the match feel dynamic.

---

## 5.1 Pass FX

* 1–3 pixel “trail dots” following ball for 150 ms
* Thin arrow arc for **through balls**
* Quick burst at contact point (3 px)

---

## 5.2 Dribble FX

* Dust puff particles at feet (2–3 frames)
* Slight screen shake (1 px) if dribbling success triggers momentum

---

## 5.3 Tackle FX

**Impact burst**

* 6 white/orange shards
* Expand for 2 frames then fade

**Slide trail (optional)**

* 2 trailing pixels where tackler moves

---

## 5.4 Shot FX

* Bright orange or yellow trail
* Net ripple (1–2 pixel/line shake)
* Crowd “flash” (screen border pulses)

---

## 5.5 Counter Attack Activation

* Motion streaks behind attackers
* A temporary “HYPER SPEED” background effect (diagonal lines)
* 0.3 second duration max

---

# ⭐ 6. Animation Timings Cheat Sheet

**Use these as defaults:**

| Animation             | Duration   |
| --------------------- | ---------- |
| Card Draw             | 150 ms     |
| Card Tap              | 120 ms     |
| Card Play             | 180 ms     |
| Team Command Activate | 250–300 ms |
| Pass FX               | 120 ms     |
| Tackle Hit            | 90 ms      |
| Shot Trail            | 140 ms     |
| Score Punch           | 150 ms     |
| Momentum Shift        | 250 ms     |

---

# ⭐ 7. “Juice Rules” — How to Make Everything Feel Better

1. **Every action should have at least *two* feedback layers**
   (visual + sound, movement + particles).

2. **Use tiny screen shake (1–2 px)** sparingly for hype moments.

3. **Velocity = feeling.**
   Faster animations → more exciting match sensation.

4. **All animations should resolve cleanly.**
   No lingering jitter or softness.

5. **Keep pixel edges crisp** (no sub-pixel interpolation).

6. **Important actions should override normal HUD behavior.**

7. **Card use should ALWAYS feel satisfying.**
   Even a simple PASS needs a pop.

---

# ⭐ 8. Deliverables for Art & Animation Team

### Required assets:

* 8 action card animations
* 10 team command animations
* 6 pitch FX animations
* Score update animation
* Momentum bar movement
* Cooldown radial wipe frames
* Card reveal frames
* Pixel particles sheet (common FX)
* 3 video refs of animation timings (animators love this)

---

# 🎉 Option K Complete.

Next is **Option L: First 20 Player Archetypes**
(with stats, caps, traits, personalities, and how they fit into your tactical system).

Say **“Next: L”** and I’ll generate them!
