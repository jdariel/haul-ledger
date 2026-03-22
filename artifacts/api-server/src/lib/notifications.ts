/**
 * Expo Push Notification service.
 *
 * Uses the Expo Push API (https://exp.host/--/api/v2/push/send) — no SDK
 * required on the server; it's a simple HTTPS POST.
 *
 * Expo handles APNS (iOS) and FCM (Android) routing automatically.
 * Tokens look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]
 */

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

export interface PushReceipt {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: unknown;
}

/**
 * Send a push notification to one or more Expo push tokens.
 * Silently skips invalid/null tokens.
 * Returns the per-ticket receipts from Expo.
 */
export async function sendPushNotifications(
  tokens: (string | null | undefined)[],
  message: PushMessage
): Promise<PushReceipt[]> {
  const validTokens = tokens.filter(
    (t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken[")
  );

  if (validTokens.length === 0) return [];

  const messages = validTokens.map((token) => ({
    to: token,
    sound: message.sound ?? "default",
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    badge: message.badge,
  }));

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[notifications] Expo push API error: ${response.status}`);
      return [];
    }

    const json = await response.json() as { data: PushReceipt[] };
    return json.data ?? [];
  } catch (err) {
    console.error("[notifications] Failed to send push notification:", err);
    return [];
  }
}

/**
 * Send a push notification to a single user's token.
 * Convenience wrapper around sendPushNotifications.
 */
export async function sendPushToUser(
  expoPushToken: string | null | undefined,
  message: PushMessage
): Promise<void> {
  if (!expoPushToken) return;
  const receipts = await sendPushNotifications([expoPushToken], message);
  const failed = receipts.filter((r) => r.status === "error");
  if (failed.length > 0) {
    console.warn("[notifications] Push delivery error:", failed);
  }
}
