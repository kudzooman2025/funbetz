/**
 * Renames a user's username.
 * Usage: npx tsx prisma/rename-user.ts <email> <newUsername>
 */

import path from "node:path";
import * as dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email = process.argv[2];
  const newUsername = process.argv[3];

  if (!email || !newUsername) {
    console.error("Usage: npx tsx prisma/rename-user.ts <email> <newUsername>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { username: newUsername },
  });

  console.log(`✅ Username updated: ${user.username} → ${newUsername}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await pool.end(); });
