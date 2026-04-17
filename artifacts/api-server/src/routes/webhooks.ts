import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { invalidateProCache } from "../middleware/requirePro";

const router: IRouter = Router();

// Events that grant Pro
const ACTIVATING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "TRIAL_STARTED",
  "TRIAL_CONVERTED",
  "NON_RENEWING_PURCHASE",
]);

// Events that revoke Pro
const REVOKING = new Set([
  "EXPIRATION",
  "CANCELLATION", // Note: cancellation only revokes here if you want immediate revocation; usually wait for EXPIRATION.
  "REFUND",
  "SUBSCRIPTION_PAUSED",
  "TRIAL_CANCELLED",
]);

router.post("/revenuecat", async (req, res) => {
  // Auth via shared secret in Authorization header — fail-CLOSED.
  // RevenueCat dashboard: Project Settings → Integrations → Webhooks → Authorization header.
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[revenuecat] REVENUECAT_WEBHOOK_SECRET not set — rejecting webhook");
    return res.status(503).json({ error: "Webhook secret not configured" });
  }
  const got = req.headers.authorization;
  if (got !== expected && got !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const event = req.body?.event;
  if (!event?.type) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // app_user_id we set via Purchases.logIn(userId.toString())
  const appUserId = event.app_user_id || event.original_app_user_id;
  const numericUserId = parseInt(appUserId, 10);
  if (!Number.isFinite(numericUserId)) {
    // Anonymous user before login — nothing to update on our side
    return res.status(200).json({ received: true, note: "non-numeric app_user_id" });
  }

  const type: string = event.type;
  let nextIsPro: boolean | null = null;
  let proExpiresAt: Date | null = null;

  if (ACTIVATING.has(type)) {
    nextIsPro = true;
    if (event.expiration_at_ms) proExpiresAt = new Date(event.expiration_at_ms);
  } else if (REVOKING.has(type)) {
    nextIsPro = false;
  } else if (type === "BILLING_ISSUE") {
    // Keep current state; just log
    console.log(`[revenuecat] BILLING_ISSUE for user ${numericUserId}`);
  } else if (type === "TEST") {
    return res.status(200).json({ received: true, note: "test event" });
  }

  if (nextIsPro !== null) {
    await db
      .update(usersTable)
      .set({ isPro: nextIsPro, ...(proExpiresAt ? { proExpiresAt } : {}) })
      .where(eq(usersTable.id, numericUserId));
    invalidateProCache(numericUserId);
    console.log(`[revenuecat] ${type} → user ${numericUserId} isPro=${nextIsPro}`);
  }

  return res.status(200).json({ received: true });
});

export default router;
