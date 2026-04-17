import React, { createContext, useContext, useEffect, useRef } from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { useMutation, useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

// Module-level reference so identify/reset (called from AuthContext, outside React)
// can refresh the subscription cache after RevenueCat user identity changes.
let queryClientRef: QueryClient | null = null;

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

// Lookup key set in seedRevenueCat.ts
export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found");
  }

  // Use test store key in dev, on web, and inside Expo Go
  if (
    __DEV__ ||
    Platform.OS === "web" ||
    Constants.executionEnvironment === "storeClient"
  ) {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

let initialized = false;

export function initializeRevenueCat() {
  if (initialized) return;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error("RevenueCat Public API Key not found");
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  initialized = true;
  console.log("Configured RevenueCat");
}

/**
 * Identify the current user with RevenueCat. Call after login.
 * Pass a stable string id (we use our numeric user id stringified).
 */
export async function identifyRevenueCatUser(userId: string | number) {
  try {
    const { customerInfo } = await Purchases.logIn(String(userId));
    // Push the post-login customerInfo into the cache so any UI gating
    // (useProAccess) reflects the new identity immediately.
    queryClientRef?.setQueryData(["revenuecat", "customer-info"], customerInfo);
    queryClientRef?.invalidateQueries({ queryKey: ["revenuecat", "offerings"] });
  } catch (err) {
    console.warn("RevenueCat logIn failed", err);
  }
}

export async function resetRevenueCatUser() {
  try {
    await Purchases.logOut();
    // After logOut, refetch so a previously-Pro user is no longer treated as Pro.
    queryClientRef?.invalidateQueries({ queryKey: ["revenuecat"] });
  } catch (err) {
    // logOut throws if already anonymous — safe to ignore
  }
}

function useSubscriptionContext() {
  const queryClient = useQueryClient();
  // Make this client available to module-level identify/reset helpers.
  if (queryClientRef !== queryClient) queryClientRef = queryClient;

  const customerInfoQuery = useQuery<CustomerInfo>({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => Purchases.getOfferings(),
    staleTime: 5 * 60 * 1000,
  });

  // Listen for live customer-info updates from RevenueCat
  const listenerSet = useRef(false);
  useEffect(() => {
    if (listenerSet.current) return;
    listenerSet.current = true;
    const handler = (info: CustomerInfo) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    };
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(handler);
    };
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: (info) => {
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    },
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    currentOffering: (offeringsQuery.data?.current ?? null) as PurchasesOffering | null,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    refetch: () => customerInfoQuery.refetch(),
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error as Error | null,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
