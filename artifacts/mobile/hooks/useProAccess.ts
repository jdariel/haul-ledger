import { router } from "expo-router";
import { useSubscription } from "@/lib/revenuecat";

/**
 * Reusable hook for gating premium features.
 *
 * Example:
 *   const { isPro, requirePro } = useProAccess();
 *   const handlePress = () => {
 *     if (!requirePro("ifta")) return;
 *     router.push("/ifta");
 *   };
 */
export function useProAccess() {
  const { isSubscribed, isLoading } = useSubscription();
  const isPro = isSubscribed;

  /**
   * Routes to the soft-wall intro first; the user taps "Continue" to reach the paywall.
   * Pass `skipIntro: true` when the user is already on the paywall context (e.g. tapping
   * a Pro chip from inside the paywall itself).
   */
  function showPaywall(feature?: string, opts?: { skipIntro?: boolean }) {
    const target = opts?.skipIntro ? "/paywall" : "/pro-intro";
    router.push(feature ? `${target}?feature=${encodeURIComponent(feature)}` : target);
  }

  /** Returns true if the caller may proceed; false (and routes to paywall) otherwise. */
  function requirePro(feature?: string): boolean {
    if (isPro) return true;
    showPaywall(feature);
    return false;
  }

  return { isPro, isLoading, showPaywall, requirePro };
}
