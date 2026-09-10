/** Read-only audit. Run with the intended database environment loaded. */
import { prisma } from "../lib/prisma";

async function main() {
  const pendingGolf = await prisma.parlay.findMany({
    where: { status: "PENDING", parlayGames: { some: { game: { sport: { in: ["PGA", "LIV"] } } } } },
    select: { id: true, userId: true, betAmount: true, createdAt: true },
  });
  const emailCollisions = await prisma.$queryRaw<{ account_ids: string[]; count: bigint }[]>`
    SELECT array_agg(id) AS account_ids, count(*) AS count
    FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1
  `;
  console.log(JSON.stringify({ pendingGolf, emailCollisions }, (_, value) =>
    typeof value === "bigint" ? value.toString() : value, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
