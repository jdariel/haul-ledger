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

  function showPaywall(feature?: string) {
    router.push(feature ? `/paywall?feature=${encodeURIComponent(feature)}` : "/paywall");
  }

  /** Returns true if the caller may proceed; false (and routes to paywall) otherwise. */
  function requirePro(feature?: string): boolean {
    if (isPro) return true;
    showPaywall(feature);
    return false;
  }

  return { isPro, isLoading, showPaywall, requirePro };
}
