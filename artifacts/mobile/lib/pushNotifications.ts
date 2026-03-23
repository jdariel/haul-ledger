/**
 * Push notification helper.
 *
 * Handles permission requests, Expo push token retrieval, and token
 * registration with the HaulLedger API. Call `registerPushToken()` once
 * after the user logs in or the app restores a session.
 *
 * Push notifications require a physical device; the function is a no-op
 * on simulators and web.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { API_BASE_URL } from "@/constants/api";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, retrieves the Expo push token, and registers it
 * with the server. Safe to call multiple times — idempotent.
 *
 * @param authToken  The user's JWT (passed to the API to authenticate the request)
 */
export async function registerPushToken(authToken: string): Promise<void> {
  // Push tokens only work on real physical devices
  if (!Device.isDevice) return;
  // Web doesn't support push notifications
  if (Platform.OS === "web") return;

  try {
    // Request / check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      // User denied — silently bail out
      return;
    }

    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "HaulLedger",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3b82f6",
      });
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Register with the server (fire-and-forget; don't block the auth flow)
    await fetch(`${API_BASE_URL}/auth/push-token`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    // Non-fatal — push is a best-effort feature
    console.warn("[pushNotifications] Failed to register push token:", err);
  }
}

/**
 * Clears the push token from the server on logout, so the user
 * stops receiving notifications after they sign out.
 */
export async function unregisterPushToken(authToken: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await fetch(`${API_BASE_URL}/auth/push-token`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: null }),
    });
  } catch {
    // Ignore errors on logout
  }
}
