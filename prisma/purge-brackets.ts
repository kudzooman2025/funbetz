/**
 * Purge all bracket entries (picks) for the VA26 challenge.
 * Leaves the BracketChallenge record intact — just clears all picks.
 * Run: npx tsx prisma/purge-brackets.ts
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
  const deleted = await prisma.bracketEntry.deleteMany({
    where: { challengeId: "va26-u13-ad" },
  });
  console.log(`✅ Deleted ${deleted.count} bracket entry/entries for va26-u13-ad`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
