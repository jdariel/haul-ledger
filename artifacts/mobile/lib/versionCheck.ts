import Constants from "expo-constants";
import { API_BASE_URL } from "@/constants/api";

/**
 * Compare two semver strings (X.Y.Z).
 * Returns true if `a` is >= `b`.
 */
export function semverGte(a: string, b: string): boolean {
  const parse = (s: string): number[] =>
    s.split(".").map((n) => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch >= bPatch;
}

export interface VersionCheckResult {
  updateRequired: boolean;
  currentVersion: string;
  minVersion: string;
}

/**
 * Fetches the server's minimum required version and compares it with
 * the installed app version. Call this on every cold start.
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";

  const res = await fetch(`${API_BASE_URL}/healthz`, { method: "GET" });

  if (!res.ok) {
    // If the health check itself fails, don't block the user — let them continue.
    return { updateRequired: false, currentVersion, minVersion: "1.0.0" };
  }

  const data = await res.json();
  const minVersion: string = data.minVersion ?? "1.0.0";

  return {
    updateRequired: !semverGte(currentVersion, minVersion),
    currentVersion,
    minVersion,
  };
}
