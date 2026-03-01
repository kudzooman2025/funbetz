import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.game.count();
  console.log("Total games in DB:", count);

  const bySport = await prisma.game.groupBy({ by: ["sport"], _count: true });
  console.log("By sport:", JSON.stringify(bySport));

  const byStatus = await prisma.game.groupBy({ by: ["status"], _count: true });
  console.log("By status:", JSON.stringify(byStatus));

  const upcoming = await prisma.game.findMany({
    where: { sport: "EPL", scheduledStart: { gte: new Date() } },
    orderBy: { scheduledStart: "asc" },
    take: 5,
    select: { homeTeam: true, awayTeam: true, scheduledStart: true, round: true, status: true },
  });
  console.log("\nUpcoming EPL games:");
  upcoming.forEach((g) =>
    console.log(`  ${g.homeTeam} vs ${g.awayTeam} - ${g.scheduledStart.toISOString()} - round ${g.round} - ${g.status}`)
  );

  // Show betting window
  const now = new Date();
  const bufferStart = new Date(now.getTime() + 60 * 60 * 1000);
  const dayOfWeek = now.getUTCDay();
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysUntilNextSunday);
  end.setUTCHours(23, 59, 59, 999);
  console.log("\nBetting window:", bufferStart.toISOString(), "to", end.toISOString());

  const inWindow = await prisma.game.count({
    where: { sport: "EPL", status: "SCHEDULED", scheduledStart: { gte: bufferStart, lte: end } },
  });
  console.log("EPL games in betting window:", inWindow);

  await prisma.$disconnect();
}

main().catch(console.error);
