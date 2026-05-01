# FunBetz

A private sports betting web app for friends and family. Users bet virtual currency (FunBucks) on real games, parlays, bracket challenges, and special events like the Kentucky Derby. No real money involved.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [External Services](#external-services)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Project Structure](#project-structure)
- [Cron Jobs](#cron-jobs)
- [Admin Panel](#admin-panel)
- [Handoff Guide](#handoff-guide)
- [Local Development](#local-development)

---

## Features

- **Parlays** — bet on multi-game parlays across EPL, NFL, MLB, NBA, NHL, NCAAF, NCAAB, PGA, LIV, and MLS NEXT
- **Bracket Challenges** — pick tournament brackets (currently: MLS NEXT Virginia Regional U13 Academy Division)
- **Schedule** — view upcoming and live games with scores, grouped by sport
- **Leaderboard** — global and tournament-scoped rankings
- **Tournaments / Groups** — create private invite-code groups to compete within a smaller circle
- **Kentucky Derby** — win/exacta/trifecta betting with odds-based payouts, auto-settlement via cron
- **Wallet** — each user starts with 1,000 FunBucks; bet, win, and track balance
- **Admin Panel** — enter match results, scrape live scores, settle bracket picks, manage users, enter Derby results

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v5 (beta) — JWT sessions, credentials provider |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Database driver | `pg` (node-postgres) |
| State management | Zustand v5 |
| Validation | Zod v4 |
| Password hashing | bcryptjs |
| Email | Resend |
| Deployment | Vercel (Hobby plan) |
| Database | Neon (serverless PostgreSQL) |
| Repo | GitHub (`kudzooman2025/funbetz`) — public repo |

---

## External Services

### Vercel
- **Plan:** Hobby
- **Account:** `kudzooman2025` (kudzooman@gmail.com)
- **Project:** `funbetz`
- **URL:** [funbetz.life](https://funbetz.life) (also www.funbetz.life)
- **Deploy hook:** `https://api.vercel.com/v1/integrations/deploy/prj_bjq1FnwbQK6UlRLtTXNPwDiAJWlr/SG8xaVibld`
  - Trigger with: `curl -X POST <deploy_hook_url>`
  - Required because Hobby plan blocks non-owner Git pushes; the deploy hook bypasses this
- **Git branch tracked:** `master`
- **Cron jobs:** Defined in `vercel.json` (see [Cron Jobs](#cron-jobs))

### Neon (PostgreSQL)
- **Service:** [neon.tech](https://neon.tech) — serverless Postgres
- **Project:** `funbetz` (or similar — check Neon dashboard)
- **Connection string format:** `postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require`
- **Used for:** All application data — users, parlays, games, brackets, Derby picks, etc.
- **Migrations:** Managed via Prisma (`npx prisma migrate dev` or `npx prisma db push`)
- ⚠️ **Note:** This is NOT Supabase. The project has Supabase MCP connected but that is for a different, unrelated project ("SPB App").

### GitHub
- **Repo:** `https://github.com/kudzooman2025/funbetz` (public)
- **Account:** `kudzooman2025`
- **Default branch:** `master`
- The repo must remain **public** for Vercel Hobby plan to build from pushes by collaborators. Making it private will cause deployments to be "Blocked."

### Resend (Email)
- **Service:** [resend.com](https://resend.com) — transactional email
- **Used for:** Password reset emails
- **Env var:** `RESEND_API_KEY`

### TheSportsDB
- **Service:** [thesportsdb.com](https://www.thesportsdb.com) — free sports data API
- **Used for:** Syncing games (scores, schedules) for EPL, NFL, MLB, NBA, NHL, NCAAB, NCAAF, PGA, LIV
- **Env vars:** `SPORTSDB_API_KEY`, `SPORTSDB_BASE_URL`
- **Note:** Free tier uses API key `"3"`. Does not support horse racing.

### Namecheap (Domain Registrar)
- **Domain:** `funbetz.life`
- **Registrar:** [namecheap.com](https://www.namecheap.com) — account `kudzooman@gmail.com`
- **DNS:** Pointed at Vercel. In Namecheap → Domain List → Manage → Advanced DNS, the records look like:
  - `A` record: `@` → Vercel IP (e.g. `76.76.21.21`)
  - `CNAME` record: `www` → `cname.vercel-dns.com`
- Vercel manages the SSL certificate automatically once DNS is verified
- **To move the domain to a new host:** Update the A and CNAME records in Namecheap to point to the new host, or transfer the domain itself via Namecheap → Domain List → Transfer

---

## Environment Variables

Set all of these in Vercel → Project → Settings → Environment Variables (Production + Preview).

```env
# Database (Neon)
DATABASE_URL="postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require"

# NextAuth
AUTH_SECRET="<random 32-byte base64 string — generate with: openssl rand -base64 32>"
AUTH_URL="https://funbetz.life"

# TheSportsDB
SPORTSDB_API_KEY="3"
SPORTSDB_BASE_URL="https://www.thesportsdb.com/api/v1/json"

# Cron job authentication (used as Bearer token for all /api/cron/* routes)
CRON_SECRET="<your secret>"

# Resend (email)
RESEND_API_KEY="<your resend api key>"
```

---

## Database

**Provider:** Neon (serverless PostgreSQL)

### Models

| Model | Purpose |
|---|---|
| `User` | Accounts — email, username, password hash, wallet balance, isAdmin |
| `PasswordResetToken` | Secure password reset flow |
| `LeaderboardScore` | Global cumulative score per user |
| `Game` | Sports games synced from TheSportsDB |
| `Parlay` / `ParlayGame` / `ParlayResult` | Parlay bets and outcomes |
| `Tournament` / `TournamentMember` / `TournamentSport` | Private group competitions |
| `BracketChallenge` / `BracketEntry` / `BracketResult` | Bracket pick competitions |
| `DerbyPick` | Kentucky Derby win/exacta/trifecta bets per user per year |
| `DerbyResult` | Official 1st/2nd/3rd finishers for each Derby year |

### Useful DB scripts (in `prisma/`)

```bash
npx tsx prisma/set-admin.ts          # promote a user to admin
npx tsx prisma/seed.ts               # seed initial data
npx tsx prisma/seed-mlsnext.ts       # seed MLS NEXT games
npx tsx prisma/seed-bracket.ts       # seed bracket challenge
npx tsx prisma/purge-brackets.ts     # wipe bracket entries
npx tsx prisma/rename-user.ts        # rename a user
```

---

## Project Structure

```
app/
  (app)/                  # Authenticated app routes (wrapped by layout with Navbar)
    dashboard/            # Home — recent games, wallet, quick stats
    games/                # Browse and bet on games by sport
    parlays/              # View personal parlay history
    leaderboard/          # Global leaderboard
    tournaments/          # Private groups
    brackets/             # Bracket challenge
    schedule/             # Live schedule with scores and team logos
    derby/                # Kentucky Derby betting page
    wallet/               # Wallet balance and history
    admin/                # Admin panel (isAdmin only)
    account/              # Change password
  api/
    auth/                 # NextAuth routes
    games/                # Game listing
    parlays/              # Parlay submit/list
    scores/               # Live group scores for schedule page
    leaderboard/          # Leaderboard data
    tournaments/          # Tournament CRUD
    brackets/             # Bracket picks/results
    derby/
      picks/              # Submit or fetch user's Derby pick
      results/            # Public Derby results endpoint
    wallet/               # Wallet balance
    register/             # User registration
    account/              # Password change
    admin/
      bracket-results/    # Enter bracket results
      bracket-entries/    # View all entries
      derby/              # GET all picks / POST enter results & settle (admin session)
      recalculate/        # Recalculate bracket scores
      scrape/             # Trigger modular11.com scraper
      users/              # User management
    cron/
      sync-games/         # Fetch new games from TheSportsDB
      resolve-parlays/    # Settle completed parlays
      sync-golf/          # Sync golf scores
      sync-bracket/       # Scrape bracket results
      derby-settle/       # Settle Derby picks (results must exist first)
      derby-enter-results/# POST results + settle in one shot (Bearer auth, no session needed)

lib/
  auth.ts                 # NextAuth config
  prisma.ts               # Prisma client singleton
  bracket-config.ts       # MLS NEXT bracket structure, group/team definitions
  derby-config.ts         # Kentucky Derby horses, odds, lock time, payout functions
  sports-api.ts           # TheSportsDB API wrapper
  team-logos.ts           # Team name → logo path mapping

components/
  layout/
    navbar.tsx            # Top nav + mobile tab strip
    wallet-badge.tsx      # Live wallet balance pill

public/logos/             # Team logo images

prisma/
  schema.prisma           # Full database schema
```

---

## Cron Jobs

Defined in `vercel.json` and protected by `Authorization: Bearer <CRON_SECRET>` header.

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/sync-games` | Daily midnight | Pull new/updated games from TheSportsDB |
| `/api/cron/resolve-parlays` | Daily 6 AM | Settle completed parlays, credit winners |
| `/api/cron/sync-golf` | Every Monday 8 AM | Sync golf leaderboard scores |
| `/api/cron/sync-bracket` | Daily noon | Scrape bracket results from modular11.com |

### Kentucky Derby (one-time, 2026)

A separate scheduled task (managed by Claude Cowork) fires at **8:00 PM ET on May 2, 2026**:
1. Scrapes ESPN / Wikipedia for the top 3 finishers
2. POSTs to `/api/cron/derby-enter-results` with Bearer token → enters results + settles all picks
3. Falls back to `/api/cron/derby-settle` if needed (requires results already entered manually)

---

## Admin Panel

URL: `funbetz.life/admin` (requires `isAdmin: true` on the user account)

**Capabilities:**
- Scrape live bracket results from modular11.com
- Manually enter group scores, QF/SF/Final winners
- Recalculate all bracket scores
- View and manage user accounts (delete, reset password)
- View all bracket entries with pick breakdowns
- **Kentucky Derby:** Enter 1st/2nd/3rd finishers via dropdown and settle all picks with one click

**To promote a user to admin:**
```bash
npx tsx prisma/set-admin.ts
```
Or connect directly to Neon and run:
```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

---

## Handoff Guide

Everything you need to move this app to a new account or instance.

### Accounts to transfer / recreate

| Service | What to do |
|---|---|
| **GitHub** | Transfer `kudzooman2025/funbetz` repo to new account, or clone and push to a new repo |
| **Vercel** | Create new project, connect to GitHub repo, set all env vars (see above), add custom domain |
| **Neon** | Either transfer project, or export/import the database (see below) |
| **Resend** | Create new account, get API key, verify sending domain, update `RESEND_API_KEY` |
| **TheSportsDB** | No account needed for free tier — API key is just `"3"` |
| **Namecheap** | Log in at namecheap.com → Domain List → funbetz.life → Advanced DNS → update A record and CNAME to point to new host |

### Migrating the database

**Option 1 — Neon project transfer:** Neon supports project transfers between accounts via their dashboard.

**Option 2 — pg_dump / pg_restore:**
```bash
# Export from current Neon DB
pg_dump "<current_DATABASE_URL>" -Fc -f funbetz_backup.dump

# Import to new Neon DB
pg_restore -d "<new_DATABASE_URL>" funbetz_backup.dump
```

**Option 3 — Fresh start with Prisma:**
```bash
# On the new database
npx prisma migrate deploy   # applies all migrations
npx tsx prisma/seed.ts      # seeds base data if needed
```

### Setting up a new Vercel project

1. Push repo to GitHub (must be **public** on Hobby plan, or upgrade to Pro for private repos)
2. In Vercel: New Project → Import Git Repository → select the repo
3. Framework: Next.js (auto-detected)
4. Set all environment variables listed in the [Environment Variables](#environment-variables) section
5. Add custom domain in Vercel → Project → Domains
6. Generate a new deploy hook in Vercel → Project → Settings → Git → Deploy Hooks
7. Update `AUTH_URL` env var to match the new domain

### Key things to know

- **Wallet balances** are stored in the database as integers (FunBucks). Starting balance is 1,000.
- **All cron jobs** authenticate via `Authorization: Bearer <CRON_SECRET>`. This must match the `CRON_SECRET` env var.
- **Derby settling** runs once per year. For 2027 and beyond, update `DERBY_YEAR` and `DERBY_HORSES` in `lib/derby-config.ts`.
- **Bracket config** for the MLS NEXT tournament is in `lib/bracket-config.ts`. Update `GROUPS`, `GROUP_GAMES`, `QF_SLOTS`, and `SF_SEEDS` for new tournaments.
- **Team logos** are stored in `public/logos/` and mapped by team name in `lib/team-logos.ts`.
- **The repo must be public** as long as you're on Vercel Hobby plan. If you upgrade to Pro, you can make it private.

---

## Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL, AUTH_SECRET, AUTH_URL=http://localhost:3000, etc.

# Push schema to local or dev database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

```bash
npm run db:studio       # Open Prisma Studio (visual DB browser)
npm run db:migrate      # Run migrations in dev
npm run db:push         # Push schema changes without migrations
npm run lint            # ESLint
npx tsc --noEmit --skipLibCheck   # TypeScript check without building
```

---

*Last updated: May 2026*
