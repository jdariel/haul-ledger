import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useSummary, useQuickExpenses, useCreateExpense } from "@/hooks/useApi";
import { useAppContext } from "@/context/AppContext";

function formatCurrency(val: number) {
  return `$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Card style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <ThemedText variant="secondary" style={styles.summaryLabel}>
        {label}
      </ThemedText>
      <ThemedText
        weight="bold"
        style={[styles.summaryValue, { color }]}
      >
        {formatCurrency(value)}
      </ThemedText>
    </Card>
  );
}

function IFTABanner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const now = new Date();
  const year = now.getFullYear();
  const deadlines = [
    new Date(year, 3, 30),
    new Date(year, 6, 31),
    new Date(year, 9, 31),
    new Date(year + 1, 0, 31),
  ];

  const nextDeadline = deadlines.find((d) => d > now);
  if (!nextDeadline) return null;

  const diffMs = nextDeadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 30) return null;

  return (
    <View style={[styles.iftaBanner, { backgroundColor: theme.orange + "22", borderColor: theme.orange + "44" }]}>
      <Feather name="alert-triangle" size={16} color={theme.orange} />
      <ThemedText style={[styles.iftaText, { color: theme.orange }]}>
        IFTA due in {diffDays} days —{" "}
        {nextDeadline.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
      </ThemedText>
    </View>
  );
}

function QuickExpenseButton({ label, category, amount, onPress }: {
  label: string;
  category: string;
  amount: number;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSpring(0.95, {}, () => {
            scale.value = withSpring(1);
          });
          onPress();
        }}
        style={[
          styles.quickExpBtn,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
        activeOpacity={0.8}
      >
        <ThemedText weight="semibold" style={styles.quickExpLabel}>
          {label}
        </ThemedText>
        <ThemedText variant="secondary" style={styles.quickExpAmount}>
          ${amount}
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data: summary, isLoading } = useSummary();
  const { data: quickExpenses } = useQuickExpenses();
  const createExpense = useCreateExpense();
  const { settings } = useAppContext();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const mileageGoal = settings.mileageGoal ?? 2500;
  const weeklyMiles = summary?.weeklyMiles ?? 0;
  const mileageProgress = Math.min(weeklyMiles / mileageGoal, 1);

  const handleQuickExpense = async (item: any) => {
    try {
      await createExpense.mutateAsync({
        date: new Date().toISOString().split("T")[0],
        merchant: item.label,
        category: item.category,
        amount: item.defaultAmount,
      });
      Alert.alert("Added", `${item.label} — $${item.defaultAmount} logged`);
    } catch {
      Alert.alert("Error", "Failed to log quick expense");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: bottomPad + 100,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <ThemedText variant="secondary" style={styles.greeting}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </ThemedText>
          <ThemedText weight="bold" style={styles.appTitle}>
            HaulLedger
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/add-expense")}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <IFTABanner />

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <View style={styles.summaryRow}>
            <SummaryCard
              label="Income"
              value={summary?.totalIncome ?? 0}
              color={theme.green}
              icon="trending-up"
            />
            <SummaryCard
              label="Expenses"
              value={summary?.totalExpenses ?? 0}
              color={theme.red}
              icon="trending-down"
            />
          </View>

          <Card style={[styles.profitCard, { borderColor: (summary?.netProfit ?? 0) >= 0 ? theme.green + "44" : theme.red + "44" }]}>
            <View style={styles.profitRow}>
              <View>
                <ThemedText variant="secondary" style={styles.profitLabel}>
                  Net Profit
                </ThemedText>
                <ThemedText
                  weight="bold"
                  style={[
                    styles.profitValue,
                    { color: (summary?.netProfit ?? 0) >= 0 ? theme.green : theme.red },
                  ]}
                >
                  {(summary?.netProfit ?? 0) >= 0 ? "+" : "-"}
                  {formatCurrency(summary?.netProfit ?? 0)}
                </ThemedText>
              </View>
              <View style={[styles.profitBadge, { backgroundColor: (summary?.netProfit ?? 0) >= 0 ? theme.green + "22" : theme.red + "22" }]}>
                <MaterialCommunityIcons
                  name={(summary?.netProfit ?? 0) >= 0 ? "trending-up" : "trending-down"}
                  size={24}
                  color={(summary?.netProfit ?? 0) >= 0 ? theme.green : theme.red}
                />
              </View>
            </View>
          </Card>

          <Card style={styles.milesCard}>
            <View style={styles.milesHeader}>
              <View>
                <ThemedText variant="secondary" style={styles.milesLabel}>
                  Weekly Miles
                </ThemedText>
                <View style={styles.milesValueRow}>
                  <ThemedText weight="bold" style={styles.milesValue}>
                    {weeklyMiles.toLocaleString()}
                  </ThemedText>
                  <ThemedText variant="muted" style={styles.milesGoal}>
                    / {mileageGoal.toLocaleString()} mi
                  </ThemedText>
                </View>
              </View>
              <ThemedText variant="primary" weight="semibold" style={styles.milesPct}>
                {Math.round(mileageProgress * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundTertiary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${mileageProgress * 100}%` as any,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </Card>
        </>
      )}

      {quickExpenses && quickExpenses.length > 0 ? (
        <View style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>
            Quick Log
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScroll}
          >
            {quickExpenses.map((item: any) => (
              <QuickExpenseButton
                key={item.id}
                label={item.label}
                category={item.category}
                amount={item.defaultAmount}
                onPress={() => handleQuickExpense(item)}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>
            Quick Log
          </ThemedText>
          <ThemedText variant="muted" style={{ fontSize: 14 }}>
            Add quick expense shortcuts in Settings
          </ThemedText>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText weight="semibold" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>
        </View>
        {summary?.recentActivity && summary.recentActivity.length > 0 ? (
          summary.recentActivity.map((item: any, idx: number) => (
            <Card key={idx} style={styles.activityItem}>
              <View style={styles.activityRow}>
                <View
                  style={[
                    styles.activityDot,
                    {
                      backgroundColor:
                        item.type === "income" ? theme.green + "22" : theme.red + "22",
                    },
                  ]}
                >
                  <Feather
                    name={item.type === "income" ? "arrow-down-left" : "arrow-up-right"}
                    size={14}
                    color={item.type === "income" ? theme.green : theme.red}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <ThemedText weight="medium" style={styles.activityDesc}>
                    {item.description}
                  </ThemedText>
                  <ThemedText variant="muted" style={styles.activityDate}>
                    {formatDate(item.date)}
                  </ThemedText>
                </View>
                <ThemedText
                  weight="semibold"
                  style={[
                    styles.activityAmount,
                    { color: item.amount >= 0 ? theme.green : theme.red },
                  ]}
                >
                  {item.amount >= 0 ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </ThemedText>
              </View>
            </Card>
          ))
        ) : (
          <ThemedText variant="muted" style={{ fontSize: 14 }}>
            No recent activity yet
          </ThemedText>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 14 },
  appTitle: { fontSize: 30 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  iftaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  iftaText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    gap: 6,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 20 },
  profitCard: {
    marginBottom: 12,
  },
  profitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profitLabel: { fontSize: 13 },
  profitValue: { fontSize: 26 },
  profitBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  milesCard: { marginBottom: 20 },
  milesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  milesLabel: { fontSize: 13, marginBottom: 4 },
  milesValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  milesValue: { fontSize: 24 },
  milesGoal: { fontSize: 14 },
  milesPct: { fontSize: 18 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  quickScroll: { gap: 10, paddingRight: 4 },
  quickExpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 100,
  },
  quickExpLabel: { fontSize: 14 },
  quickExpAmount: { fontSize: 12, marginTop: 2 },
  activityItem: { marginBottom: 8, padding: 12 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activityDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activityInfo: { flex: 1 },
  activityDesc: { fontSize: 14 },
  activityDate: { fontSize: 12, marginTop: 2 },
  activityAmount: { fontSize: 15 },
});
