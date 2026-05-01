/**
 * 2026 Kentucky Derby — Race Configuration
 * Race: Saturday May 2, 2026 · 6:57 PM ET · Churchill Downs
 */

export const DERBY_YEAR = 2026;

// Lock 15 min before post time (6:42 PM ET = 22:42 UTC)
export const DERBY_LOCK_TIME = new Date("2026-05-02T22:42:00.000Z");
export const DERBY_RACE_TIME = new Date("2026-05-02T22:57:00.000Z");

export interface DerbyHorse {
  post: number;
  name: string;
  odds: string;   // e.g. "4-1"
  oddsNum: number; // numerator (4 for "4-1")
  morningLine: string;
}

export const DERBY_HORSES: DerbyHorse[] = [
  { post:  1, name: "Renegade",            odds: "4-1",  oddsNum: 4,  morningLine: "4-1"  },
  { post:  2, name: "Albus",               odds: "30-1", oddsNum: 30, morningLine: "30-1" },
  { post:  3, name: "Intrepido",           odds: "50-1", oddsNum: 50, morningLine: "50-1" },
  { post:  4, name: "Litmus Test",         odds: "50-1", oddsNum: 50, morningLine: "50-1" },
  { post:  5, name: "Right to Party",      odds: "30-1", oddsNum: 30, morningLine: "30-1" },
  { post:  6, name: "Commandment",         odds: "6-1",  oddsNum: 6,  morningLine: "6-1"  },
  { post:  7, name: "Danon Bourbon",       odds: "20-1", oddsNum: 20, morningLine: "20-1" },
  { post:  8, name: "So Happy",            odds: "15-1", oddsNum: 15, morningLine: "15-1" },
  { post:  9, name: "The Puma",            odds: "10-1", oddsNum: 10, morningLine: "10-1" },
  { post: 10, name: "Wonder Dean",         odds: "30-1", oddsNum: 30, morningLine: "30-1" },
  { post: 11, name: "Incredibolt",         odds: "20-1", oddsNum: 20, morningLine: "20-1" },
  { post: 12, name: "Chief Wallabee",      odds: "8-1",  oddsNum: 8,  morningLine: "8-1"  },
  { post: 14, name: "Potente",             odds: "20-1", oddsNum: 20, morningLine: "20-1" },
  { post: 15, name: "Emerging Market",     odds: "15-1", oddsNum: 15, morningLine: "15-1" },
  { post: 16, name: "Pavlovian",           odds: "30-1", oddsNum: 30, morningLine: "30-1" },
  { post: 17, name: "Six Speed",           odds: "50-1", oddsNum: 50, morningLine: "50-1" },
  { post: 18, name: "Further Ado",         odds: "6-1",  oddsNum: 6,  morningLine: "6-1"  },
  { post: 19, name: "Golden Tempo",        odds: "30-1", oddsNum: 30, morningLine: "30-1" },
  { post: 21, name: "Great White",         odds: "50-1", oddsNum: 50, morningLine: "50-1" },
  { post: 22, name: "Ocelli",              odds: "50-1", oddsNum: 50, morningLine: "50-1" },
];

export function getHorse(name: string): DerbyHorse | undefined {
  return DERBY_HORSES.find((h) => h.name === name);
}

/** Win payout: wager × (oddsNum + 1) */
export function calcWinPayout(wager: number, oddsNum: number): number {
  return Math.round(wager * (oddsNum + 1));
}

/** Exacta payout: wager × (p1+1) × (p2+1) / 4, capped at 500× wager */
export function calcExactaPayout(wager: number, p1Odds: number, p2Odds: number): number {
  const raw = wager * ((p1Odds + 1) * (p2Odds + 1)) / 4;
  return Math.round(Math.min(raw, wager * 500));
}

/** Trifecta payout: wager × (p1+1) × (p2+1) × (p3+1) / 20, capped at 2000× wager */
export function calcTrifectaPayout(wager: number, p1Odds: number, p2Odds: number, p3Odds: number): number {
  const raw = wager * ((p1Odds + 1) * (p2Odds + 1) * (p3Odds + 1)) / 20;
  return Math.round(Math.min(raw, wager * 2000));
}
