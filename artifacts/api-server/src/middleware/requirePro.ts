import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

// Caches isPro lookups briefly to avoid hitting the DB on every request.
const cache = new Map<number, { isPro: boolean; expires: number }>();
const TTL_MS = 30_000;

export async function requirePro(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Authentication required." });

  const now = Date.now();
  const cached = cache.get(userId);
  let isPro: boolean;

  if (cached && cached.expires > now) {
    isPro = cached.isPro;
  } else {
    const rows = await db
      .select({ isPro: usersTable.isPro })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    isPro = rows[0]?.isPro ?? false;
    cache.set(userId, { isPro, expires: now + TTL_MS });
  }

  if (!isPro) {
    return res.status(403).json({ error: "Pro subscription required", code: "PRO_REQUIRED" });
  }
  return next();
}

export function invalidateProCache(userId: number) {
  cache.delete(userId);
}
