/**
 * Admin-only routes.
 *
 * Protected by ADMIN_SECRET env var. Pass the secret as:
 *   Authorization: Bearer <ADMIN_SECRET>
 *
 * These endpoints are intentionally NOT exposed through normal auth so that
 * server-to-server tooling (cron triggers, monitoring scripts) can call them
 * without a user JWT.
 */

import { Router } from "express";
import { runBackup, listBackups, pruneOldBackups, RETENTION_DAYS } from "../lib/backup";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAdmin(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  if (!ADMIN_SECRET) {
    // No secret configured — endpoint is disabled
    res.status(503).json({ error: "Admin endpoints are not enabled. Set ADMIN_SECRET to enable them." });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// POST /api/admin/backup — trigger a manual backup immediately
router.post("/backup", requireAdmin, async (_req, res) => {
  try {
    const result = await runBackup();
    const deleted = await pruneOldBackups();
    res.json({
      ok: true,
      backup: {
        filename: result.filename,
        size: formatBytes(result.sizeBytes),
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
      },
      pruned: deleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// GET /api/admin/backups — list all backup files
router.get("/backups", requireAdmin, async (_req, res) => {
  try {
    const backups = await listBackups();
    res.json({
      retentionDays: RETENTION_DAYS,
      count: backups.length,
      backups: backups.map((b) => ({
        filename: b.filename,
        size: formatBytes(b.sizeBytes),
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
