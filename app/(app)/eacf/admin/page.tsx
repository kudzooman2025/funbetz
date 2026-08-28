"use client";

/**
 * /eacf/admin — EACF dynasty setup.
 *
 * Step 1 of the build: coaches, their accounts and season schools, team
 * ratings, and the week-by-week schedule. Line submissions, betting and
 * settlement come later — see EACF_SPEC.md.
 */

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CoachRow {
  id: string;
  name: string;
  seedRank: number;
  user: { id: string; username: string; email: string } | null;
  school: string | null;
  ratings: { ovr: number; off: number; def: number; weekNumber: number | null } | null;
}

interface GameRow {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeCoach: { id: string; name: string };
  awayCoach: { id: string; name: string };
  _count: { lineSubmissions: number; bets: number };
}

interface WeekRow {
  id: string;
  weekNumber: number;
  status: string;
  games: GameRow[];
}

interface Overview {
  season: string | null;
  seasons: string[];
  coaches: CoachRow[];
  weeks: WeekRow[];
  availableUsers: { id: string; username: string; email: string }[];
}

const card = "bg-brand-card border border-brand-border rounded-[5px]";
const label = "font-display text-[13px] tracking-[.14em] uppercase text-brand-muted";
const input =
  "bg-brand-black border border-brand-line rounded-[3px] px-2 py-1.5 text-sm text-white min-w-0";
const btn =
  "min-h-[36px] px-3 rounded-[3px] font-display text-[14px] tracking-[.1em] uppercase transition-colors disabled:opacity-40";
const btnPrimary = `${btn} bg-brand-green text-brand-black hover:brightness-110`;
const btnGhost = `${btn} border border-brand-line bg-brand-surface text-brand-muted hover:text-white`;

export default function EacfAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<Overview | null>(null);
  const [season, setSeason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  /** Surfaced only when the invite email fails, so an invite is never lost. */
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(
    async (forSeason?: string) => {
      const qs = forSeason ? `?season=${encodeURIComponent(forSeason)}` : "";
      const res = await fetch(`/api/eacf/admin/overview${qs}`);
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        setError("Failed to load");
        return;
      }
      const json: Overview = await res.json();
      setData(json);
      setSeason((prev) => prev || json.season || "");
    },
    []
  );

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") load();
  }, [status, router, load]);

  /** Every mutation funnels through here so errors surface consistently. */
  async function send(
    key: string,
    url: string,
    method: string,
    body?: unknown
  ): Promise<boolean> {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return false;
      }
      await load(season);
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  /**
   * Create an account and attach it to a coach in one go. Two calls rather
   * than one endpoint because account creation is site-wide and deliberately
   * knows nothing about EACF.
   */
  async function invite(coachId: string, email: string, username: string) {
    setBusy(`invite-${coachId}`);
    setError("");
    setNotice("");
    setInviteLink(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not create the account");
        return false;
      }

      const link = await fetch(`/api/eacf/admin/coaches/${coachId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: json.user.id }),
      });
      if (!link.ok) {
        const lj = await link.json().catch(() => ({}));
        setError(
          `Account created, but linking failed: ${lj.error || "unknown error"}. Link it from the dropdown.`
        );
      } else if (json.emailSent) {
        setNotice(`Invite emailed to ${email}.`);
      } else {
        setNotice(
          `Account created, but the email didn't send. Copy this link to ${username}:`
        );
        setInviteLink(json.inviteUrl ?? null);
      }

      await load(season);
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading" || (!data && !forbidden)) {
    return <p className="text-brand-muted text-sm py-8 text-center">Loading…</p>;
  }

  if (forbidden) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase">
          Admins only
        </h1>
        <p className="text-brand-muted text-sm mt-2">
          Signed in as {session?.user?.name ?? "someone without admin rights"}.
        </p>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display font-bold text-[26px] tracking-[.03em] uppercase leading-none">
          EACF Setup
        </h1>
        <p className="text-brand-muted text-xs mt-1.5">
          Coaches, schools, team ratings and the schedule.
        </p>
      </div>

      {error && (
        <div className="bg-brand-loss/10 border border-brand-loss/30 rounded-[4px] p-3 text-brand-loss text-sm">
          {error}
        </div>
      )}

      {notice && (
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-[4px] p-3 text-brand-green text-sm">
          {notice}
          {inviteLink && (
            <code className="block mt-2 font-mono text-[11px] text-white break-all bg-brand-black border border-brand-line rounded-[3px] p-2">
              {inviteLink}
            </code>
          )}
        </div>
      )}

      {/* Season */}
      <section className={`${card} p-3`}>
        <div className={label}>Season</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <input
            className={`${input} w-32`}
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="2027"
          />
          <button className={btnGhost} onClick={() => load(season)}>
            Load
          </button>
          {d.seasons.map((s) => (
            <button
              key={s}
              className={`${btnGhost} ${s === d.season ? "!text-brand-green !border-brand-green" : ""}`}
              onClick={() => {
                setSeason(s);
                load(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] text-brand-dim mt-2">
          Schools and team ratings are stored per season, so a coach switching
          programs never rewrites last season&apos;s results.
        </p>
      </section>

      <SeedSection season={season} onDone={() => load(season)} />

      <CoachesSection
        coaches={d.coaches}
        availableUsers={d.availableUsers}
        season={season}
        busy={busy}
        send={send}
        invite={invite}
      />

      <ScheduleSection
        weeks={d.weeks}
        coaches={d.coaches}
        season={season}
        busy={busy}
        send={send}
      />
    </div>
  );
}

function CoachesSection({
  coaches,
  availableUsers,
  season,
  busy,
  send,
  invite,
}: {
  coaches: CoachRow[];
  availableUsers: Overview["availableUsers"];
  season: string;
  busy: string | null;
  send: (k: string, u: string, m: string, b?: unknown) => Promise<boolean>;
  invite: (coachId: string, email: string, username: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");

  return (
    <section className={`${card} p-3`}>
      <div className={label}>Coaches</div>

      <div className="mt-3 space-y-2">
        {coaches.length === 0 && (
          <p className="text-brand-dim text-sm">No coaches yet.</p>
        )}
        {coaches.map((c) => (
          <CoachRowEditor
            key={c.id}
            coach={c}
            availableUsers={availableUsers}
            season={season}
            busy={busy}
            send={send}
            invite={invite}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-3 flex-wrap items-center border-t border-brand-border pt-3">
        <input
          className={`${input} w-36`}
          placeholder="Coach name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${input} w-20`}
          placeholder="Rank"
          inputMode="numeric"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
        />
        <button
          className={btnPrimary}
          disabled={busy === "add-coach" || !name.trim() || !rank}
          onClick={async () => {
            const ok = await send("add-coach", "/api/eacf/admin/coaches", "POST", {
              name,
              seedRank: Number(rank),
            });
            if (ok) {
              setName("");
              setRank("");
            }
          }}
        >
          Add coach
        </button>
      </div>
      <p className="font-mono text-[10px] text-brand-dim mt-2">
        Rank seeds the line algorithm and is the fallback until a coach has
        enough peer raters. The live ranking is derived from peer ratings later.
      </p>
    </section>
  );
}

function CoachRowEditor({
  coach,
  availableUsers,
  season,
  busy,
  send,
  invite,
}: {
  coach: CoachRow;
  availableUsers: Overview["availableUsers"];
  season: string;
  busy: string | null;
  send: (k: string, u: string, m: string, b?: unknown) => Promise<boolean>;
  invite: (coachId: string, email: string, username: string) => Promise<boolean>;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUsername, setInviteUsername] = useState(coach.name);
  const [school, setSchool] = useState(coach.school ?? "");
  const [ovr, setOvr] = useState(coach.ratings ? String(coach.ratings.ovr) : "");
  const [off, setOff] = useState(coach.ratings ? String(coach.ratings.off) : "");
  const [def, setDef] = useState(coach.ratings ? String(coach.ratings.def) : "");

  // School and ratings sync from props independently. Sharing one effect meant
  // saving a school re-ran it and wiped half-typed OVR/OFF/DEF values, since
  // every mutation refetches the whole coach list.
  useEffect(() => {
    setSchool(coach.school ?? "");
  }, [coach.school]);

  // Primitive deps rather than coach.ratings: that object is rebuilt on every
  // refetch, so depending on it would clobber in-progress typing each time
  // anything else on the page was saved.
  const savedOvr = coach.ratings?.ovr;
  const savedOff = coach.ratings?.off;
  const savedDef = coach.ratings?.def;
  useEffect(() => {
    // No snapshot yet — leave whatever the admin has typed alone.
    if (savedOvr === undefined) return;
    setOvr(String(savedOvr));
    setOff(String(savedOff));
    setDef(String(savedDef));
  }, [savedOvr, savedOff, savedDef]);

  const url = `/api/eacf/admin/coaches/${coach.id}`;

  return (
    <div className="bg-brand-raised border border-brand-border rounded-[4px] p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px] text-brand-dim w-6">
          {coach.seedRank}
        </span>
        <span className="font-display font-semibold text-[17px] tracking-[.03em] uppercase min-w-[90px]">
          {coach.name}
        </span>

        <select
          className={`${input} w-44`}
          value={coach.user?.id ?? ""}
          onChange={(e) =>
            send(`link-${coach.id}`, url, "PATCH", {
              userId: e.target.value || null,
            })
          }
        >
          <option value="">— no account linked —</option>
          {coach.user && <option value={coach.user.id}>{coach.user.username}</option>}
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <input
          className={`${input} w-40`}
          placeholder={season ? `School (${season})` : "Set a season first"}
          value={school}
          disabled={!season}
          onChange={(e) => setSchool(e.target.value)}
        />
        <button
          className={btnGhost}
          disabled={!season || !school.trim() || busy === `school-${coach.id}`}
          onClick={() =>
            send(`school-${coach.id}`, url, "PATCH", {
              seasonLabel: season,
              schoolName: school,
            })
          }
        >
          Save
        </button>
      </div>

      {!coach.user && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="font-display text-[11px] tracking-[.14em] uppercase text-brand-dim w-6">
            Inv
          </span>
          <input
            className={`${input} w-52`}
            placeholder="email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <input
            className={`${input} w-32`}
            placeholder="username"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
          />
          <button
            className={btnGhost}
            disabled={
              !inviteEmail.includes("@") ||
              inviteUsername.trim().length < 3 ||
              busy === `invite-${coach.id}`
            }
            onClick={async () => {
              const ok = await invite(coach.id, inviteEmail, inviteUsername);
              if (ok) setInviteEmail("");
            }}
          >
            {busy === `invite-${coach.id}` ? "Sending…" : "Invite"}
          </button>
          <span className="font-mono text-[10px] text-brand-dim">
            creates the account and emails a set-password link
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="font-display text-[11px] tracking-[.14em] uppercase text-brand-dim w-6">
          Tm
        </span>
        {(
          [
            ["OVR", ovr, setOvr],
            ["OFF", off, setOff],
            ["DEF", def, setDef],
          ] as const
        ).map(([lbl, val, set]) => (
          <label key={lbl} className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-brand-dim">{lbl}</span>
            <input
              className={`${input} w-14`}
              inputMode="numeric"
              value={val}
              disabled={!season}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))}
        <button
          className={btnGhost}
          disabled={
            !season || !ovr || !off || !def || busy === `rating-${coach.id}`
          }
          onClick={() =>
            send(
              `rating-${coach.id}`,
              "/api/eacf/admin/team-ratings",
              "POST",
              {
                coachId: coach.id,
                seasonLabel: season,
                ovr: Number(ovr),
                off: Number(off),
                def: Number(def),
              }
            )
          }
        >
          Snapshot
        </button>
        <button
          className={`${btnGhost} !text-brand-loss ml-auto`}
          disabled={busy === `del-${coach.id}`}
          onClick={() => send(`del-${coach.id}`, url, "DELETE")}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function ScheduleSection({
  weeks,
  coaches,
  season,
  busy,
  send,
}: {
  weeks: WeekRow[];
  coaches: CoachRow[];
  season: string;
  busy: string | null;
  send: (k: string, u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const [weekNumber, setWeekNumber] = useState("");

  return (
    <section className={`${card} p-3`}>
      <div className={label}>Schedule</div>

      <div className="mt-3 space-y-4">
        {weeks.length === 0 && (
          <p className="text-brand-dim text-sm">
            No weeks yet for {season || "this season"}.
          </p>
        )}
        {weeks.map((w) => (
          <WeekBlock
            key={w.id}
            week={w}
            coaches={coaches}
            busy={busy}
            send={send}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-3 items-center border-t border-brand-border pt-3">
        <input
          className={`${input} w-24`}
          placeholder="Week #"
          inputMode="numeric"
          value={weekNumber}
          onChange={(e) => setWeekNumber(e.target.value)}
        />
        <button
          className={btnPrimary}
          disabled={!season || !weekNumber || busy === "add-week"}
          onClick={async () => {
            const ok = await send("add-week", "/api/eacf/admin/weeks", "POST", {
              seasonLabel: season,
              weekNumber: Number(weekNumber),
            });
            if (ok) setWeekNumber("");
          }}
        >
          Add week
        </button>
      </div>
    </section>
  );
}

function WeekBlock({
  week,
  coaches,
  busy,
  send,
}: {
  week: WeekRow;
  coaches: CoachRow[];
  busy: string | null;
  send: (k: string, u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  return (
    <div className="border border-brand-border rounded-[4px] overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-brand-raised border-b border-brand-border">
        <span className="font-display font-bold text-[17px] tracking-[.04em] uppercase">
          Week {week.weekNumber}
        </span>
        <span className="font-mono text-[10px] text-brand-dim">{week.status}</span>
      </div>

      <div className="divide-y divide-brand-border">
        {week.games.map((g) => (
          <GameRowEditor key={g.id} game={g} busy={busy} send={send} />
        ))}
        {week.games.length === 0 && (
          <p className="text-brand-dim text-sm px-2.5 py-2">No games yet.</p>
        )}
      </div>

      <div className="flex gap-2 p-2.5 flex-wrap items-center bg-brand-raised/50">
        <select
          className={`${input} w-36`}
          value={away}
          onChange={(e) => setAway(e.target.value)}
        >
          <option value="">Away coach</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="font-display text-[12px] tracking-[.1em] uppercase text-brand-faint">
          at
        </span>
        <select
          className={`${input} w-36`}
          value={home}
          onChange={(e) => setHome(e.target.value)}
        >
          <option value="">Home coach</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className={btnGhost}
          disabled={!home || !away || busy === `add-game-${week.id}`}
          onClick={async () => {
            const ok = await send(
              `add-game-${week.id}`,
              "/api/eacf/admin/games",
              "POST",
              { weekId: week.id, homeCoachId: home, awayCoachId: away }
            );
            if (ok) {
              setHome("");
              setAway("");
            }
          }}
        >
          Add game
        </button>
      </div>
    </div>
  );
}

function GameRowEditor({
  game,
  busy,
  send,
}: {
  game: GameRow;
  busy: string | null;
  send: (k: string, u: string, m: string, b?: unknown) => Promise<boolean>;
}) {
  const [homeScore, setHomeScore] = useState(
    game.homeScore === null ? "" : String(game.homeScore)
  );
  const [awayScore, setAwayScore] = useState(
    game.awayScore === null ? "" : String(game.awayScore)
  );

  const url = `/api/eacf/admin/games/${game.id}`;
  const locked = game.status === "LOCKED" || game.status === "FINAL";

  return (
    <div className="px-2.5 py-2 flex items-center gap-2 flex-wrap">
      <span className="font-display text-[15px] tracking-[.03em] uppercase flex-1 min-w-[180px]">
        {game.awayCoach.name}{" "}
        <span className="text-brand-faint text-[12px]">at</span>{" "}
        {game.homeCoach.name}
      </span>

      <span className="font-mono text-[10px] text-brand-dim">
        {game._count.lineSubmissions} lines · {game._count.bets} bets
      </span>

      <span
        className={`font-display text-[11px] tracking-[.14em] uppercase px-1.5 py-0.5 rounded-[3px] border ${
          game.status === "FINAL"
            ? "border-brand-green/40 text-brand-green"
            : game.status === "LOCKED"
              ? "border-brand-gold/40 text-brand-gold"
              : "border-brand-line text-brand-dim"
        }`}
      >
        {game.status.replace("_", " ")}
      </span>

      {!locked && (
        <button
          className={btnGhost}
          disabled={busy === `lock-${game.id}`}
          onClick={() => send(`lock-${game.id}`, url, "PATCH", { lock: true })}
        >
          Lock
        </button>
      )}

      {locked && (
        <>
          <input
            className={`${input} w-14`}
            inputMode="numeric"
            placeholder="Away"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
          />
          <input
            className={`${input} w-14`}
            inputMode="numeric"
            placeholder="Home"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
          />
          <button
            className={btnGhost}
            disabled={
              homeScore === "" || awayScore === "" || busy === `score-${game.id}`
            }
            onClick={() =>
              send(`score-${game.id}`, url, "PATCH", {
                homeScore: Number(homeScore),
                awayScore: Number(awayScore),
              })
            }
          >
            Save score
          </button>
        </>
      )}

      {game._count.bets === 0 && (
        <button
          className={`${btnGhost} !text-brand-loss`}
          disabled={busy === `delg-${game.id}`}
          onClick={() => send(`delg-${game.id}`, url, "DELETE")}
        >
          ×
        </button>
      )}
    </div>
  );
}

interface SeedRowResult {
  name: string;
  actions: string[];
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
}

/**
 * Paste the whole roster at once. Preview first, apply second — the preview
 * is what makes sending real email to nine people a deliberate act rather
 * than a surprise.
 */
function SeedSection({
  season,
  onDone,
}: {
  season: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [sendInvites, setSendInvites] = useState(false);
  const [results, setResults] = useState<SeedRowResult[] | null>(null);
  const [wasDryRun, setWasDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  /** One coach per line: Name, School, email@x.com — rank follows line order. */
  function parse() {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, school, email, rank] = line.split(",").map((c) => c.trim());
        return {
          name,
          school: school || undefined,
          email: email || undefined,
          rank: rank ? Number(rank) : undefined,
        };
      })
      .filter((r) => r.name);
  }

  async function run(dryRun: boolean) {
    const rows = parse();
    if (rows.length === 0) {
      setErr("Nothing to seed — add one coach per line.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/eacf/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonLabel: season, rows, sendInvites, dryRun }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error || "Seeding failed");
        return;
      }
      setResults(json.results ?? []);
      setWasDryRun(dryRun);
      if (!dryRun) onDone();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} p-3`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className="text-brand-dim text-[11px]">{open ? "\u25BE" : "\u25B8"}</span>
        <span className={label}>Seed roster</span>
        <span className="font-mono text-[10px] text-brand-dim ml-auto">
          paste the whole league at once
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <textarea
            className={`${input} w-full h-40 font-mono text-[12px] leading-relaxed`}
            placeholder={"Name, School, email@example.com\nName, School, email@example.com\n\nOne coach per line. School and email are optional.\nRank follows line order unless you add a 4th column."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
              className="accent-[#B4F03C]"
            />
            <span className="font-display text-[13px] tracking-[.1em] uppercase text-brand-muted">
              also create accounts and email invites
            </span>
          </label>

          {sendInvites && (
            <p className="font-mono text-[10px] text-brand-gold">
              this sends real email — preview first
            </p>
          )}

          <div className="flex gap-2">
            <button
              className={btnGhost}
              disabled={busy || !season}
              onClick={() => run(true)}
            >
              {busy ? "Working…" : "Preview"}
            </button>
            <button
              className={btnPrimary}
              disabled={busy || !season || !results || wasDryRun === false}
              onClick={() => run(false)}
            >
              Apply
            </button>
            {!season && (
              <span className="font-mono text-[10px] text-brand-dim self-center">
                set a season first
              </span>
            )}
          </div>

          {err && (
            <p className="text-brand-loss text-sm">{err}</p>
          )}

          {results && (
            <div className="border border-brand-border rounded-[4px] overflow-hidden">
              <div className="px-2.5 py-1.5 bg-brand-black border-b border-brand-border font-display text-[12px] tracking-[.14em] uppercase text-brand-muted">
                {wasDryRun ? "Preview — nothing written yet" : "Applied"}
              </div>
              <div className="divide-y divide-brand-border">
                {results.map((r, i) => (
                  <div key={`${r.name}-${i}`} className="px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                    <span className="font-display text-[15px] tracking-[.03em] uppercase min-w-[90px]">
                      {r.name}
                    </span>
                    <span className="font-mono text-[10px] text-brand-dim">
                      {r.actions.length ? r.actions.join(" · ") : "no change"}
                    </span>
                    {r.emailSent === false && (
                      <span className="font-mono text-[10px] text-brand-gold">
                        email failed
                      </span>
                    )}
                    {r.error && (
                      <span className="font-mono text-[10px] text-brand-loss ml-auto">
                        {r.error}
                      </span>
                    )}
                    {r.inviteUrl && (
                      <code className="w-full font-mono text-[10px] text-white break-all bg-brand-black border border-brand-line rounded-[3px] p-1.5 mt-1">
                        {r.inviteUrl}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
