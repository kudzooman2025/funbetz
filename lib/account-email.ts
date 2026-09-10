import type { PrismaClient } from "@/generated/prisma/client";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Legacy mixed-case addresses work without rewriting accounts or merging users.
 * Ambiguous legacy addresses fail closed until an admin resolves the collision.
 */
export async function findUserByEmail(prisma: PrismaClient, email: string) {
  const users = await prisma.user.findMany({
    where: { email: { equals: normalizeEmail(email), mode: "insensitive" } },
    take: 2,
  });
  return users.length === 1 ? users[0] : null;
}
