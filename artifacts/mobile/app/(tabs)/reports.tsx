import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Colors } from "@/constants/colors";
import { useSummary, useExpenses, useIncome, useTrips } from "../../hooks/useApi";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useColorScheme } from "@/hooks/useColorScheme";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ReportTab = "all" | "income" | "expenses";

type Preset = {
  label: string;
  getRange: () => { start: Date; end: Date };
};

const PRESETS: Preset[] = [
  {
    label: "This Week",
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return { start: mon, end: sun };
    },
  },
  {
    label: "Last Week",
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return { start: mon, end: sun };
    },
  },
  {
    label: "This Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    label: "Last Month",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    label: "Last 30 Days",
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    label: "Last 90 Days",
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    label: "This Year",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    label: "All Time",
    getRange: () => {
      return { start: new Date(2000, 0, 1), end: new Date(2099, 11, 31) };
    },
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Fuel: "#f59e0b",
  Maintenance: "#8b5cf6",
  Repairs: "#8b5cf6",
  Lumper: "#3b82f6",
  Tolls: "#6b7280",
  Parking: "#14b8a6",
  "Scale Fee": "#f97316",
  Insurance: "#0ea5e9",
  Other: "#6b7280",
};

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [tab, setTab] = useState<ReportTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [presetLabel, setPresetLabel] = useState("This Month");
  const [dateRange, setDateRange] = useState(() => PRESETS[2].getRange());
  const [pickerVisible, setPickerVisible] = useState(false);

  const { data: summary, refetch: refetchSummary } = useSummary();
  const { data: expensesRaw, refetch: refetchExpenses } = useExpenses();
  const { data: incomeRaw, refetch: refetchIncome } = useIncome();
  const { data: tripsRaw } = useTrips();

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

  const expenses = useMemo(() => {
    return (expensesRaw ?? []).filter((e: any) => {
      const d = new Date(e.date || e.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [expensesRaw, dateRange]);

  const income = useMemo(() => {
    return (incomeRaw ?? []).filter((i: any) => {
      const d = new Date(i.date || i.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [incomeRaw, dateRange]);

  const trips = useMemo(() => {
    return (tripsRaw ?? []).filter((t: any) => {
      const d = new Date(t.date || t.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [tripsRaw, dateRange]);

  const totalIncome = income.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const handleExport = async () => {
    try {
      setExporting(true);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not supported", "Sharing is not available on this device.");
        setExporting(false);
        return;
      }

      const esc = (v: any) => {
        const str = v == null ? "" : String(v);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const lines: string[] = [];

      lines.push(`HaulLedger Report — ${presetLabel}`);
      lines.push(`Period: ${fmtDate(dateRange.start)} to ${fmtDate(dateRange.end)}`);
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push("");

      lines.push("=== SUMMARY ===");
      lines.push(`Total Income,$${totalIncome.toFixed(2)}`);
      lines.push(`Total Expenses,$${totalExpenses.toFixed(2)}`);
      lines.push(`Net Profit,$${netProfit.toFixed(2)}`);
      lines.push("");

      lines.push("=== INCOME ===");
      lines.push("Date,Source,Route,Pickup,Delivery,Loaded Miles,Empty Miles,Amount");
      income.forEach((i: any) => {
        lines.push([
          esc(i.date),
          esc(i.source),
          esc(i.routeName ?? (i.pickupLocation && i.deliveryLocation ? `${i.pickupLocation} → ${i.deliveryLocation}` : "")),
          esc(i.pickupLocation),
          esc(i.deliveryLocation),
          esc(i.loadedMiles ?? ""),
          esc(i.emptyMiles ?? ""),
          esc(Number(i.amount).toFixed(2)),
        ].join(","));
      });
      lines.push("");

      lines.push("=== EXPENSES ===");
      lines.push("Date,Category,Description,Amount,Payment Method");
      expenses.forEach((e: any) => {
        lines.push([
          esc(e.date),
          esc(e.category),
          esc(e.description),
          esc(Number(e.amount).toFixed(2)),
          esc(e.paymentMethod),
        ].join(","));
      });
      lines.push("");

      if (trips.length > 0) {
        lines.push("=== TRIPS ===");
        lines.push("Date,Pickup,Delivery,Loaded Miles,Empty Miles,Total Miles,Jurisdiction");
        trips.forEach((t: any) => {
          const total = (t.loadedMiles ?? 0) + (t.emptyMiles ?? 0);
          lines.push([
            esc(t.date),
            esc(t.pickupLocation),
            esc(t.deliveryLocation),
            esc(t.loadedMiles ?? ""),
            esc(t.emptyMiles ?? ""),
            esc(total || ""),
            esc(t.jurisdiction),
          ].join(","));
        });
      }

      const csv = lines.join("\n");
      const fileName = `HaulLedger_${presetLabel.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export Report" });
    } catch (err) {
      Alert.alert("Export failed", "Could not generate the report file.");
    } finally {
      setExporting(false);
    }
  };

  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount);
  });
  const sortedCats = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

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
            <TouchableOpacity
              style={[s.headerBtn, { borderColor: C.green, backgroundColor: C.greenLight }]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator size="small" color={C.green} />
                : <Ionicons name="download-outline" size={14} color={C.green} />
              }
              <Text style={[s.headerBtnText, { color: C.green }]}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerBtn, { borderColor: C.primary, backgroundColor: C.primary + "12" }]}
              onPress={() => router.push("/ifta")}
            >
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={[s.headerBtnText, { color: C.primary }]}>IFTA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range Bar */}
        <TouchableOpacity
          style={[s.dateRow, { backgroundColor: C.card, borderColor: C.primary }]}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="calendar" size={16} color={C.primary} />
          <Text style={[s.dateRangeLabel, { color: C.primary }]}>{presetLabel}</Text>
          <View style={s.dateSpacer} />
          <Text style={[s.dateText, { color: C.textSecondary }]}>
            {fmtDate(dateRange.start)} – {fmtDate(dateRange.end)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={C.primary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Quick Preset Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.presetChips}>
          {PRESETS.map((preset) => {
            const active = preset.label === presetLabel;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[
                  s.presetChip,
                  {
                    backgroundColor: active ? C.primary : C.card,
                    borderColor: active ? C.primary : C.separator,
                  },
                ]}
                onPress={() => {
                  setPresetLabel(preset.label);
                  setDateRange(preset.getRange());
                }}
              >
                <Text style={[s.presetChipText, { color: active ? "#fff" : C.textSecondary }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
        <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.summaryLabel, { color: C.textSecondary }]}>NET PROFIT · {presetLabel.toUpperCase()}</Text>
          <Text style={[s.summaryAmt, { color: netProfit >= 0 ? C.green : C.red }]}>
            {netProfit >= 0 ? "" : "-"}${Math.abs(netProfit).toFixed(2)}
          </Text>
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

        {/* Income vs Expenses bar */}
        {(tab === "all" || tab === "income") && (
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={s.sectionTitle}>INCOME VS EXPENSES</Text>
            {totalIncome === 0 && totalExpenses === 0 ? (
              <View style={s.empty}>
                <Ionicons name="bar-chart-outline" size={32} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textMuted }]}>No data for this period</Text>
              </View>
            ) : (
              <View style={s.barChart}>
                <View style={s.barRow}>
                  <View style={s.barMeta}>
                    <Text style={[s.barLabel, { color: C.textSecondary }]}>Income</Text>
                    <Text style={[s.barAmt, { color: C.green }]}>${totalIncome.toFixed(2)}</Text>
                  </View>
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
                </View>
                <View style={s.barRow}>
                  <View style={s.barMeta}>
                    <Text style={[s.barLabel, { color: C.textSecondary }]}>Expenses</Text>
                    <Text style={[s.barAmt, { color: C.red }]}>${totalExpenses.toFixed(2)}</Text>
                  </View>
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
                </View>
              </View>
            )}
          </View>
        )}

        {/* Expense Breakdown */}
        {(tab === "all" || tab === "expenses") && (
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={s.sectionTitle}>EXPENSE BREAKDOWN</Text>
            {sortedCats.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={32} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textMuted }]}>No expenses in this period</Text>
              </View>
            ) : (
              <View style={{ gap: 0 }}>
                {sortedCats.map(([cat, amt], idx) => {
                  const color = CATEGORY_COLORS[cat] ?? "#6b7280";
                  const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                  return (
                    <View key={cat}>
                      <View style={s.breakdownRow}>
                        <View style={[s.catDot, { backgroundColor: color + "33" }]}>
                          <View style={[s.catDotInner, { backgroundColor: color }]} />
                        </View>
                        <Text style={[s.breakdownCat, { color: C.text }]}>{cat}</Text>
                        <View style={s.breakdownRight}>
                          <Text style={[s.breakdownPct, { color: C.textSecondary }]}>{pct.toFixed(0)}%</Text>
                          <Text style={[s.breakdownAmt, { color: C.red }]}>-${amt.toFixed(2)}</Text>
                        </View>
                      </View>
                      <View style={[s.miniBarTrack, { backgroundColor: C.background }]}>
                        <View style={[s.miniBarFill, { backgroundColor: color, width: `${pct}%` }]} />
                      </View>
                      {idx < sortedCats.length - 1 && <View style={[s.rowDivider, { backgroundColor: C.separator }]} />}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Recent Transactions */}
        {(tab === "all" || tab === "income") && income.length > 0 && (
          <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={s.sectionTitle}>INCOME ({income.length} entries)</Text>
            {income.slice(0, 5).map((i: any) => (
              <View key={i.id} style={s.txRow}>
                <Text style={[s.txName, { color: C.text }]}>{i.source || i.routeName || "Load"}</Text>
                <Text style={[s.txAmt, { color: C.green }]}>+${Number(i.amount).toFixed(2)}</Text>
              </View>
            ))}
            {income.length > 5 && (
              <Text style={[s.moreText, { color: C.textMuted }]}>+{income.length - 5} more</Text>
            )}
          </View>
        )}
      </ScrollView>

      <DateRangePicker
        visible={pickerVisible}
        initialStart={dateRange.start}
        initialEnd={dateRange.end}
        onApply={(start, end) => {
          setDateRange({ start, end });
          setPresetLabel("Custom");
          setPickerVisible(false);
        }}
        onCancel={() => setPickerVisible(false)}
      />
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
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      gap: 6,
    },
    dateRangeLabel: { fontSize: 14, fontWeight: "700" },
    dateSpacer: { flex: 1 },
    dateText: { fontSize: 12, fontWeight: "500" },
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
    section: { marginHorizontal: 20, borderRadius: 16, padding: 16, borderWidth: 1, gap: 0 },
    sectionTitle: { fontSize: 11, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.8, marginBottom: 14 },
    empty: { alignItems: "center", paddingVertical: 28, gap: 8 },
    emptyText: { fontSize: 14 },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 10,
    },
    catDot: {
      width: 28,
      height: 28,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    catDotInner: { width: 10, height: 10, borderRadius: 5 },
    breakdownCat: { fontSize: 14, fontWeight: "500", flex: 1 },
    breakdownRight: { alignItems: "flex-end", gap: 2 },
    breakdownPct: { fontSize: 11, fontWeight: "500" },
    breakdownAmt: { fontSize: 14, fontWeight: "700" },
    miniBarTrack: { height: 4, borderRadius: 2, marginBottom: 4, overflow: "hidden" },
    miniBarFill: { height: 4, borderRadius: 2 },
    rowDivider: { height: 1 },
    barChart: { gap: 16 },
    barRow: { gap: 6 },
    barMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    barLabel: { fontSize: 13, fontWeight: "500" },
    barTrack: { height: 12, borderRadius: 6, overflow: "hidden" },
    barFill: { height: 12, borderRadius: 6 },
    barAmt: { fontSize: 13, fontWeight: "700" },
    txRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
    },
    txName: { fontSize: 14, fontWeight: "500", flex: 1 },
    txAmt: { fontSize: 14, fontWeight: "700" },
    moreText: { fontSize: 12, textAlign: "center", paddingTop: 10 },
    presetChips: { paddingHorizontal: 20, gap: 8 },
    presetChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    presetChipText: { fontSize: 13, fontWeight: "600" },
  });
}
