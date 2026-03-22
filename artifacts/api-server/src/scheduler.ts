/**
 * Background job scheduler.
 *
 * Currently schedules a daily database backup at 02:00 UTC.
 * Add other recurring tasks here rather than in individual route files.
 */

import cron from "node-cron";
import { runBackup, pruneOldBackups, RETENTION_DAYS, GCS_BUCKET } from "./lib/backup";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function performBackup() {
  console.log("[backup] Starting scheduled database backup…");
  try {
    const result = await runBackup();

    const gcsMsg = result.gcsObjectName
      ? ` → GCS: gs://${GCS_BUCKET}/${result.gcsObjectName}`
      : GCS_BUCKET
        ? " ⚠️  GCS upload failed (local copy retained)"
        : " (GCS not configured — local only)";

    console.log(
      `[backup] ✅ Created ${result.filename} (${formatBytes(result.sizeBytes)}) in ${result.durationMs}ms${gcsMsg}`
    );

    const deleted = await pruneOldBackups();
    if (deleted.length > 0) {
      console.log(
        `[backup] 🗑️  Pruned ${deleted.length} local backup(s) older than ${RETENTION_DAYS} days: ${deleted.join(", ")}`
      );
    }
  } catch (err) {
    console.error("[backup] ❌ Backup failed:", err);
  }
}

export function startScheduler() {
  // Daily at 02:00 UTC
  cron.schedule("0 2 * * *", performBackup, { timezone: "UTC" });

  const gcsStatus = GCS_BUCKET
    ? `✅ GCS bucket: ${GCS_BUCKET}`
    : "⚠️  GCS not configured (local-only backups)";

  console.log(`[scheduler] Daily database backup scheduled at 02:00 UTC — ${gcsStatus}`);
}
