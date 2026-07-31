/**
 * FIFA World Cup 2026 — Bracket Configuration
 *
 * Format:
 *   Group Stage (Jun 11–27): 12 groups of 4, top 2 + 8 best 3rd advance
 *   Round of 32 (Jun 28 – Jul 3): 16 matches
 *   Round of 16 (Jul 4–7): 8 matches
 *   Quarterfinals (Jul 9–11): 4 matches
 *   Semifinals (Jul 14–15): 2 matches
 *   Final (Jul 19): 1 match
 */

export const WC_BRACKET_ID = "wc2026";
export const WC_LOCK_TIME = new Date("2026-06-11T14:45:00Z"); // before first kickoff

// ── Groups ────────────────────────────────────────────────────────────────────
export const WC_GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"],
  C: ["USA", "Paraguay", "Australia", "Turkey"],
  D: ["Brazil", "Morocco", "Haiti", "Scotland"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
  H: ["Belgium", "Egypt", "Iran", "New Zealand"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const WC_GROUP_KEYS = Object.keys(WC_GROUPS) as string[];

// Flags (emoji) for display
export const WC_FLAGS: Record<string, string> = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
  "Canada": "🇨🇦", "Bosnia & Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
  "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Spain": "🇪🇸", "Cabo Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "Congo DR": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
};

// ── Round of 32 bracket structure ─────────────────────────────────────────────
// home/away are slot tokens: "W:A" = winner of Group A, "RU:B" = runner-up of Group B
// "3rd" = best 3rd-place qualifier (unknown until group stage ends)
export interface WCR32Match {
  id: number;      // 1-16
  home: string;    // slot token
  away: string;    // slot token
  date: string;    // display date
}

export const WC_R32: WCR32Match[] = [
  { id:  1, home: "RU:A", away: "RU:B", date: "Jun 28" },
  { id:  2, home: "W:C",  away: "RU:F", date: "Jun 29" },
  { id:  3, home: "W:E",  away: "3rd",  date: "Jun 29" },
  { id:  4, home: "W:F",  away: "RU:C", date: "Jun 29" },
  { id:  5, home: "RU:E", away: "RU:I", date: "Jun 30" },
  { id:  6, home: "W:I",  away: "3rd",  date: "Jun 30" },
  { id:  7, home: "W:A",  away: "3rd",  date: "Jun 30" },
  { id:  8, home: "W:L",  away: "3rd",  date: "Jul 1"  },
  { id:  9, home: "W:G",  away: "3rd",  date: "Jul 1"  },
  { id: 10, home: "W:D",  away: "3rd",  date: "Jul 1"  },
  { id: 11, home: "W:H",  away: "RU:J", date: "Jul 2"  },
  { id: 12, home: "RU:K", away: "RU:L", date: "Jul 2"  },
  { id: 13, home: "W:B",  away: "3rd",  date: "Jul 2"  },
  { id: 14, home: "RU:D", away: "RU:G", date: "Jul 3"  },
  { id: 15, home: "W:J",  away: "RU:H", date: "Jul 3"  },
  { id: 16, home: "W:K",  away: "3rd",  date: "Jul 3"  },
];

// R16 pairings: W of R32 matches
export const WC_R16 = [
  { id: 1, home: "W:R32-1",  away: "W:R32-2",  date: "Jul 4" },
  { id: 2, home: "W:R32-3",  away: "W:R32-4",  date: "Jul 4" },
  { id: 3, home: "W:R32-5",  away: "W:R32-6",  date: "Jul 5" },
  { id: 4, home: "W:R32-7",  away: "W:R32-8",  date: "Jul 5" },
  { id: 5, home: "W:R32-9",  away: "W:R32-10", date: "Jul 6" },
  { id: 6, home: "W:R32-11", away: "W:R32-12", date: "Jul 6" },
  { id: 7, home: "W:R32-13", away: "W:R32-14", date: "Jul 7" },
  { id: 8, home: "W:R32-15", away: "W:R32-16", date: "Jul 7" },
];

// QF pairings
export const WC_QF = [
  { id: 1, home: "W:R16-1", away: "W:R16-2", date: "Jul 9"  },
  { id: 2, home: "W:R16-3", away: "W:R16-4", date: "Jul 10" },
  { id: 3, home: "W:R16-5", away: "W:R16-6", date: "Jul 11" },
  { id: 4, home: "W:R16-7", away: "W:R16-8", date: "Jul 11" },
];

// SF pairings
export const WC_SF = [
  { id: 1, home: "W:QF-1", away: "W:QF-2", date: "Jul 14" },
  { id: 2, home: "W:QF-3", away: "W:QF-4", date: "Jul 15" },
];

// ── Scoring ───────────────────────────────────────────────────────────────────
export const WC_POINTS = {
  groupWinner: 2,   // correct group winner pick
  r32: 1,           // correct R32 pick
  r16: 2,           // correct R16 pick
  qf: 3,            // correct QF pick
  sf: 4,            // correct SF pick
  final: 6,         // correct champion pick
};
// Max possible: 24 + 16 + 16 + 12 + 8 + 6 = 82 pts

// ── Pick types ────────────────────────────────────────────────────────────────
export interface WCPicks {
  /** Group winner picks: group letter → team name */
  groups: Record<string, string>;
  /** R32 picks: match id string → team name */
  r32: Record<string, string>;
  /** R16 picks: match id string → team name */
  r16: Record<string, string>;
  /** QF picks: match id string → team name */
  qf: Record<string, string>;
  /** SF picks: match id string → team name */
  sf: Record<string, string>;
  /** Champion pick */
  champion: string;
}

export const WC_EMPTY_PICKS: WCPicks = {
  groups: {}, r32: {}, r16: {}, qf: {}, sf: {}, champion: "",
};

/** Resolve a slot token against current picks, e.g. "W:A" → picked winner of Group A */
export function resolveSlot(token: string, picks: WCPicks): string {
  if (!token.includes(":")) return token; // literal team name
  const [type, ref] = token.split(":");
  if (type === "W" && ref.length === 1) return picks.groups[ref] ?? "";
  if (type === "RU") {
    // Runner-up: for now return empty (user doesn't pick runner-ups explicitly)
    return "";
  }
  if (type === "W" && ref.startsWith("R32-")) {
    const id = ref.replace("R32-", "");
    return picks.r32[id] ?? "";
  }
  if (type === "W" && ref.startsWith("R16-")) {
    const id = ref.replace("R16-", "");
    return picks.r16[id] ?? "";
  }
  if (type === "W" && ref.startsWith("QF-")) {
    const id = ref.replace("QF-", "");
    return picks.qf[id] ?? "";
  }
  return "";
}

export function wcPickProgress(picks: WCPicks): { made: number; total: number } {
  const groupsDone = WC_GROUP_KEYS.filter((g) => picks.groups[g]).length;
  const r32Done = WC_R32.filter((m) => picks.r32[String(m.id)]).length;
  const r16Done = WC_R16.filter((m) => picks.r16[String(m.id)]).length;
  const qfDone  = WC_QF.filter((m)  => picks.qf[String(m.id)]).length;
  const sfDone  = WC_SF.filter((m)  => picks.sf[String(m.id)]).length;
  const made = groupsDone + r32Done + r16Done + qfDone + sfDone + (picks.champion ? 1 : 0);
  const total = WC_GROUP_KEYS.length + WC_R32.length + WC_R16.length + WC_QF.length + WC_SF.length + 1;
  return { made, total };
}
