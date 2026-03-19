import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useSummary, useExpenses, useIncome } from "../../hooks/useApi";

const TAB_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [refreshing, setRefreshing] = useState(false);
  const { data: summary, refetch: refetchSummary } = useSummary();
  const { data: expenses, refetch: refetchExpenses } = useExpenses();
  const { data: income, refetch: refetchIncome } = useIncome();

  useFocusEffect(
    useCallback(() => {
      refetchSummary();
      refetchExpenses();
      refetchIncome();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchExpenses(), refetchIncome()]);
    setRefreshing(false);
  };

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const weeklyMiles = summary?.weeklyMiles ?? 0;

  const recentActivity = [
    ...(income ?? []).map((i: any) => ({ ...i, _type: "income" })),
    ...(expenses ?? []).map((e: any) => ({ ...e, _type: "expense" })),
  ]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>This Week</Text>
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, period === "week" && s.toggleBtnActive]}
              onPress={() => setPeriod("week")}
            >
              <Text style={[s.toggleText, period === "week" && s.toggleTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, period === "month" && s.toggleBtnActive]}
              onPress={() => setPeriod("month")}
            >
              <Text style={[s.toggleText, period === "month" && s.toggleTextActive]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Profit Card */}
        <View style={s.profitCard}>
          <View style={s.profitTop}>
            <Text style={s.profitLabel}>NET PROFIT</Text>
            <View style={[s.iconBubble, { backgroundColor: C.greenLight }]}>
              <Ionicons name="trending-up" size={17} color={C.green} />
            </View>
          </View>
          <Text style={[s.profitAmt, { color: netProfit >= 0 ? C.green : C.red }]}>
            ${Math.abs(netProfit).toFixed(2)}
          </Text>
          <View style={s.profitMeta}>
            <View style={s.metaItem}>
              <View style={[s.dot, { backgroundColor: C.green }]} />
              <Text style={s.metaText}>${totalIncome.toFixed(2)}</Text>
            </View>
            <View style={s.metaItem}>
              <View style={[s.dot, { backgroundColor: C.orange }]} />
              <Text style={s.metaText}>${totalExpenses.toFixed(2)}</Text>
            </View>
          </View>
          <View style={s.divider} />
        </View>

        {/* Stats Grid */}
        <View style={s.grid}>
          <TouchableOpacity style={s.statCard} onPress={() => router.push("/(tabs)/income")}>
            <View style={[s.iconBubble, { backgroundColor: C.greenLight }]}>
              <Ionicons name="trending-up" size={17} color={C.green} />
            </View>
            <Text style={s.statLabel}>INCOME</Text>
            <Text style={[s.statValue, { color: C.green }]}>${totalIncome.toFixed(2)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.statCard} onPress={() => router.push("/(tabs)/expenses")}>
            <View style={[s.iconBubble, { backgroundColor: C.redLight }]}>
              <Ionicons name="trending-down" size={17} color={C.red} />
            </View>
            <Text style={s.statLabel}>EXPENSES</Text>
            <Text style={[s.statValue, { color: C.red }]}>${totalExpenses.toFixed(2)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.statCard}>
            <View style={[s.iconBubble, { backgroundColor: C.tealLight }]}>
              <Ionicons name="navigate-outline" size={17} color={C.teal} />
            </View>
            <Text style={s.statLabel}>MILES</Text>
            <Text style={[s.statValue, { color: C.text }]}>{weeklyMiles}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.statCard}>
            <View style={[s.iconBubble, { backgroundColor: C.orangeLight }]}>
              <Ionicons name="flame-outline" size={17} color={C.orange} />
            </View>
            <Text style={s.statLabel}>FUEL COST/MILE</Text>
            <Text style={[s.statValue, { color: C.text }]}>—</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.statCard, s.statCardFull]}>
            <View style={[s.iconBubble, { backgroundColor: C.tealLight }]}>
              <Ionicons name="navigate-outline" size={17} color={C.teal} />
            </View>
            <Text style={s.statLabel}>MILES THIS WEEK</Text>
            <Text style={[s.statValue, { color: C.text }]}>—</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={[s.viewAll, { color: C.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No recent activity.</Text>
            </View>
          ) : (
            recentActivity.map((item: any, i: number) => {
              const isIncome = item._type === "income";
              return (
                <View key={i} style={s.actRow}>
                  <View style={[s.actIcon, { backgroundColor: isIncome ? C.greenLight : C.redLight }]}>
                    <Ionicons
                      name={isIncome ? "trending-up" : "receipt-outline"}
                      size={15}
                      color={isIncome ? C.green : C.red}
                    />
                  </View>
                  <View style={s.actInfo}>
                    <Text style={s.actName} numberOfLines={1}>
                      {isIncome ? item.description || "Income" : item.merchant || item.category}
                    </Text>
                    <Text style={s.actDate}>
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <Text style={[s.actAmt, { color: isIncome ? C.green : C.red }]}>
                    {isIncome ? "+" : "-"}${Number(item.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: C.primary, bottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        onPress={() => router.push("/add-expense")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    content: { paddingBottom: 110, gap: 12 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    title: { fontSize: 26, fontWeight: "800", color: C.text },
    toggle: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: C.separator,
    },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    toggleBtnActive: { backgroundColor: C.primary },
    toggleText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
    toggleTextActive: { color: "#fff" },
    profitCard: {
      marginHorizontal: 16,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: C.separator,
    },
    profitTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    profitLabel: { fontSize: 11, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.6 },
    profitAmt: { fontSize: 38, fontWeight: "800", marginBottom: 8 },
    profitMeta: { flexDirection: "row", gap: 16 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    metaText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
    divider: { height: 1, backgroundColor: C.separator, marginTop: 14 },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
    statCard: {
      width: "47.5%",
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: C.separator,
    },
    statCardFull: { width: "100%" },
    iconBubble: {
      width: 34,
      height: 34,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    statLabel: { fontSize: 10, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: "800" },
    section: {
      marginHorizontal: 16,
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.separator,
    },
    sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: C.text },
    viewAll: { fontSize: 13, fontWeight: "600" },
    empty: { paddingVertical: 20, alignItems: "center" },
    emptyText: { color: C.textMuted, fontSize: 14 },
    actRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 12 },
    actIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    actInfo: { flex: 1 },
    actName: { fontSize: 14, fontWeight: "600", color: C.text },
    actDate: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    actAmt: { fontSize: 15, fontWeight: "700" },
    fab: {
      position: "absolute",
      bottom: 28,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}
