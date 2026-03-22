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
import {
  runBackup,
  listBackups,
  pruneOldBackups,
  getBackupDownloadUrl,
  RETENTION_DAYS,
  GCS_BUCKET,
} from "../lib/backup";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAdmin(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  if (!ADMIN_SECRET) {
    res.status(503).json({ error: "Admin endpoints are disabled. Set ADMIN_SECRET to enable them." });
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
        gcsObjectName: result.gcsObjectName,
        gcsBucket: GCS_BUCKET,
      },
      pruned: deleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// GET /api/admin/backups — list all local backup files
router.get("/backups", requireAdmin, async (_req, res) => {
  try {
    const backups = await listBackups();
    res.json({
      retentionDays: RETENTION_DAYS,
      gcsBucket: GCS_BUCKET,
      count: backups.length,
      backups: backups.map((b) => ({
        filename: b.filename,
        size: formatBytes(b.sizeBytes),
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt.toISOString(),
        gcsObjectName: GCS_BUCKET ? `backups/${b.filename}` : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// GET /api/admin/backups/:filename/download — get a 1-hour signed GCS download URL
router.get("/backups/:filename/download", requireAdmin, async (req, res) => {
  if (!GCS_BUCKET) {
    res.status(503).json({ error: "GCS not configured — download URLs are unavailable." });
    return;
  }
  try {
    const { filename } = req.params;
    // Basic safety: only allow well-formed backup filenames
    if (!/^backup_[\dT\-Z]+\.sql\.gz$/.test(filename)) {
      res.status(400).json({ error: "Invalid backup filename" });
      return;
    }
    const downloadUrl = await getBackupDownloadUrl(filename);
    res.json({ ok: true, filename, downloadUrl, expiresInSeconds: 3600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ ok: false, error: message });
  }
});

export default router;
