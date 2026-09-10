// Golf matchups currently have no verified results feed.
export function isSportBettable(sport: string): boolean {
  return sport !== "PGA" && sport !== "LIV";
}
