import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useSummary, useExpenses, useIncome } from "../../hooks/useApi";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ReportTab = "all" | "income" | "expenses";

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [tab, setTab] = useState<ReportTab>("all");
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

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

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
  });

  const handleExportCSV = () => {
    Alert.alert("Export", "CSV export is available on device builds.");
  };

  const s = makeStyles(C);

  const TABS: { key: ReportTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "income", label: "Income" },
    { key: "expenses", label: "Expenses" },
  ];

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
          <Text style={s.title}>Reports</Text>
          <View style={s.headerBtns}>
            <TouchableOpacity style={[s.headerBtn, { borderColor: C.separator, backgroundColor: C.card }]}>
              <Ionicons name="document-text-outline" size={14} color={C.text} />
              <Text style={[s.headerBtnText, { color: C.text }]}>IFTA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerBtn, { borderColor: C.separator, backgroundColor: C.card }]}
              onPress={handleExportCSV}
            >
              <Ionicons name="download-outline" size={14} color={C.text} />
              <Text style={[s.headerBtnText, { color: C.text }]}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range */}
        <View style={[s.dateRow, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Ionicons name="calendar-outline" size={15} color={C.primary} />
          <Text style={[s.dateText, { color: C.text }]}>{fmtDate(thirtyDaysAgo)}</Text>
          <Ionicons name="arrow-forward" size={14} color={C.textMuted} style={{ marginHorizontal: 6 }} />
          <Ionicons name="calendar-outline" size={15} color={C.primary} />
          <Text style={[s.dateText, { color: C.text }]}>{fmtDate(now)}</Text>
        </View>

        {/* Segment Tabs */}
        <View style={[s.segmentWrap, { backgroundColor: C.card, borderColor: C.separator }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.segment, tab === t.key && [s.segmentActive, { backgroundColor: C.primary }]]}
              onPress={() => setTab(t.key)}
            >
              {t.key === "income" && (
                <Ionicons name="trending-up" size={13} color={tab === t.key ? "#fff" : C.textSecondary} style={{ marginRight: 3 }} />
              )}
              {t.key === "expenses" && (
                <Ionicons name="trending-down" size={13} color={tab === t.key ? "#fff" : C.textSecondary} style={{ marginRight: 3 }} />
              )}
              {t.key === "all" && (
                <Ionicons name="grid" size={13} color={tab === t.key ? "#fff" : C.textSecondary} style={{ marginRight: 3 }} />
              )}
              <Text style={[s.segmentText, { color: tab === t.key ? "#fff" : C.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Net Profit Summary */}
        {(tab === "all" || tab === "income" || tab === "expenses") && (
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={[s.summaryLabel, { color: C.textSecondary }]}>NET PROFIT</Text>
            <Text style={[s.summaryAmt, { color: C.green }]}>${netProfit.toFixed(2)}</Text>
            <View style={s.summaryRow}>
              <View style={[s.miniCard, { backgroundColor: C.greenLight }]}>
                <Text style={[s.miniLabel, { color: C.green }]}>INCOME</Text>
                <Text style={[s.miniAmt, { color: C.green }]}>${totalIncome.toFixed(0)}</Text>
              </View>
              <View style={[s.miniCard, { backgroundColor: C.redLight }]}>
                <Text style={[s.miniLabel, { color: C.red }]}>EXPENSES</Text>
                <Text style={[s.miniAmt, { color: C.red }]}>${totalExpenses.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Expense Breakdown */}
        {(tab === "all" || tab === "expenses") && (
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={s.sectionTitle}>EXPENSE BREAKDOWN</Text>
            {Object.keys(expenseByCategory).length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={36} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textMuted }]}>No expenses in range</Text>
              </View>
            ) : (
              Object.entries(expenseByCategory).map(([cat, amt]) => (
                <View key={cat} style={s.breakdownRow}>
                  <Text style={[s.breakdownCat, { color: C.text }]}>{cat}</Text>
                  <Text style={[s.breakdownAmt, { color: C.red }]}>-${amt.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Income vs Expenses */}
        {(tab === "all" || tab === "income") && (
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={s.sectionTitle}>INCOME VS EXPENSES</Text>
            {totalIncome === 0 && totalExpenses === 0 ? (
              <View style={s.empty}>
                <Text style={[s.emptyText, { color: C.textMuted }]}>No data in range</Text>
              </View>
            ) : (
              <View style={s.barChart}>
                <View style={s.barRow}>
                  <Text style={[s.barLabel, { color: C.textSecondary }]}>Income</Text>
                  <View style={[s.barTrack, { backgroundColor: C.background }]}>
                    <View
                      style={[
                        s.barFill,
                        {
                          backgroundColor: C.green,
                          width: `${Math.min(100, (totalIncome / Math.max(totalIncome, totalExpenses, 1)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[s.barAmt, { color: C.green }]}>${totalIncome.toFixed(0)}</Text>
                </View>
                <View style={s.barRow}>
                  <Text style={[s.barLabel, { color: C.textSecondary }]}>Expenses</Text>
                  <View style={[s.barTrack, { backgroundColor: C.background }]}>
                    <View
                      style={[
                        s.barFill,
                        {
                          backgroundColor: C.red,
                          width: `${Math.min(100, (totalExpenses / Math.max(totalIncome, totalExpenses, 1)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[s.barAmt, { color: C.red }]}>${totalExpenses.toFixed(0)}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    },
    title: { fontSize: 26, fontWeight: "800", color: C.text },
    headerBtns: { flexDirection: "row", gap: 8 },
    headerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
    },
    headerBtnText: { fontSize: 13, fontWeight: "600" },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    dateText: { fontSize: 13, fontWeight: "500", marginLeft: 5 },
    segmentWrap: {
      flexDirection: "row",
      marginHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      padding: 3,
    },
    segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 10 },
    segmentActive: {},
    segmentText: { fontSize: 13, fontWeight: "600" },
    summaryCard: {
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      borderWidth: 1,
      gap: 4,
    },
    summaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    summaryAmt: { fontSize: 40, fontWeight: "800" },
    summaryRow: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
    miniCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center" },
    miniLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
    miniAmt: { fontSize: 22, fontWeight: "800", marginTop: 4 },
    section: { marginHorizontal: 20, borderRadius: 16, padding: 16, borderWidth: 1 },
    sectionTitle: { fontSize: 11, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.8, marginBottom: 12 },
    empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 14 },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
    },
    breakdownCat: { fontSize: 14, fontWeight: "500" },
    breakdownAmt: { fontSize: 14, fontWeight: "700" },
    barChart: { gap: 14 },
    barRow: { gap: 6 },
    barLabel: { fontSize: 12, fontWeight: "500" },
    barTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
    barFill: { height: 10, borderRadius: 5 },
    barAmt: { fontSize: 13, fontWeight: "700" },
  });
}
