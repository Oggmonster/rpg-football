# Game Design Document (GDD)
## Project: Pocket Gaffer (Working Title)
## Version: v1 – Browser Edition

---

# 1. HIGH-LEVEL OVERVIEW

Pocket Gaffer is a browser-based real-time football tactics game where the player controls their team by playing **action cards** instead of moving players directly.

The game mixes:
- Real-time football simulation  
- Card-based tactical micro-decisions  
- Deck-building  
- Top-down pixel presentation (Sensible World of Soccer style)

Matches are short (4 minutes), fast, readable, and tactically expressive.

The core concept:  
**“You are the gaffer. Your players do the running — you make the decisions.”**

---

# 2. CORE PILLARS

### ✔ Coaching Over Control
The player influences outcomes through strategy, not joystick skill.

### ✔ Card-Driven Football
A 15-card Attack deck and 15-card Defense deck shape your tactical identity.

### ✔ Fast, Lightweight Matches
Designed for 4-minute browser sessions.

### ✔ Pixel-Art Top-Down Charm
Evokes classic SWOS-style readability with modern feedback.

### ✔ Clean MVP Scope
No training mode, no advanced tactics (yet).  
Focus is on match feel and card interactions.

---

# 3. GAMEPLAY

## 3.1 Match Structure
- Duration: ~4 minutes  
- 7v7 or 8v8  
- Real-time simulation  
- Ball possession determines which deck is active  
- No pauses except goal resets

---

## 3.2 Player Control
Players auto-move using:
- Position & role  
- Stats (PAC, DRI, DEF, etc.)  
- Team AI parameters  
- Match context (pressure, space, ball state)

Player actions are triggered via **action cards**.

---

## 3.3 Card Deck System

### Two decks:
- **Attack Deck** (15 cards)
- **Defense Deck** (15 cards)

### Hand:
- 4 cards visible at all times
- When a card is played:  
  1. It resolves  
  2. It moves to bottom of its deck  
  3. The next card in deck is drawn  
- Decks cycle infinitely

### Deck Constraints (example v1)
**Attack Deck (15)**
- Shoot: 2–5  
- Pass: 2–5  
- Dribble: 1–4  
- Through Pass: 1–4  
- Cross: 0–3  
- Long Ball: 0–3  
- Rush: 1–4  

**Defense Deck (15)**
- Tackle: 2–5  
- Press: 1–4  
- Cover: 1–4  
- Intercept: 1–4  
- Mark: 0–3  
- Block: 0–3  
- Double Team: 0–2  
- Rush Keeper: 0–1  

---

## 3.4 Possession Switching

When your team has the ball → Attack Hand  
When the opponent has the ball → Defense Hand  

Hand swaps instantly.  
Optional: 0.25s delay for anti-spam.

---

## 3.5 Card Types (v1 MVP)

### Attack Cards:
- PASS  
- THROUGH PASS  
- DRIBBLE  
- RUSH  
- SHOOT  

### Defense Cards:
- TACKLE  
- PRESS  
- COVER  
- INTERCEPT  

---

# 4. PLAYER SYSTEM

Players are simple stat cards with:
- Position  
- Stats (PAC, SHO, PAS, DRI, DEF, PHY)  
- Rarity  

Players auto-level over time, but no training system exists in v1.

---

# 5. ART & UI

### Visuals
- Pixel art top-down  
- SWOS-like field  
- Simple 4-frame animations  

### UI Layout
- Bottom-left: 4 card hand  
- Center-bottom: direction arrows (when needed)  
- Top: timer, score  
- Clear, non-intrusive UX

---

# 6. TECHNICAL OUTLINE
- Phaser 3 + TypeScript  
- Fixed timestep simulation  
- Simple AI: passing, pressing, marking  
- No networking in v1  
- Modular card system and deck validator

---

# 7. GAME MODES
**MVP:**  
- Quick Match  
- Deck Builder  
- Player Collection  

**Future:**  
- PvP  
- Seasons  
- Tournaments  
- Cosmetic unlockables  

---


# 9. FUTURE FEATURES (Post-V1)
- Team tactic cards  
- Weather effects  
- Player traits  
- Online PvP  
- Offside rules  
- Advanced match events  

---
