## 🅘 — Match Engine Pseudo-code Spec

This is a **prototype-scale match engine** that supports your core loop:

* top-down real-time football
* AI movement + formation anchors
* card → command → intent overrides
* directional passes/shots
* cooldowns + team command durations
* momentum (lightweight but functional)

I’m writing it as **language-agnostic pseudo-code** with clear data structures so you can translate to Unity/Godot/JS/etc.

---

# 1) Data Structures

## 1.1 Enums

```text
TeamId = { HOME, AWAY }
Phase  = { KICKOFF, IN_PLAY, GOAL_SCORED, HALFTIME, FULLTIME }
Possession = { HOME, AWAY, NONE }

PlayerRole = { GK, CB, FB, DM, CM, AM, W, ST }

PlayerState =
  { HOLD_ZONE, MARK, PRESS, TACKLE_ATTEMPT, TRACK_RUNNER,
    SUPPORT, MAKE_RUN, RECEIVE, BALL_CARRIER, RECOVER_SHAPE }

ActionCardType = { PASS, SHOOT, DRIBBLE, TACKLE, PRESS, MARK_COVER, THROUGH_BALL, SWITCH_PLAY }
TeamCardType   = { ALL_OUT_ATTACK, PARK_BUS, FAST_COUNTER, HIGH_PRESS, SLOW_BUILDUP, ... }
```

## 1.2 Core structs

```text
Vec2 { x, y }

Ball {
  pos: Vec2
  vel: Vec2
  radius: float
  ownerPlayerId: int?          // null if free
  lastTouchTeam: TeamId?
}

Stats {
  pace: int
  passing: int
  shooting: int
  dribbling: int
  defense: int
  physical: int
  staminaMax: int
  decision: int
  vision: int
  gk: int                      // for GK only
}

Derived {
  speedMax: float
  accel: float
  tackleRange: float
  kickPower: float
}

IntentLock {
  active: bool
  type: string                // "PASS", "TACKLE", etc.
  untilTime: float
  targetPos: Vec2?            // aim point for directional commands
  targetPlayerId: int?        // optional
}

Player {
  id: int
  team: TeamId
  role: PlayerRole

  pos: Vec2
  vel: Vec2
  facing: Vec2                // normalized direction
  radius: float

  stats: Stats
  derived: Derived

  stamina: float              // 0..1
  morale: float               // optional for later
  state: PlayerState
  stateTimer: float

  homeAnchor: Vec2            // from formation
  leashRadius: float
  markTargetId: int?          // for MARK/COVER

  hasBall: bool
  intent: IntentLock

  cooldowns: Map<ActionCardType, float>  // time remaining
}

TeamTactics {
  width: float
  compactness: float
  lineHeight: float
  pressIntensity: float
  runFrequency: float
}

TeamCommandActive {
  type: TeamCardType
  endsAt: float
  // cached modifiers for quick lookups
  modifiers: Modifiers
}

Modifiers {
  passBonus: float
  shootBonus: float
  dribbleBonus: float
  tackleBonus: float
  speedBonus: float
  defensePenalty: float
  cooldownMultiplier: float
  leashMultiplier: float
  lineHeightDelta: float
  widthDelta: float
  compactnessDelta: float
}

HandCard {
  type: ActionCardType
  // For prototype: just one per type, driven by cooldown
}

Match {
  time: float
  dt: float
  phase: Phase
  possession: Possession

  scoreHome: int
  scoreAway: int

  momentum: float             // -1..+1 (home negative? pick a convention)
  momentumVel: float          // smoothing (optional)

  ball: Ball
  players: List<Player>

  tacticsHome: TeamTactics
  tacticsAway: TeamTactics

  activeTeamCmdHome: TeamCommandActive?
  activeTeamCmdAway: TeamCommandActive?

  // Input & command pipeline
  pendingAction: PendingAction?
}

PendingAction {
  team: TeamId
  card: ActionCardType
  aimDir: Vec2?               // normalized; for PASS/SHOOT/etc
  aimPos: Vec2?               // alternative to aimDir
}
```

---

# 2) Match Update Loop (Top-Level)

```text
function UpdateMatch(match, input):
  match.dt = ClampDeltaTime(input.dt)

  if match.phase in { FULLTIME }:
    return

  HandlePhaseTransitions(match)

  // 1) Expire team commands
  UpdateTeamCommands(match)

  // 2) Gather and validate user actions (cards)
  ProcessPlayerInput(match, input)

  // 3) Update cooldown timers & card availability
  UpdateCooldowns(match)

  // 4) AI decides desired movements / states
  UpdateAI(match)

  // 5) Apply pending card actions (intent overrides)
  ExecutePendingActions(match)

  // 6) Integrate movement (players)
  IntegratePlayers(match)

  // 7) Update ball physics + possession
  UpdateBall(match)

  // 8) Resolve collisions (ball↔players, boundaries)
  ResolveCollisions(match)

  // 9) Check goal / out of bounds / restarts
  UpdateRules(match)

  // 10) Update momentum from events
  UpdateMomentum(match)

  // 11) End-of-match conditions
  CheckFulltime(match)
```

---

# 3) Phase & Restart Logic

```text
function HandlePhaseTransitions(match):
  if match.phase == KICKOFF:
    // after a short delay or once ball touched
    if match.time > 1.0:
      match.phase = IN_PLAY

function UpdateRules(match):
  if IsGoal(match.ball.pos):
    OnGoalScored(match, scoringTeam)
  else if IsOutOfBounds(match.ball.pos):
    RestartFromThrowInOrCorner(match)
```

```text
function OnGoalScored(match, scoringTeam):
  if scoringTeam == HOME: match.scoreHome += 1 else match.scoreAway += 1
  match.phase = GOAL_SCORED
  match.time += 0 // keep time, but freeze input briefly

  // Momentum swing
  ApplyMomentumEvent(match, "GOAL", scoringTeam)

  // Reset positions, ball to conceding team
  ResetToKickoff(match, concedingTeam)
  match.phase = IN_PLAY
```

---

# 4) Input → Pending Action

Key idea: **actions are not executed instantly**; they enter a pipeline:

* validate card availability (cooldown, context)
* select executor
* lock intent
* then execute with physics + success check

```text
function ProcessPlayerInput(match, input):
  // input gives: cardType + optional aim direction/position
  action = input.actionRequest   // null if none
  if action == null: return

  // Determine team controlled by player (prototype: HOME only)
  team = HOME

  if !IsCardAvailable(match, team, action.cardType):
    return

  if !IsCardContextValid(match, team, action.cardType):
    return

  match.pendingAction = PendingAction(team, action.cardType, action.aimDir, action.aimPos)
```

Context examples:

* PASS/SHOOT/DRIBBLE require your team possession + ball owner
* TACKLE/PRESS require opponent possession or free ball
* (prototype can be relaxed for fun)

---

# 5) Cooldowns & Card Availability

```text
function UpdateCooldowns(match):
  for p in match.players:
    for each cardType in p.cooldowns:
      p.cooldowns[cardType] = max(0, p.cooldowns[cardType] - match.dt)

function IsCardAvailable(match, team, cardType):
  // Prototype: cards belong to the user, but execution uses a player.
  // We decide availability by checking at least one eligible executor has card off cooldown.
  executors = FindEligibleExecutors(match, team, cardType)
  for e in executors:
    if e.cooldowns[cardType] <= 0:
      return true
  return false
```

---

# 6) AI Update (State Machine + Anchor/Leash)

## 6.1 Tactics modifiers

```text
function GetEffectiveTactics(match, team):
  base = (team==HOME) ? match.tacticsHome : match.tacticsAway
  cmd = (team==HOME) ? match.activeTeamCmdHome : match.activeTeamCmdAway

  eff = base.copy()
  if cmd != null:
    eff.width += cmd.modifiers.widthDelta
    eff.compactness += cmd.modifiers.compactnessDelta
    eff.lineHeight += cmd.modifiers.lineHeightDelta
    eff.pressIntensity += 0 // optional
  return eff
```

## 6.2 State selection (simplified)

```text
function UpdateAI(match):
  for p in match.players:
    effTac = GetEffectiveTactics(match, p.team)

    // If intent lock active, don't overwrite state
    if p.intent.active and match.time < p.intent.untilTime:
      continue

    if TeamHasPossession(match, p.team):
      UpdateOffenseState(match, p, effTac)
    else:
      UpdateDefenseState(match, p, effTac)
```

### Offense state

```text
function UpdateOffenseState(match, p, effTac):
  if p.hasBall:
    p.state = BALL_CARRIER
    // Default: keep safe unless commanded
    return

  // Decide between SUPPORT and MAKE_RUN
  if ShouldMakeRun(match, p, effTac):
    p.state = MAKE_RUN
  else:
    p.state = SUPPORT
```

### Defense state

```text
function UpdateDefenseState(match, p, effTac):
  // If hard mark assigned
  if p.markTargetId != null:
    p.state = MARK
    return

  // Press trigger: based on team tactic + proximity + randomness
  if ShouldPress(match, p, effTac):
    p.state = PRESS
  else:
    p.state = HOLD_ZONE
```

## 6.3 Movement targets (anchor + leash)

```text
function GetDesiredTarget(match, p, effTac):
  anchor = ComputeDynamicAnchor(match, p, effTac) // based on ball pos & line height
  leash = p.leashRadius * GetLeashMultiplier(match, p.team)

  switch p.state:
    case HOLD_ZONE:
      return ClampToLeash(p.pos, anchor, leash)

    case SUPPORT:
      supportPos = FindSupportPosition(match, p, effTac)
      return ClampToLeash(p.pos, supportPos, leash)

    case MAKE_RUN:
      runPos = FindRunLane(match, p, effTac)
      return ClampToLeash(p.pos, runPos, leash * 1.5)

    case PRESS:
      return MoveToward(match.ball.pos, p.pos, maxDist = leash * 2)

    case MARK:
      target = GetPlayerById(match, p.markTargetId)
      return KeepDistance(target.pos, desiredDist=1.2)

    case TRACK_RUNNER:
      // simplified: track most dangerous runner in zone
      runner = FindThreat(match, p)
      return KeepBetween(runner.pos, OwnGoalPos(p.team), ratio=0.6)

    case BALL_CARRIER:
      // default drift to safe direction; don't overdo
      return p.pos + p.facing * 0.2
```

---

# 7) Execute Pending Actions (Card → Intent Override)

This is where the “coach” feeling is built.

```text
function ExecutePendingActions(match):
  if match.pendingAction == null:
    return

  a = match.pendingAction
  match.pendingAction = null

  executors = FindEligibleExecutors(match, a.team, a.card)

  executor = ChooseBestExecutor(match, executors, a.card)
  if executor == null: return
  if executor.cooldowns[a.card] > 0: return

  // Apply intent lock so AI doesn't fight it
  LockIntent(executor, a.card, match.time, a.aimPos, a.aimDir)

  // Execute now or on next tick? Prototype: execute immediately.
  switch a.card:
    case PASS:   DoPass(match, executor, a)
    case SHOOT:  DoShoot(match, executor, a)
    case DRIBBLE:DoDribble(match, executor)
    case TACKLE: DoTackle(match, executor)
    case PRESS:  DoPress(match, a.team)         // affects multiple
    case MARK_COVER: DoMarkCover(match, a.team) // optional for prototype
```

### Intent lock

```text
function LockIntent(p, card, now, aimPos, aimDir):
  p.intent.active = true
  p.intent.type = ToString(card)
  p.intent.untilTime = now + 0.7          // tweak
  p.intent.targetPos = aimPos ?? (p.pos + aimDir*10)
```

---

# 8) Action Implementations (Success, Risk, Physics)

## 8.1 Pass

```text
function DoPass(match, passer, action):
  if !passer.hasBall: return

  targetPos = ResolveAimTarget(match, passer, action)
  basePower = passer.derived.kickPower

  // Risk model: interceptions
  laneRisk = ComputeInterceptionRisk(match, passer.pos, targetPos, passer.team)

  // Success influenced by stats + momentum
  success = PassSuccessChance(passer, laneRisk, match.momentum, passer.team)

  if Rand01() < success:
    KickBall(match.ball, passer, targetPos, power=basePower, loft=false)
    passer.hasBall = false
    match.ball.ownerPlayerId = null
    ApplyMomentumEvent(match, "GOOD_PASS", passer.team)
  else:
    // Mis-hit pass: add random error to targetPos
    badTarget = targetPos + RandomVec2(radius=2.0)
    KickBall(match.ball, passer, badTarget, power=basePower*0.9, loft=false)
    passer.hasBall = false
    match.ball.ownerPlayerId = null
    ApplyMomentumEvent(match, "BAD_PASS", passer.team)

  // Cooldown
  passer.cooldowns[PASS] = BaseCooldown(PASS) * GetCooldownMultiplier(match, passer.team)
```

## 8.2 Shoot

```text
function DoShoot(match, shooter, action):
  if !shooter.hasBall: return

  aim = ResolveAimTarget(match, shooter, action)
  dist = Distance(shooter.pos, OppGoalPos(shooter.team))

  shotDifficulty = Clamp01(dist / 30.0)  // farther = harder
  gk = FindGoalkeeper(match, OpponentTeam(shooter.team))

  chance = ShootSuccessChance(shooter, gk, shotDifficulty, match.momentum)

  if Rand01() < chance:
    KickBall(match.ball, shooter, aim, power=shooter.derived.kickPower*1.2, loft=false)
    shooter.hasBall = false
    match.ball.ownerPlayerId = null
    ApplyMomentumEvent(match, "SHOT_ON_TARGET", shooter.team)
  else:
    // miss or save: still kick
    aim2 = aim + RandomVec2(radius=3.0 + 4.0*shotDifficulty)
    KickBall(match.ball, shooter, aim2, power=shooter.derived.kickPower*1.2, loft=false)
    shooter.hasBall = false
    match.ball.ownerPlayerId = null
    ApplyMomentumEvent(match, "SHOT_OFF", shooter.team)

  shooter.cooldowns[SHOOT] = BaseCooldown(SHOOT) * GetCooldownMultiplier(match, shooter.team)
```

## 8.3 Dribble

```text
function DoDribble(match, dribbler):
  if !dribbler.hasBall: return

  // Apply short buff window: increases retention, increases speed slightly
  dribbler.state = BALL_CARRIER
  dribbler.stateTimer = 2.0
  dribbler.tempDribbleBuff = true

  ApplyMomentumEvent(match, "DRIBBLE_ATTEMPT", dribbler.team)

  dribbler.cooldowns[DRIBBLE] = BaseCooldown(DRIBBLE) * GetCooldownMultiplier(match, dribbler.team)
```

## 8.4 Tackle

```text
function DoTackle(match, tackler):
  // choose nearest opponent ball carrier
  carrier = FindBallCarrier(match, OpponentTeam(tackler.team))
  if carrier == null: return

  if Distance(tackler.pos, carrier.pos) > tackler.derived.tackleRange:
    // step-in attempt: lock state to PRESS/TACKLE
    tackler.state = TACKLE_ATTEMPT
    return

  // Win chance
  chance = TackleWinChance(tackler, carrier, match.momentum)

  if Rand01() < chance:
    // dispossess
    carrier.hasBall = false
    match.ball.ownerPlayerId = tackler.id
    tackler.hasBall = true
    ApplyMomentumEvent(match, "TACKLE_WON", tackler.team)
  else:
    ApplyMomentumEvent(match, "TACKLE_LOST", tackler.team)
    // optional: foul logic later

  tackler.cooldowns[TACKLE] = BaseCooldown(TACKLE) * GetCooldownMultiplier(match, tackler.team)
```

## 8.5 Press (multi-agent)

```text
function DoPress(match, team):
  // assign presser = nearest to ball
  presser = NearestPlayerToBall(match, team)
  if presser == null: return

  presser.state = PRESS
  presser.intent.active = true
  presser.intent.untilTime = match.time + 1.0

  // assign cover shadow = second nearest (cuts lane)
  cover = SecondNearestPlayerToBall(match, team)
  if cover != null:
    cover.state = PRESS
    cover.intent.active = true
    cover.intent.untilTime = match.time + 1.0
    cover.pressRole = "COVER"

  // Team momentum effect is small unless it wins ball
  ApplyMomentumEvent(match, "PRESS_START", team)

  // Cooldown: apply to these players or global? Prototype: apply to presser only.
  presser.cooldowns[PRESS] = BaseCooldown(PRESS) * GetCooldownMultiplier(match, team)
```

---

# 9) Movement Integration (Players)

```text
function IntegratePlayers(match):
  for p in match.players:
    effTac = GetEffectiveTactics(match, p.team)
    target = GetDesiredTarget(match, p, effTac)

    desiredVel = SeekVelocity(p.pos, target, maxSpeed = ComputeMaxSpeed(p))
    p.vel = SmoothDamp(p.vel, desiredVel, smoothing=0.2)

    // stamina affects speed
    p.vel *= Lerp(0.7, 1.0, p.stamina)

    p.pos += p.vel * match.dt
    p.facing = NormalizeSafe(p.vel, fallback=p.facing)

    UpdateStamina(p, effTac, match.dt)
```

---

# 10) Ball Update (Physics + Possession)

```text
function UpdateBall(match):
  b = match.ball

  if b.ownerPlayerId != null:
    owner = GetPlayerById(match, b.ownerPlayerId)
    // Attach ball to owner with small offset in facing direction
    b.pos = owner.pos + owner.facing * (owner.radius + b.radius + 0.05)
    b.vel = owner.vel
    match.possession = owner.team
    return

  // Free ball physics
  b.pos += b.vel * match.dt
  b.vel *= (1.0 - 0.8 * match.dt)       // friction

  // Possession pickup
  cand = FindPickupCandidate(match, b.pos)
  if cand != null:
    b.ownerPlayerId = cand.id
    cand.hasBall = true
    match.possession = cand.team
    ApplyMomentumEvent(match, "BALL_WON", cand.team)
```

---

# 11) Collisions (Cheap & Good Enough)

```text
function ResolveCollisions(match):
  // Keep players inside pitch
  for p in match.players:
    p.pos = ClampToPitch(p.pos)

  // Ball bounce off pitch bounds
  if HitBoundary(match.ball.pos):
    ReflectBallVelocity(match.ball)

  // Optional: ball↔player collision when free ball
  if match.ball.ownerPlayerId == null:
    for p in match.players:
      if Distance(p.pos, match.ball.pos) < p.radius + match.ball.radius:
        // small deflection
        match.ball.vel = match.ball.vel + Normalize(match.ball.pos - p.pos) * 2.0
```

---

# 12) Momentum System (Prototype Friendly)

Momentum should be **simple, readable, and impactful**.

Conventions:

* momentum ∈ [-1, +1]
* positive = HOME advantage (or pick the opposite, just stay consistent)

```text
function ApplyMomentumEvent(match, eventType, team):
  delta = 0

  switch eventType:
    case "GOOD_PASS":      delta = 0.01
    case "BAD_PASS":       delta = -0.015
    case "SHOT_ON_TARGET": delta = 0.03
    case "SHOT_OFF":       delta = -0.01
    case "TACKLE_WON":     delta = 0.025
    case "TACKLE_LOST":    delta = -0.02
    case "GOAL":           delta = 0.10
    case "BALL_WON":       delta = 0.02
    default:               delta = 0

  // Convert delta direction based on which team
  signed = (team == HOME) ? delta : -delta

  match.momentum = Clamp(match.momentum + signed, -1, 1)
```

Use momentum as modifiers:

* card cooldown multiplier
* success chances

```text
function GetCooldownMultiplier(match, team):
  m = match.momentum
  // If team is HOME, positive m helps; if AWAY, negative m helps
  advantage = (team == HOME) ? m : -m
  return Lerp(1.10, 0.85, Clamp01((advantage+1)/2))  // worse when losing, better when winning

function PassSuccessChance(p, laneRisk, momentum, team):
  adv = (team==HOME) ? momentum : -momentum
  base = 0.88 + (p.stats.passing + p.stats.vision)/400.0
  base += adv * 0.06
  base -= laneRisk * 0.35
  return Clamp01(base)
```

---

# 13) Eligibility & Executor Selection

```text
function FindEligibleExecutors(match, team, cardType):
  if cardType in { PASS, SHOOT, DRIBBLE }:
    carrier = FindBallCarrier(match, team)
    return (carrier != null) ? [carrier] : []
  if cardType in { TACKLE }:
    return PlayersNearBall(match, team, radius=6.0)
  if cardType in { PRESS }:
    return PlayersNearBall(match, team, radius=10.0)
  // expand later
  return []

function ChooseBestExecutor(match, list, cardType):
  if list.empty: return null
  // simplest: nearest-to-ball or ball carrier already used
  sort by DistanceToBall ascending
  return list[0]
```

---

# 14) Team Commands (Prototype)

```text
function ActivateTeamCommand(match, team, type):
  cmd = TeamCommandActive()
  cmd.type = type
  cmd.endsAt = match.time + Duration(type)
  cmd.modifiers = BuildModifiers(type)

  if team == HOME: match.activeTeamCmdHome = cmd else match.activeTeamCmdAway = cmd

function UpdateTeamCommands(match):
  for team in {HOME, AWAY}:
    cmd = GetCmd(match, team)
    if cmd != null and match.time >= cmd.endsAt:
      ClearCmd(match, team)
```

---

# 15) What to Implement First (Order Matters)

To reach a playable prototype fastest:

1. Player movement with **anchors + leash**
2. Ball attach/detach + basic physics
3. Pass & shoot (directional)
4. Cooldowns on the ball carrier
5. Simple defense state (hold zone + nearest press)
6. Tackle
7. Momentum (tiny deltas)
8. One team command that changes leash + line height

---

If you’re ready, say **“Next: J”** and I’ll write the **Art Bible** (pixel style guide, palette logic, animations, UI rules, readability constraints, and how to keep the look “simple and fun” while still tactical).
