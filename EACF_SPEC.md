# EACF — Point Spread Betting for the EA College Football 27 Dynasty

Spec, drafted Aug 2026. Not yet built. Decisions below were settled with Chris;
open questions are marked **OPEN**.

---

## What it is

A peer-run sportsbook for a 9-coach online dynasty. League members set the lines
on each other's games, then bet into those lines with their existing FunBetz
wallet. Nobody sets a line on a game they are playing in.

It is **not** another sport in the existing sync pipeline. Games come from Chris,
not from ESPN, so EACF gets its own routes and tables and is linked from the
sports menu. Adding `EACF` to `LEAGUE_KEYS` would fight `syncAllLeagues` and the
weekly betting window on every run.

---

## Settled decisions

| Decision | Choice | Why |
|---|---|---|
| Payout | **−110** — `payout = round(stake / 1.1)` | Volume without an edge bleeds, so season P/L reflects skill rather than click count. Matches the realism Chris wants elsewhere. |
| Consensus | **Trimmed mean** — drop highest and lowest, average the rest | Robust at n≈7, where z-score outlier rejection is unreliable. Explainable to the league. |
| Publication | **Quorum-based**, not clock-based | Same-day rhythm. A game's line publishes the moment it has enough submissions; games come onto the board through the day. |
| Submissions | **Blind**, and you must submit on a game before you can see its line or bet it | Removes the conflict of interest structurally rather than policing it, and drives quorum. |
| Line lock | Line **locks at publication** | Late submitters can still bet, but cannot move a published number. |
| Leaderboard | **EACF-only net P/L** | The wallet caps at `WALLET_MAX` 1000, so wallet totals bunch everyone at the ceiling and say nothing. |
| Line movement | **In v1** | Bet flow shifts the line; each bet keeps the number it was struck at. |
| Schedule | Entered **in advance** | The dynasty schedule is known up front. Screenshots are for scores. |

---

## The line

**Representation.** A line is stored signed relative to the home coach:
positive means the home coach is favored, negative means the away coach is.
This makes disagreement about *who* is favored average out naturally — four
submissions of "home by 3" and three of "away by 2" average correctly without
special cases.

**Bounds.** Magnitude 0.5 to 30, in 0.5 increments. The trimmed mean is rounded
to the nearest 0.5. If the consensus lands inside ±0.5, it snaps to 0.5 on
whichever side the sign points.

**Pushes are possible.** Rounding to 0.5 means an integer line can occur
(3.0 + a 0.5 shift, say), and an exact-margin result is then a push: stake
refunded, no P/L. This is real-book behaviour and worth keeping.

**Quorum.** 4 submissions publishes a line (configurable). With 9 coaches minus
the 2 playing, ~7 are eligible, so 4 is a majority of those able to submit.
A game that never reaches quorum publishes the **algorithmic line** instead, so
it is still bettable.

### Coach ratings — peer-scored, five metrics

League members rate each other 1–10 on **rushing attack, passing attack, rush
defence, pass defence, and in-game coaching**. The consensus of those ratings
replaces Chris's static 1–9 list as the coach signal, and re-ranks everyone
fluidly through a season and across seasons.

Rules:

- **No self-rating.** One current rating per (rater, subject, metric), upserted;
  history retained so a coach's trend can be charted.
- **Trimmed mean** across raters, same as line consensus, same reasoning.
- **Minimum 3 raters** before peer consensus replaces the seeded value. Until
  then a coach's rating derives from Chris's original 1–9 rank so the algorithm
  has something to work with from day one.
- **Changes apply at week rollover, not instantly.** Ratings feed the
  algorithmic line, so instant application would let someone rate a rival and
  bet into the effect in the same window. Deferring to the next week removes
  that vector and keeps lines stable within a week.
- **Prompted after you play someone** — five numbers while the evidence is
  fresh. A full editor stays available for revising anyone at any time. Asking
  for 8 coaches × 5 metrics on a blank page is how this feature dies in week
  three.

Displayed rank is a composite of the five metrics, with **in-game coaching
weighted roughly double** any single unit metric — in a head-to-head game the
person making decisions matters more than any one unit. That rank is for
display only. **The line algorithm uses the continuous metric vector directly,
never the derived ordinal**, which is the whole point: rank 1 to 2 and rank 8
to 9 are not the same gap, and treating them as equal was the main weakness of
the first draft.

### Opening / fallback line algorithm

Three signals: **how good the coach is** (peer ratings, matchup-aware), **what
they are coaching** (in-game team ratings), and home field.

```
unitEdge  = (homeRushAtk - awayRushDef) + (homePassAtk - awayPassDef)
          - (awayRushAtk - homeRushDef) - (awayPassAtk - homePassDef)

coachEdge = COACH_STEP * unitEdge / 4
          + COACHING_STEP * (homeCoaching - awayCoaching)

teamEdge  = TEAM_STEP * ((homeOff - awayDef) - (awayOff - homeDef)) / 2

line      = coachEdge + teamEdge + HOME_FIELD

COACH_STEP    = 1.2   # points per point of net unit matchup (1-10 scale)
COACHING_STEP = 1.5   # points per point of in-game coaching gap
TEAM_STEP     = 0.5   # points per point of net team matchup (0-99 scale)
HOME_FIELD    = 2.5
clamped to ±30, rounded to nearest 0.5
```

Coach metrics are matchup-aware for the same reason the team term is: a strong
rushing attack against a weak rush defence predicts margin better than two
composite numbers. `OFF`/`DEF` are preferred to `OVR` on the team side, with
`OVR` as the fallback when a snapshot is incomplete — using all three
double-counts.

**Coach and team ratings will overlap.** A coach with a stacked roster gets
rated highly on "rushing attack" partly *because* his roster is good, and that
same quality is already in the team term. The rating prompt should say plainly
that it is the person's skill being rated, regardless of roster. That won't be
perfect, but the regression below down-weights whichever signal turns out
redundant, so it self-corrects rather than compounds.

**Every coefficient here is a guess.** Nobody knows what a point of OVR or a
point of peer-rated pass defence is worth in this dynasty. They are
admin-tunable, and the real fix is to fit them: once ~20–30 completed games
exist, regress actual margin on the unit matchup, the coaching gap, the team
differential and home field, then replace the seeds. That is the single best
reason to record every final score cleanly, and the v2 path is a
margin-weighted rating that updates itself after each game.

**What ratings do and do not affect.** They set the *algorithmic* line — the
opening suggestion and the fallback when a game misses quorum. They do not
override the consensus, and shouldn't: members can see both the team ratings
in-game and each other's peer ratings on the site, so a consensus line already
prices them in. Their second job is presentational — showing the matchup on the
game card while someone sets a line makes for better-informed submissions.

### Line movement

Recomputed inside the same transaction as each bet:

```
net    = handleOnHome - handleOnAway              (betz)
steps  = floor(|net| / MOVE_STEP_BETZ)
shift  = sign(net) * steps * 0.5                  (clamped to ±MAX_MOVE)
current = round_to_half(published + shift)

MOVE_STEP_BETZ = 100    # 100 betz of net imbalance moves the line half a point
MAX_MOVE       = 3.0    # total drift cap from the published line
```

Money on a side makes that side lay more points — the number moves *away* from
the popular team, which is what a real book does to balance liability. Here
there is no house and no liability to balance, so the purpose is different: it
rewards betting early, before the number moves.

**Every bet stores `lineAtPlacement` and is graded against its own number.**
Not the game's final line. Retrofitting this later would mean migrating live
bets, so the column exists from day one.

---

## Schema sketch

```prisma
model EacfCoach {
  id     String  @id @default(cuid())
  name   String              // "Bui" — stable across seasons
  rank   Int                 // current power ranking, admin-editable
  userId String? @unique     // null until that coach joins FunBetz
}

model EacfCoachSeason {
  id          String @id @default(cuid())
  coachId     String
  seasonLabel String
  schoolName  String          // what the EACF27 screenshot shows THAT season
  @@unique([coachId, seasonLabel])
}

model EacfSchoolChangeRequest {
  id              String @id @default(cuid())
  coachId         String
  seasonLabel     String
  requestedSchool String
  status          EacfRequestStatus  // PENDING | APPROVED | REJECTED
  requestedAt     DateTime @default(now())
  decidedAt       DateTime?
  decidedById     String?
}

model EacfCoachRating {
  id          String   @id @default(cuid())
  raterId     String                     // the user doing the rating
  subjectId   String                     // EacfCoach being rated
  rushAtk     Int                        // 1-10
  passAtk     Int
  rushDef     Int
  passDef     Int
  coaching    Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([raterId, subjectId])         // one current rating per pair
}

model EacfCoachRatingHistory {
  id        String   @id @default(cuid())
  raterId   String
  subjectId String
  rushAtk   Int
  passAtk   Int
  rushDef   Int
  passDef   Int
  coaching  Int
  recordedAt DateTime @default(now())
}

model EacfTeamRating {
  id          String   @id @default(cuid())
  coachId     String
  seasonLabel String
  weekNumber  Int?              // null = preseason snapshot
  ovr         Int
  off         Int
  def         Int
  capturedAt  DateTime @default(now())
  @@index([coachId, seasonLabel, weekNumber])
}

model EacfWeek {
  id           String @id @default(cuid())
  seasonLabel  String            // "2027"
  weekNumber   Int
  status       EacfWeekStatus    // SETUP | OPEN | SETTLED
}

model EacfGame {
  id              String @id @default(cuid())
  weekId          String
  homeCoachId     String
  awayCoachId     String
  publishedLine   Float?         // signed, home-relative; set at quorum
  currentLine     Float?         // publishedLine + movement
  lineSource      EacfLineSource // CONSENSUS | ALGORITHMIC
  publishedAt     DateTime?
  homeScore       Int?
  awayScore       Int?
  status          EacfGameStatus // AWAITING_LINES | OPEN | LOCKED | FINAL
}

model EacfLineSubmission {
  id        String @id @default(cuid())
  gameId    String
  userId    String
  line      Float                // signed, home-relative
  createdAt DateTime @default(now())
  @@unique([gameId, userId])     // one submission per person per game
}

model EacfBet {
  id              String @id @default(cuid())
  gameId          String
  userId          String
  onHome          Boolean
  stake           Int
  lineAtPlacement Float          // the number this bet was struck at
  result          EacfBetResult  // PENDING | WON | LOST | PUSH
  payout          Int?
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?
}
```

Members can bet a game as many times as they like, wallet permitting — each bet
is its own row at its own line.

### Wallet rules — reuse, do not reinvent

The parlay engine already solved this and got it wrong once before. Follow
`lib/resolve-parlays.ts`:

- Debit with `updateMany` guarded on `walletBalance >= stake`, so concurrent
  bets cannot drive a balance negative.
- Credit with `{ increment }` plus a clamp to `WALLET_MAX`, never a
  read-then-absolute-write.
- Push refunds the stake exactly.

---

## Admin

Chris is the only admin. Two jobs:

1. **Schedule** — entered ahead of the season, editable by hand. Matchups are
   known in advance, so this is not screenshot-driven.
2. **Scores** — photograph the EACF27 final-score screen, upload from the phone.
3. **Team ratings** — photograph the team-ratings screen to capture OVR/OFF/DEF.
   One screenshot usually covers several teams. Stored as a snapshot per coach
   per season, optionally tagged to a week, so ratings can be re-captured as
   recruiting and progression move them. The line algorithm uses the most
   recent snapshot at or before the game's week.

**Screenshot ingestion never writes straight to the database.** The image goes
to a vision model, which returns structured `{school, score}` pairs; those are
matched to `EacfCoach.schoolName` and shown as a confirm-or-correct diff before
anything commits. A photo of a TV has glare, angle and moiré, and a misread
score silently pays the wrong person. Requires `ANTHROPIC_API_KEY` in Vercel.

---

## Interface

Mobile-first, in the broadcast-scoreboard language (variant 1a) — see
`Form scope and broadcast styling/design_handoff_funbetz_broadcast/README.md`.

`/eacf` shows the current week as a list of user-vs-user games. Each game is in
exactly one state for the viewer:

- **Your game** — greyed, "you're playing this one", no submission, no bet.
- **Awaiting your line** — a favorite picker and a 0.5–30 points field. The
  consensus is hidden.
- **Open** — the published line, the current line if it has moved, and a stake
  field. Shows how far the number has drifted since publication.
- **Locked / Final** — the result and your P/L on it.

`/eacf/leaderboard` ranks members by EACF-only net P/L.

Gating: `EacfCoach.userId` non-null is the authorization check. Coaches without
a FunBetz account yet get an invite — the league-invite link pattern already
carries a destination through signup and login via `callbackUrl`.

---

## Build order

1. **Schema + coach mapping + admin schedule entry + admin create-user.**
   Nothing user-facing. Team ratings and the seeded 1–9 rank entered by hand.
2. **Blind submissions, quorum publication, trimmed mean, algorithmic fallback.**
3. **Betting: −110, line movement, locked-line storage.**
4. **Score entry (manual), settlement, EACF leaderboard.** ← playable from here
5. **Peer coach ratings** — post-game prompt, full editor, week-rollover
   recompute, derived display rank. The line algorithm falls back to the seeded
   rank until a coach has 3+ raters, so this can land after the game is live.
6. **Screenshot ingestion** via vision + confirm step — scores and team ratings.
7. **Fitted coefficients**, then a margin-weighted rating that updates itself
   after each game, replacing the seeded formula.

Team ratings can be entered by hand in step 1 (nine rows of three numbers), so
the line algorithm works from day one and the screenshot reader is purely a
time-saver rather than a dependency.

**Steps 1–4 are the product** — a playable first season. Step 5 makes the model
self-correcting through peer input; steps 6–7 make it faster and smarter. None
of 5–7 should block a first season, and all three get better the more games
have been recorded, so there is no cost to sequencing them after real play.

---

## Accounts and identity

**Most of this already exists — do not rebuild it.** The site already has:

- Self-serve `forgot-password` (page + API, token-backed via `PasswordResetToken`)
- `reset-password` page + API
- `forgot-username`
- **Admin password reset** — `POST /api/admin/users/[id]` generates a temp
  password, hashes it, emails it via Resend (`sendAdminPasswordResetEmail`), and
  falls back to returning the temp password in the response if the email fails
- Admin user list and delete

Genuinely missing:

1. **Admin create-user.** `/api/admin/users` is GET-only. Needs a POST.
2. **In-app change password** for a signed-in user who knows their current one.
   Today the only paths are the forgot-password email or an admin reset.
3. Everything school-related below.

### How new coaches should be provisioned

Chris asked for admin-set temp passwords. **Recommend an invite link instead**,
because the machinery is already there: admin creates the account with email,
username, school and rank; the system issues a `PasswordResetToken` and emails a
"set your password" link pointing at the existing `reset-password` page. The
member chooses their own password and no password is ever generated,
transmitted, or known by anyone else. If the email bounces, the admin can copy
the link.

If Chris still prefers temp passwords, `sendAdminPasswordResetEmail` already
does exactly that and the create endpoint can reuse it — but then add a
**forced change on first login**, or the temp password stays valid forever.

Recovery is already solved by the existing forgot-password flow.

### Schools change between seasons

`schoolName` must **not** live as a single mutable field on the coach. If it
did, changing it would retroactively rewrite the school on every historical
game — last season's results would show this season's school. Hence
`EacfCoachSeason`: the school is a per-season fact. Games reference coaches,
which are stable, and display resolves the school through the season.
Screenshot matching for a given week uses that season's school.

Coaches request a change; the admin approves. `EacfSchoolChangeRequest` keeps
an audit trail rather than a `pendingSchool` field, because betz ride on who is
who and a silent identity change should be traceable.

---

## Open questions

- **OPEN** — Is `MOVE_STEP_BETZ = 100` the right sensitivity? Depends on typical
  handle per game, which nobody knows until a week has run. Admin-tunable;
  revisit after week one.

### Settled since first draft

- **EACF stays isolated** from the site-wide `cumulative_score` leaderboard.
  EACF standings are net P/L on EACF bets only. Wallet is shared; scoring is not.

- **Betting lock**: the admin locks a game before it is played. Not score-driven
  — a score arriving should never be the thing that stops betting, or someone
  ends up betting a game already played.
