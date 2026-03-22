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
import { count, sum, gte, isNotNull } from "drizzle-orm";
import {
  db, usersTable, expensesTable, incomeTable,
  fuelEntriesTable, tripsTable, quickExpensesTable, savedRoutesTable,
} from "@workspace/db";
import { sendPushNotifications } from "../lib/notifications";
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

// GET /api/admin/stats — aggregate app usage metrics
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      [userStats],
      [newUsersThisWeek],
      [newUsersThisMonth],
      [expenseStats],
      [incomeStats],
      [fuelStats],
      [tripStats],
      [quickExpenseStats],
      [savedRouteStats],
    ] = await Promise.all([
      db.select({
        totalUsers: count(),
        usersWithPush: count(usersTable.expoPushToken),
      }).from(usersTable),

      db.select({ count: count() })
        .from(usersTable)
        .where(gte(usersTable.createdAt, oneWeekAgo)),

      db.select({ count: count() })
        .from(usersTable)
        .where(gte(usersTable.createdAt, oneMonthAgo)),

      db.select({
        count: count(),
        totalAmount: sum(expensesTable.amount),
      }).from(expensesTable),

      db.select({
        count: count(),
        totalAmount: sum(incomeTable.amount),
      }).from(incomeTable),

      db.select({
        count: count(),
        totalGallons: sum(fuelEntriesTable.gallons),
        totalSpent: sum(fuelEntriesTable.totalAmount),
      }).from(fuelEntriesTable),

      db.select({
        count: count(),
        totalLoadedMiles: sum(tripsTable.loadedMiles),
        totalEmptyMiles: sum(tripsTable.emptyMiles),
      }).from(tripsTable),

      db.select({ count: count() }).from(quickExpensesTable),

      db.select({ count: count() }).from(savedRoutesTable),
    ]);

    const totalExpenses = parseFloat(expenseStats.totalAmount ?? "0");
    const totalIncome = parseFloat(incomeStats.totalAmount ?? "0");
    const totalFuelSpent = parseFloat(fuelStats.totalSpent ?? "0");
    const totalLoadedMiles = parseFloat(tripStats.totalLoadedMiles ?? "0");
    const totalEmptyMiles = parseFloat(tripStats.totalEmptyMiles ?? "0");

    res.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: userStats.totalUsers,
        newThisWeek: newUsersThisWeek.count,
        newThisMonth: newUsersThisMonth.count,
        withPushToken: userStats.usersWithPush,
        pushReachPct: userStats.totalUsers > 0
          ? `${((userStats.usersWithPush / userStats.totalUsers) * 100).toFixed(1)}%`
          : "0%",
      },
      expenses: {
        count: expenseStats.count,
        totalDollars: totalExpenses.toFixed(2),
      },
      income: {
        count: incomeStats.count,
        totalDollars: totalIncome.toFixed(2),
      },
      netProfit: (totalIncome - totalExpenses).toFixed(2),
      fuel: {
        count: fuelStats.count,
        totalGallons: parseFloat(fuelStats.totalGallons ?? "0").toFixed(1),
        totalSpentDollars: totalFuelSpent.toFixed(2),
      },
      trips: {
        count: tripStats.count,
        totalLoadedMiles: totalLoadedMiles.toFixed(1),
        totalEmptyMiles: totalEmptyMiles.toFixed(1),
        totalMiles: (totalLoadedMiles + totalEmptyMiles).toFixed(1),
      },
      quickExpenseTemplates: quickExpenseStats.count,
      savedRoutes: savedRouteStats.count,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// POST /api/admin/push-broadcast — send a push notification to every user with a push token
router.post("/push-broadcast", requireAdmin, async (req, res) => {
  const { title, body, data } = req.body as {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required." });
    return;
  }
  if (!body || typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "body is required." });
    return;
  }

  try {
    const users = await db
      .select({ expoPushToken: usersTable.expoPushToken })
      .from(usersTable)
      .where(isNotNull(usersTable.expoPushToken));

    const tokens = users.map((u) => u.expoPushToken);
    const receipts = await sendPushNotifications(tokens, {
      title: title.trim(),
      body: body.trim(),
      data: data ?? {},
      sound: "default",
    });

    const succeeded = receipts.filter((r) => r.status === "ok").length;
    const failed = receipts.filter((r) => r.status === "error").length;

    console.log(`[admin] Push broadcast: ${succeeded} sent, ${failed} failed — "${title}"`);

    res.json({
      ok: true,
      targeted: tokens.length,
      sent: receipts.length,
      succeeded,
      failed,
      failedReceipts: failed > 0 ? receipts.filter((r) => r.status === "error") : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

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
