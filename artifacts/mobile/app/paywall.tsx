import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";
import { useSubscription } from "@/lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: "trending-up-outline", title: "Profit per mile", sub: "See your real cost-per-mile and profit-per-mile in real time." },
  { icon: "map-outline", title: "IFTA made easy", sub: "Track jurisdiction miles and fuel for quarterly filings." },
  { icon: "bar-chart-outline", title: "Advanced reports", sub: "Export CSV, PDF and Schedule C-ready summaries." },
  { icon: "bus-outline", title: "Manage multiple trucks", sub: "Fleet view with per-truck profitability." },
  { icon: "cloud-upload-outline", title: "Secure backups", sub: "Automatic cloud backup of every record." },
  { icon: "calculator-outline", title: "Load Evaluator+", sub: "CPM-based verdicts using your own cost basis." },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() !== "light";
  const C = Colors[isDark ? "dark" : "light"];
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const {
    currentOffering,
    isLoading,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
    isSubscribed,
    refetch,
  } = useSubscription();

  const monthlyPkg = currentOffering?.monthly ?? null;
  const annualPkg = currentOffering?.annual ?? null;
  const availablePackages = currentOffering?.availablePackages ?? [];
  // Fallback when monthly/annual aren't tagged: use the first 1-2 generic packages.
  const useGenericFallback = !monthlyPkg && !annualPkg && availablePackages.length > 0;
  const fallbackPrimary: PurchasesPackage | null = useGenericFallback ? availablePackages[0] : null;
  const fallbackSecondary: PurchasesPackage | null = useGenericFallback ? (availablePackages[1] ?? null) : null;

  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  const selectedPkg: PurchasesPackage | null = useGenericFallback
    ? (selected === "annual" ? (fallbackSecondary ?? fallbackPrimary) : fallbackPrimary)
    : (selected === "annual" ? (annualPkg ?? monthlyPkg) : (monthlyPkg ?? annualPkg));

  // If they become subscribed (e.g. successful purchase or restore), close paywall.
  useEffect(() => {
    if (isSubscribed) {
      const t = setTimeout(() => router.back(), 600);
      return () => clearTimeout(t);
    }
  }, [isSubscribed]);

  const annualSavings = useMemo(() => {
    if (!monthlyPkg || !annualPkg) return null;
    const m = monthlyPkg.product.price;
    const a = annualPkg.product.price;
    if (!m || !a) return null;
    const yearly = m * 12;
    if (yearly <= a) return null;
    return Math.round(((yearly - a) / yearly) * 100);
  }, [monthlyPkg, annualPkg]);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    try {
      await purchase(selectedPkg);
    } catch (err: any) {
      // RevenueCat throws userCancelled — silently swallow
      if (err?.userCancelled) return;
      Alert.alert("Purchase failed", err?.message ?? "Something went wrong");
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      await refetch();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (err: any) {
      Alert.alert("Restore failed", err?.message ?? "No previous purchases found.");
    }
  };

  const s = makeStyles(C);

  return (
    <View style={[s.container, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ["#1e293b", "#0b1121"] : ["#dbeafe", "#f2f2f7"]}
        style={[s.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
            <Text style={[s.restore, { color: C.primary }]}>
              {isRestoring ? "Restoring…" : "Restore"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.crownWrap}>
          <View style={[s.crownCircle, { backgroundColor: "#f59e0b" }]}>
            <Ionicons name="star" size={32} color="#fff" />
          </View>
        </View>
        <Text style={[s.title, { color: C.text }]}>Upgrade to HaulIQ Pro</Text>
        <Text style={[s.subtitle, { color: C.textSecondary }]}>
          {feature
            ? `Unlock ${feature} and every Pro feature.`
            : "Unlock every Pro feature, no limits."}
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 200 }]}
      >
        {BENEFITS.map((b) => (
          <View key={b.title} style={[s.benefitRow, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
            <View style={[s.benefitIcon, { backgroundColor: C.primaryLight }]}>
              <Ionicons name={b.icon} size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.benefitTitle, { color: C.text }]}>{b.title}</Text>
              <Text style={[s.benefitSub, { color: C.textSecondary }]}>{b.sub}</Text>
            </View>
          </View>
        ))}

        <Text style={[s.legal, { color: C.textMuted }]}>
          Auto-renewable subscription. Cancel anytime in your{" "}
          {Platform.OS === "android" ? "Google Play" : "App Store"} settings.
        </Text>
      </ScrollView>

      <View
        style={[
          s.footer,
          { backgroundColor: C.card, borderColor: C.cardBorder, paddingBottom: insets.bottom + 12 },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} />
        ) : !currentOffering ? (
          <Text style={[s.errorText, { color: C.red }]}>
            Subscription offerings unavailable. Please try again later.
          </Text>
        ) : (
          <>
            <View style={s.pkgRow}>
              {useGenericFallback ? (
                <>
                  {fallbackPrimary && (
                    <PackageOption
                      selected={selected === "monthly"}
                      label={fallbackPrimary.product.title || "Plan A"}
                      price={fallbackPrimary.product.priceString}
                      sub={fallbackPrimary.product.description || ""}
                      onPress={() => setSelected("monthly")}
                      C={C}
                    />
                  )}
                  {fallbackSecondary && (
                    <PackageOption
                      selected={selected === "annual"}
                      label={fallbackSecondary.product.title || "Plan B"}
                      price={fallbackSecondary.product.priceString}
                      sub={fallbackSecondary.product.description || ""}
                      badge="BEST"
                      onPress={() => setSelected("annual")}
                      C={C}
                    />
                  )}
                </>
              ) : (
                <>
                  {monthlyPkg && (
                    <PackageOption
                      selected={selected === "monthly"}
                      label="Monthly"
                      price={monthlyPkg.product.priceString}
                      sub="per month"
                      onPress={() => setSelected("monthly")}
                      C={C}
                    />
                  )}
                  {annualPkg && (
                    <PackageOption
                      selected={selected === "annual"}
                      label="Annual"
                      price={annualPkg.product.priceString}
                      sub={annualSavings ? `Save ${annualSavings}%` : "per year"}
                      badge={annualSavings ? `${annualSavings}% OFF` : "BEST"}
                      onPress={() => setSelected("annual")}
                      C={C}
                    />
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[s.cta, { backgroundColor: C.primary, opacity: isPurchasing || !selectedPkg ? 0.7 : 1 }]}
              onPress={handlePurchase}
              disabled={isPurchasing || !selectedPkg}
              activeOpacity={0.85}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.ctaText}>
                  {selectedPkg?.product.introPrice ? "Start Free Trial" : "Upgrade to Pro"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function PackageOption({
  selected, label, price, sub, badge, onPress, C,
}: {
  selected: boolean; label: string; price: string; sub: string; badge?: string; onPress: () => void; C: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        ps.box,
        {
          backgroundColor: selected ? C.primaryLight : C.background,
          borderColor: selected ? C.primary : C.cardBorder,
        },
      ]}
    >
      {badge && (
        <View style={[ps.badge, { backgroundColor: "#f59e0b" }]}>
          <Text style={ps.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[ps.label, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[ps.price, { color: C.text }]}>{price}</Text>
      <Text style={[ps.sub, { color: C.textMuted }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    headerGradient: { paddingHorizontal: 16, paddingBottom: 20 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    closeBtn: { padding: 4 },
    restore: { fontSize: 15, fontWeight: "600" },
    crownWrap: { alignItems: "center", marginTop: 4, marginBottom: 8 },
    crownCircle: {
      width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 4 },
    subtitle: { fontSize: 14, textAlign: "center", marginTop: 6, paddingHorizontal: 16 },
    body: { padding: 16, gap: 10 },
    benefitRow: {
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      padding: 14, borderRadius: 14, borderWidth: 1,
    },
    benefitIcon: {
      width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    },
    benefitTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
    benefitSub: { fontSize: 13, lineHeight: 18 },
    legal: { fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 16 },
    footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      borderTopWidth: 1, padding: 16, gap: 12,
    },
    pkgRow: { flexDirection: "row", gap: 10 },
    cta: {
      paddingVertical: 16, borderRadius: 14, alignItems: "center", justifyContent: "center",
    },
    ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    errorText: { textAlign: "center", fontSize: 14 },
  });
}

const ps = StyleSheet.create({
  box: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, position: "relative",
  },
  badge: {
    position: "absolute", top: -8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  price: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  sub: { fontSize: 11, marginTop: 2 },
});
