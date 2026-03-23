import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useIncome, useDeleteIncome } from "../../hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useColorScheme } from "@/hooks/useColorScheme";

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

type ViewMode = "week" | "custom" | "all";

export default function IncomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [view, setView] = useState<ViewMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: income, refetch } = useIncome();
  const deleteIncome = useDeleteIncome();

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { start, end } = getWeekBounds(weekOffset);
  const isCurrentWeek = weekOffset === 0;
  const weekLabel = isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : "";

  const filtered = (income ?? []).filter((i: any) => {
    if (view === "week") {
      const d = new Date(i.date || i.createdAt);
      return d >= start && d <= end;
    }
    if (view === "custom" && customStart && customEnd) {
      const d = new Date(i.date || i.createdAt);
      return d >= customStart && d <= customEnd;
    }
    return true;
  });

  const rangeTotal = filtered.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

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
          <Text style={s.title}>Income</Text>
          <Text style={s.subtitle}>Log your loads and settlements.</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[s.addBtn, { borderColor: C.green }]}
          onPress={() => router.push("/add-income")}
        >
          <Ionicons name="add" size={17} color={C.green} />
          <Text style={[s.addBtnText, { color: C.green }]}>Add Income</Text>
        </TouchableOpacity>

        {/* Segment Toggle */}
        <View style={[s.segmentWrap, { backgroundColor: C.card, borderColor: C.separator }]}>
          <TouchableOpacity
            style={[s.segment, view === "week" && [s.segmentActive, { backgroundColor: C.green }]]}
            onPress={() => setView("week")}
          >
            <Text style={[s.segmentText, { color: view === "week" ? "#fff" : C.textSecondary }]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, view === "custom" && [s.segmentActive, { backgroundColor: C.green }]]}
            onPress={() => { setView("custom"); setCalendarVisible(true); }}
          >
            <Ionicons name="calendar-outline" size={13} color={view === "custom" ? "#fff" : C.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[s.segmentText, { color: view === "custom" ? "#fff" : C.textSecondary }]}>Custom</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, view === "all" && [s.segmentActive, { backgroundColor: C.green }]]}
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
            <TouchableOpacity
              style={s.weekCenter}
              onPress={() => { setView("custom"); setCalendarVisible(true); }}
              activeOpacity={0.7}
            >
              <View style={s.weekRangeRow}>
                <Ionicons name="calendar-outline" size={13} color={C.green} />
                <Text style={[s.weekRange, { color: C.text }]}>{fmtDate(start)} – {fmtDate(end)}</Text>
              </View>
              <Text style={s.weekLbl}>{weekLabel}</Text>
              <Text style={[s.weekTotal, { color: C.green }]}>
                Total: +${rangeTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset(weekOffset + 1)}
              style={s.weekArrow}
              disabled={weekOffset >= 0}
            >
              <Ionicons name="chevron-forward" size={18} color={weekOffset >= 0 ? C.textMuted : C.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Custom Range Display */}
        {view === "custom" && (
          <TouchableOpacity
            style={[s.weekNav, { backgroundColor: C.card, borderColor: C.green }]}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar" size={16} color={C.green} style={{ marginRight: 8 }} />
            <View style={s.weekCenter}>
              <Text style={[s.weekRange, { color: C.text }]}>
                {customStart && customEnd
                  ? `${fmtDate(customStart)} – ${fmtDate(customEnd)}`
                  : "Tap to pick dates"}
              </Text>
              <Text style={[s.weekLbl, { color: C.green }]}>Custom Range · tap to change</Text>
              <Text style={[s.weekTotal, { color: C.green }]}>Total: +${rangeTotal.toFixed(2)}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={C.green} />
          </TouchableOpacity>
        )}

        {/* All time summary */}
        {view === "all" && (
          <View style={[s.weekNav, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Ionicons name="infinite-outline" size={18} color={C.textSecondary} style={{ marginRight: 8 }} />
            <View style={s.weekCenter}>
              <Text style={[s.weekRange, { color: C.text }]}>All Income</Text>
              <Text style={[s.weekTotal, { color: C.green }]}>Total: +${rangeTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* List or empty */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="trending-up-outline" size={44} color={C.textMuted} />
            <Text style={s.emptyTitle}>
              {view === "week" ? "No income logged this week." : view === "custom" ? "No income in this range." : "No income logged yet."}
            </Text>
            <Text style={s.emptySubtitle}>Tap + to add a load.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[s.incomeCard, { backgroundColor: C.card, borderColor: C.separator }]}
                onPress={() => router.push(`/income-detail?id=${item.id}`)}
                activeOpacity={0.75}
              >
                <View style={[s.iconBubble, { backgroundColor: C.greenLight }]}>
                  <Ionicons name="trending-up" size={18} color={C.green} />
                </View>
                <View style={s.info}>
                  <Text style={[s.desc, { color: C.text }]}>{item.source || item.description || "Load Income"}</Text>
                  <Text style={[s.meta, { color: C.textSecondary }]}>
                    {item.routeName ? `${item.routeName} · ` : ""}
                    {new Date((item.date || item.createdAt) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={s.right}>
                  <Text style={[s.amt, { color: C.green }]}>+${Number(item.amount).toFixed(2)}</Text>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setDeleteId(item.id); }} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteId !== null}
        title="Delete Income"
        message="Remove this income entry?"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteIncome.mutate(deleteId, { onSuccess: () => { refetch(); setDeleteId(null); } });
          }
        }}
        onCancel={() => setDeleteId(null)}
      />

      <DateRangePicker
        visible={calendarVisible}
        initialStart={customStart}
        initialEnd={customEnd}
        onApply={(s, e) => {
          setCustomStart(s);
          setCustomEnd(e);
          setView("custom");
          setCalendarVisible(false);
        }}
        onCancel={() => {
          setCalendarVisible(false);
          if (!customStart) setView("week");
        }}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    content: { paddingBottom: 110, gap: 14 },
    header: { paddingHorizontal: 20, paddingTop: 16 },
    title: { fontSize: 26, fontWeight: "800", color: C.text },
    subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 2 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    addBtnText: { fontSize: 15, fontWeight: "700" },
    segmentWrap: {
      flexDirection: "row",
      marginHorizontal: 20,
      borderRadius: 10,
      borderWidth: 1,
      padding: 3,
    },
    segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8 },
    segmentActive: {},
    segmentText: { fontSize: 13, fontWeight: "600" },
    weekNav: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    weekArrow: { padding: 4 },
    weekCenter: { flex: 1, alignItems: "center" },
    weekRangeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    weekRange: { fontSize: 13, fontWeight: "600", color: C.text },
    weekLbl: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    weekTotal: { fontSize: 14, fontWeight: "700", marginTop: 4 },
    empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: C.textSecondary, textAlign: "center" },
    emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },
    list: { paddingHorizontal: 16, gap: 8 },
    incomeCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    iconBubble: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    info: { flex: 1 },
    desc: { fontSize: 14, fontWeight: "600" },
    meta: { fontSize: 12, marginTop: 2 },
    right: { alignItems: "flex-end", gap: 6 },
    amt: { fontSize: 15, fontWeight: "700" },
    deleteBtn: { padding: 2 },
  });
}
