import { z } from "zod";
import { BET_MIN, REPLENISH_MIN, REPLENISH_MAX, MIN_PARLAY_GAMES, MAX_PARLAY_GAMES } from "./constants";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createParlaySchema = z.object({
  games: z
    .array(
      z.object({
        gameId: z.string().min(1),
        pickedTeam: z.string().min(1),
      })
    )
    .min(MIN_PARLAY_GAMES, `Must select at least ${MIN_PARLAY_GAMES} games`)
    .max(MAX_PARLAY_GAMES, `Cannot select more than ${MAX_PARLAY_GAMES} games`),
  betAmount: z.number().int().min(BET_MIN, `Minimum bet is ${BET_MIN} betz`),
});

export const replenishSchema = z.object({
  amount: z
    .number()
    .int()
    .min(REPLENISH_MIN, `Minimum replenish is ${REPLENISH_MIN} betz`)
    .max(REPLENISH_MAX, `Maximum replenish is ${REPLENISH_MAX} betz`),
});
