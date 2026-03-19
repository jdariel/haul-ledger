import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useExpenses, useDeleteExpense } from "../../hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORIES = ["All", "Fuel", "Maintenance", "Lumper", "Tolls", "Parking", "Scale Fee", "Other"];

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  Fuel: { icon: "flame", color: "#f59e0b", bg: "#fef3c7" },
  Maintenance: { icon: "construct", color: "#8b5cf6", bg: "#ede9fe" },
  Lumper: { icon: "people", color: "#3b82f6", bg: "#eff6ff" },
  Tolls: { icon: "car", color: "#6b7280", bg: "#f3f4f6" },
  Parking: { icon: "location", color: "#14b8a6", bg: "#ccfbf1" },
  "Scale Fee": { icon: "scale", color: "#f97316", bg: "#fff7ed" },
  Other: { icon: "ellipsis-horizontal", color: "#6b7280", bg: "#f3f4f6" },
};

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"week" | "all">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterCategory, setFilterCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: expenses, refetch } = useExpenses();
  const deleteExpense = useDeleteExpense();

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { start, end } = getWeekBounds(weekOffset);

  const filtered = (expenses ?? []).filter((e: any) => {
    if (filterCategory !== "All" && e.category !== filterCategory) return false;
    if (search && !e.merchant?.toLowerCase().includes(search.toLowerCase())) return false;
    if (view === "week") {
      const d = new Date(e.date || e.createdAt);
      return d >= start && d <= end;
    }
    return true;
  });

  const weekTotal = filtered.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const isCurrentWeek = weekOffset === 0;
  const weekLabel = isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : `${weekOffset < 0 ? "Past" : "Future"}`;


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
          <View>
            <Text style={s.title}>Expenses</Text>
            <Text style={s.subtitle}>Track every penny spent on the road.</Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.filterBtn}>
            <Ionicons name="filter" size={15} color={C.text} />
            <Text style={s.filterText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/add-expense")}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[s.searchBox, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            placeholder="Search by merchant..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Week/All Toggle */}
        <View style={[s.segmentWrap, { backgroundColor: C.card, borderColor: C.separator }]}>
          <TouchableOpacity
            style={[s.segment, view === "week" && [s.segmentActive, { backgroundColor: C.primary }]]}
            onPress={() => setView("week")}
          >
            <Text style={[s.segmentText, { color: view === "week" ? "#fff" : C.textSecondary }]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, view === "all" && [s.segmentActive, { backgroundColor: C.primary }]]}
            onPress={() => setView("all")}
          >
            <Text style={[s.segmentText, { color: view === "all" ? "#fff" : C.textSecondary }]}>All</Text>
          </TouchableOpacity>
        </View>

        {/* Week Nav */}
        {view === "week" && (
          <View style={[s.weekNav, { backgroundColor: C.card, borderColor: C.separator }]}>
            <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} style={s.weekArrow}>
              <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
            </TouchableOpacity>
            <View style={s.weekCenter}>
              <Text style={s.weekRange}>{fmtDate(start)} – {fmtDate(end)}</Text>
              <Text style={s.weekLbl}>{weekLabel}</Text>
              <Text style={[s.weekTotal, { color: C.red }]}>
                Week Total: -${weekTotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWeekOffset(weekOffset + 1)}
              style={s.weekArrow}
              disabled={weekOffset >= 0}
            >
              <Ionicons name="chevron-forward" size={18} color={weekOffset >= 0 ? C.textMuted : C.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={40} color={C.textMuted} />
            <Text style={s.emptyTitle}>
              {view === "week" ? "No expenses this week." : "No expenses found."}
            </Text>
            <Text style={s.emptySubtitle}>Tap + to log your first expense.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((e: any) => {
              const meta = CATEGORY_ICONS[e.category] ?? CATEGORY_ICONS.Other;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[s.expenseCard, { backgroundColor: C.card, borderColor: C.separator }]}
                  onPress={() => router.push({ pathname: "/expense-detail", params: { id: e.id } })}
                  activeOpacity={0.75}
                >
                  <View style={[s.catIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={s.expInfo}>
                    <Text style={[s.expMerchant, { color: C.text }]}>{e.merchant || e.category}</Text>
                    <Text style={[s.expMeta, { color: C.textSecondary }]}>
                      {e.category} · {new Date(e.date || e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <View style={s.expRight}>
                    <Text style={[s.expAmt, { color: C.red }]}>-${Number(e.amount).toFixed(2)}</Text>
                    <View style={s.expRightRow}>
                      {e.receiptUrl && (
                        <Ionicons name="receipt" size={13} color={C.primary} style={{ marginRight: 4 }} />
                      )}
                      <TouchableOpacity onPress={() => setDeleteId(e.id)} style={s.deleteBtn}>
                        <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      <ConfirmDialog
        visible={deleteId !== null}
        title="Delete Expense"
        message="Remove this expense permanently?"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteExpense.mutate(deleteId, { onSuccess: () => { refetch(); setDeleteId(null); } });
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    content: { paddingBottom: 110, gap: 12 },
    header: { paddingHorizontal: 20, paddingTop: 16 },
    title: { fontSize: 26, fontWeight: "800", color: C.text },
    subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 2 },
    actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, alignItems: "center" },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: C.separator,
      backgroundColor: C.card,
    },
    filterText: { fontSize: 14, fontWeight: "600", color: C.text },
    addBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    segmentWrap: {
      flexDirection: "row",
      marginHorizontal: 20,
      borderRadius: 10,
      borderWidth: 1,
      padding: 3,
    },
    segment: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
    segmentActive: {},
    segmentText: { fontSize: 14, fontWeight: "600" },
    weekNav: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
    },
    weekArrow: { padding: 4 },
    weekCenter: { flex: 1, alignItems: "center" },
    weekRange: { fontSize: 13, fontWeight: "600", color: C.text },
    weekLbl: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    weekTotal: { fontSize: 14, fontWeight: "700", marginTop: 4 },
    empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: C.textSecondary, textAlign: "center" },
    emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },
    list: { paddingHorizontal: 16, gap: 8 },
    expenseCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    catIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    expInfo: { flex: 1 },
    expMerchant: { fontSize: 14, fontWeight: "600" },
    expMeta: { fontSize: 12, marginTop: 2 },
    expRight: { alignItems: "flex-end", gap: 6 },
    expRightRow: { flexDirection: "row", alignItems: "center" },
    expAmt: { fontSize: 15, fontWeight: "700" },
    deleteBtn: { padding: 2 },
  });
}
