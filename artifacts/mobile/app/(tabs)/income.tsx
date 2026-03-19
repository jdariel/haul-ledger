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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useIncome, useDeleteIncome } from "../../hooks/useApi";
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

export default function IncomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [weekOffset, setWeekOffset] = useState(0);
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

  const weekIncome = (income ?? []).filter((i: any) => {
    const d = new Date(i.date || i.createdAt);
    return d >= start && d <= end;
  });

  const weekTotal = weekIncome.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

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

        {/* Week Nav */}
        <View style={[s.weekNav, { backgroundColor: C.card, borderColor: C.separator }]}>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} style={s.weekArrow}>
            <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
          </TouchableOpacity>
          <View style={s.weekCenter}>
            <Text style={s.weekRange}>{fmtDate(start)} – {fmtDate(end)}</Text>
            <Text style={s.weekLbl}>{weekLabel}</Text>
            <Text style={[s.weekTotal, { color: C.green }]}>
              Week Total: +${weekTotal.toFixed(2)}
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

        {/* List or empty */}
        {weekIncome.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="trending-up-outline" size={44} color={C.textMuted} />
            <Text style={s.emptyTitle}>No income logged this week.</Text>
            <Text style={s.emptySubtitle}>Tap + to add a load.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {weekIncome.map((item: any) => (
              <View key={item.id} style={[s.incomeCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                <View style={[s.iconBubble, { backgroundColor: C.greenLight }]}>
                  <Ionicons name="trending-up" size={18} color={C.green} />
                </View>
                <View style={s.info}>
                  <Text style={[s.desc, { color: C.text }]}>{item.description || "Load Income"}</Text>
                  <Text style={[s.meta, { color: C.textSecondary }]}>
                    {item.loadNumber ? `Load #${item.loadNumber} · ` : ""}
                    {new Date(item.date || item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={s.right}>
                  <Text style={[s.amt, { color: C.green }]}>+${Number(item.amount).toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => setDeleteId(item.id)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
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
