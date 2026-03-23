import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useSummary } from "../../hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

const TAB_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6, tension: 80 }).start();
  };

  const closeFab = () => {
    setFabOpen(false);
    Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6, tension: 80 }).start();
  };

  const handleAction = (action: "expense" | "income" | "scan" | "trip") => {
    closeFab();
    setTimeout(() => {
      if (action === "expense") router.push("/add-expense");
      else if (action === "income") router.push("/add-income");
      else if (action === "scan") router.push("/add-expense?scan=1");
      else if (action === "trip") router.push("/add-trip");
    }, 150);
  };

  const { data: summary, refetch: refetchSummary } = useSummary(period);

  useFocusEffect(
    useCallback(() => {
      refetchSummary();
    }, [period])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchSummary();
    setRefreshing(false);
  };

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const weeklyMiles = summary?.weeklyMiles ?? 0;
  const recentActivity: any[] = summary?.recentActivity ?? [];

  const s = makeStyles(C);

  const handleActivityPress = (item: any) => {
    if (item.type === "expense") {
      router.push(`/expense-detail?id=${item.id}`);
    } else {
      router.push(`/income-detail?id=${item.id}`);
    }
  };

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
          <Text style={s.title}>{period === "week" ? "This Week" : "This Month"}</Text>
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

          <TouchableOpacity style={s.statCard} onPress={() => router.push("/trips")}>
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
        </View>

        {/* Recent Activity */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/expenses")}>
              <Text style={[s.viewAll, { color: C.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No recent activity.</Text>
            </View>
          ) : (
            recentActivity.map((item: any, i: number) => {
              const isIncome = item.type === "income";
              const displayDate = item.date
                ? new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—";
              return (
                <TouchableOpacity
                  key={i}
                  style={s.actRow}
                  onPress={() => handleActivityPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.actIcon, { backgroundColor: isIncome ? C.greenLight : C.redLight }]}>
                    <Ionicons
                      name={isIncome ? "trending-up" : "receipt-outline"}
                      size={15}
                      color={isIncome ? C.green : C.red}
                    />
                  </View>
                  <View style={s.actInfo}>
                    <Text style={s.actName} numberOfLines={1}>
                      {item.description || (isIncome ? "Income" : "Expense")}
                    </Text>
                    <Text style={s.actDate}>{displayDate}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[s.actAmt, { color: isIncome ? C.green : C.red }]}>
                      {isIncome ? "+" : "-"}${Math.abs(Number(item.amount)).toFixed(2)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Speed Dial Overlay */}
      {fabOpen && (
        <Pressable style={s.overlay} onPress={closeFab} />
      )}

      {/* Speed Dial Actions */}
      {fabOpen && (
        <View style={[s.dialContainer, { bottom: TAB_BAR_HEIGHT + insets.bottom + 88 }]}>
          <SpeedDialItem
            anim={fabAnim}
            delay={0}
            label="Add Income"
            icon="trending-up"
            iconColor="#fff"
            bgColor={C.green}
            onPress={() => handleAction("income")}
          />
          <SpeedDialItem
            anim={fabAnim}
            delay={40}
            label="Add Expense"
            icon="receipt-outline"
            iconColor="#fff"
            bgColor={C.red}
            onPress={() => handleAction("expense")}
          />
          <SpeedDialItem
            anim={fabAnim}
            delay={80}
            label="Log Trip"
            icon="navigate-outline"
            iconColor="#fff"
            bgColor={C.teal}
            onPress={() => handleAction("trip")}
          />
          <SpeedDialItem
            anim={fabAnim}
            delay={120}
            label="Scan Receipt"
            icon="scan-outline"
            iconColor="#fff"
            bgColor={C.orange}
            onPress={() => handleAction("scan")}
          />
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: C.primary, bottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        onPress={toggleFab}
        activeOpacity={0.85}
      >
        <Animated.View style={{
          transform: [{
            rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] })
          }]
        }}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SpeedDialItem({ anim, delay, label, icon, iconColor, bgColor, onPress }: any) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <Animated.View style={[sdStyles.row, { opacity, transform: [{ translateY }] }]}>
      <Text style={sdStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[sdStyles.miniFab, { backgroundColor: bgColor }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const sdStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 12,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
  },
  miniFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

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
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      zIndex: 10,
    },
    dialContainer: {
      position: "absolute",
      right: 20,
      zIndex: 20,
    },
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
      zIndex: 30,
    },
  });
}
