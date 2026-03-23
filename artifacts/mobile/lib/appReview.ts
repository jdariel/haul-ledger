/**
 * In-app review prompt helper.
 *
 * Triggers Apple's / Google's native rating dialog after the user has logged
 * enough entries to be genuinely engaged with the app. The OS decides whether
 * to actually show the dialog (both platforms enforce their own frequency caps).
 *
 * Strategy:
 *  - Increment a persistent "entry count" every time the user creates a new
 *    expense, income, fuel entry, or trip (NOT on edits).
 *  - Trigger at milestones: 10, 25, 50 entries.
 *  - Enforce a 60-day cooldown between prompts to avoid annoying the user.
 *  - Fire-and-forget: never throws, never blocks the UI.
 */

import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  entryCount: "haul_ledger_review_entry_count",
  lastPromptMs: "haul_ledger_review_last_prompt_ms",
};

const MILESTONES = [10, 25, 50];
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Call this once after every successful *create* (not edit).
 * It silently checks eligibility and fires the OS review dialog if due.
 */
export async function trackEntryAndRequestReview(): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return; // Simulator, web, or unsupported OS

    // Increment counter
    const raw = await AsyncStorage.getItem(KEYS.entryCount);
    const count = (parseInt(raw ?? "0", 10) || 0) + 1;
    await AsyncStorage.setItem(KEYS.entryCount, String(count));

    // Only fire on milestone counts
    if (!MILESTONES.includes(count)) return;

    // Enforce cooldown
    const lastRaw = await AsyncStorage.getItem(KEYS.lastPromptMs);
    const lastMs = lastRaw ? parseInt(lastRaw, 10) : 0;
    if (Date.now() - lastMs < COOLDOWN_MS) return;

    // Request the review
    await StoreReview.requestReview();
    await AsyncStorage.setItem(KEYS.lastPromptMs, String(Date.now()));
  } catch {
    // Non-fatal — review prompt is best-effort
  }
}
