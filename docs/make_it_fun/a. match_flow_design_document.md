Great — here is **Option A: Complete Match Flow Design Document** for your football-RPG-card-tactics game.
This is written like a proper GDD section so you can build from it directly.

I will include **one small image group** to visually anchor the top-down pixel football layout you’re designing for.
(No entities needed in this section since we’re not referencing external titles.)

---

# 🅐 — **MATCH FLOW DESIGN DOCUMENT**

### *“Real-time football controlled by tactical card commands”*

![Image](https://images.openai.com/static-rsc-3/hfumS8DHQSO1Fc1hiZ9UGhh8LPp_5kVo29BB1HAPxKE-V1z4hTJtZGc6pPvnw4PCdo8-k4k8SIM-Hvy9CbutskBYOdBeA3AcRrMys_eidnY?purpose=fullsize\&v=1)

![Image](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/347700/capsule_616x353.jpg?t=1527949474)

![Image](https://img.itch.zone/aW1nLzE2NTE5OTUzLnBuZw%3D%3D/original/r7p11O.png)

---

# **1. Match Overview**

Each match is a **real-time, top-down football game** where the player acts as the team’s coach, using:

* **Action Cards** (player-level commands)
* **Team Command Cards** (macro tactical shifts)
* **Directional Input** (for passes, shots, crosses, switches)

Players **do not directly move characters**. The AI handles positioning, spacing, and formation adherence.

The match’s fun comes from:

* timing
* resource management
* risk/reward decisions
* evolving tactics
* card synergy

---

# **2. Match Phases**

A match consists of:

### **Phase 0 — Pre-Match Setup**

Player chooses:

* Starting XI (player cards)
* Formation
* Deck of **Action Cards** (always infinite use; drawn on cooldown)
* Up to **5 Team Command Cards** (consumed on use)
* Captain (affects momentum, pressure, or cooldowns)

### **Phase 1 — Kickoff**

The AI starts in a “neutral-intent” state.
Player begins with:

* **3 Action Cards in hand**
* **0 Team Commands active**
* **Momentum bar at center**

### **Phase 2 — Real-Time Play (Core Loop)**

The match alternates between offensive and defensive versions of the loop.

---

# **3. Core Gameplay Loop (Real-Time)**

This is the heart of your game.
Every second, the game evaluates:

---

## **3.1. System: Card Draw & Cooldowns**

* The player has a **hand limit** (default: 4 action cards).
* Every **X seconds** an Action Card is drawn (cooldown).
* If a card is played, it immediately enters cooldown and **returns to the deck**.
* Some cards are **situational** (only appear when in possession / defending).

Example cooldowns:

* Pass (3 sec)
* Tackle (5 sec)
* Through Ball (8 sec)
* Shoot (7 sec)
* Press (6 sec)

This creates constant tactical tension.

---

## **3.2. System: AI Behavior Loop**

AI players:

* Maintain formation shape
* Seek open passing lanes
* Adjust stance based on your last command
* Track opponents in their zone
* Use stamina as a soft limiter

The AI is “smart but predictable”:
players understand what they *will* do, keeping decisions strategic.

---

## **3.3. System: Action Execution**

Playing an Action Card triggers a **command pulse** to the appropriate player(s).

Examples:

### **Pass**

* Select card → select target direction → nearest eligible player attempts pass.
* Success influenced by: Passing, Vision, Pressure, Momentum.

### **Shoot**

* Select card → choose shot direction/angle → striker executes shot.

### **Press**

* Nearest 2–3 players collapse on the ball carrier.
* Risk: leaves gaps.

### **Dribble**

* Ball carrier enters “dribble intent” mode for 2 seconds.
* Boosts control but increases risk of turnover.

Each card changes the **micro-game state**.

---

## **3.4. System: Team Command Cards**

These are **big tactical shifts**, limited per match, consumed when used.

Examples:

### **All Out Attack**

Duration: 20 seconds
Effect:

* Fullbacks push higher
* Action cooldowns reduced by 20%
* Defensive stats suffer

### **Park the Bus**

Duration: 30 seconds
Effect:

* Formation compresses
* Tackling success up
* Passing and chances reduced

### **Fast Counter**

Trigger: Use immediately after ball recovery
Effect:

* Three forwards sprint into space
* Buffs Through Ball success

These create **dramatic gameplay swings**.

---

## **3.5. System: Momentum**

Momentum is a **bidirectional bar** affecting:

* stat boosts
* card draw speeds
* AI intensity

Momentum increases from:

* successful passes
* shots on target
* consecutive tackles
* good positioning
* effective team commands

Momentum decreases from:

* turnovers
* repeated failed actions
* bad tactical choices
* conceding goals

Momentum ensures matches tell **a story**.

---

# **4. Match Events**

### **Goal**

* Momentum reset to neutral with ball to conceding team.
* Player draws 1 bonus Action Card.

### **Foul**

* Tackle card failed hard → foul chance triggers.
* Rare yellow/red card events add tension.

### **Injury**

* Very low chance if stamina is extremely low.
* Replaces player with bench version (lower stats).

### **Halftime**

* Refills stamina partially.
* Allows formation change, bench subs, and swapping team command cards.

---

# **5. End of Match**

### Player receives:

* XP for each Player Card (based on contribution)
* Manager XP (progress toward unlocking new cards/formations)
* Random post-match card reward (team command / upgrade)
* Coins or resources for progression

### Stats Recorded:

* Passes completed
* Success rate
* Tackles
* Distance covered
* xG (optional)
* Rating (1–10)

Ratings influence XP.

---

# **6. Win/Loss/Draw Impacts**

You may choose one system:

### **Option A: Pure XP**

No punishment for losing, only lower rewards.

### **Option B: Seasonal Rank**

Win streaks = higher difficulty + better rewards.

### **Option C: Card Durability**

Team command cards have “charges” that refill with resources.

---

# **7. Match Length**

Recommended for mobile/fast play:

**5–7 minute matches.**
Clock runs faster than real time (e.g., 1:10 scale).

---

# **8. UI Flow During Match**

HUD features:

* Action card hand (bottom)
* Team command cards (side bar)
* Momentum bar (top center)
* Stamina rings around players
* Mini-map (optional)
* Score + timer

Pixel art keeps everything readable.

---

# 🔥 YOU NOW HAVE OPTION A COMPLETE.

Next you requested:
**B. Player Card Template (stats + perk slots)**

Say **“Next: B”** and I’ll generate the full Player Card system.
