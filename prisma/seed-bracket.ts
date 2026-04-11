/**
 * Seed the VA26 U13 Academy Division bracket challenge.
 * Run after `prisma db push` creates the new tables:
 *   npx tsx prisma/seed-bracket.ts
 */

import path from "node:path";
import * as dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Lock time: May 1 2026 at 7:45am EDT (11:45 UTC) — first kickoff
  const lockTime = new Date("2026-05-01T11:45:00Z");

  const challenge = await prisma.bracketChallenge.upsert({
    where: { id: "va26-u13-ad" },
    create: {
      id: "va26-u13-ad",
      name: "VA Regional U13 AD Bracket",
      description:
        "Pick winners all the way through the MLS NEXT Cup Virginia Regional U13 Academy Division — group stage, R16, quarter-finals, semi-finals, and final.",
      sport: "MLSNEXT",
      lockTime,
    },
    update: {
      name: "VA Regional U13 AD Bracket",
      description:
        "Pick winners all the way through the MLS NEXT Cup Virginia Regional U13 Academy Division — group stage, R16, quarter-finals, semi-finals, and final.",
      lockTime,
    },
  });

  console.log(`✅ BracketChallenge upserted: ${challenge.id} — "${challenge.name}"`);
  console.log(`   Lock time: ${challenge.lockTime.toISOString()} (${challenge.lockTime.toLocaleString("en-US", { timeZone: "America/New_York" })} EDT)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
