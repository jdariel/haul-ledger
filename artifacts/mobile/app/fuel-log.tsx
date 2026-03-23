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
import { useFuelEntries, useDeleteFuelEntry } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useColorScheme } from "@/hooks/useColorScheme";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FuelLogScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: entries, refetch } = useFuelEntries();
  const deleteFuel = useDeleteFuelEntry();

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const sorted = [...(entries ?? [])].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalGallons = sorted.reduce((s: number, e: any) => s + Number(e.gallons ?? 0), 0);
  const totalSpent = sorted.reduce((s: number, e: any) => s + Number(e.totalAmount ?? 0), 0);
  const avgPPG =
    sorted.length > 0
      ? sorted.reduce((s: number, e: any) => s + Number(e.pricePerGallon ?? 0), 0) / sorted.length
      : 0;

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
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.primary} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.title}>Fuel Log</Text>
            <Text style={s.subtitle}>Track fuel purchases for IFTA</Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push("/add-fuel")}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>Log Fuel</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Ionicons name="water-outline" size={18} color="#f59e0b" />
            <Text style={[s.summaryVal, { color: C.text }]}>{totalGallons.toFixed(1)}</Text>
            <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total Gallons</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Ionicons name="cash-outline" size={18} color="#10b981" />
            <Text style={[s.summaryVal, { color: C.text }]}>${totalSpent.toFixed(2)}</Text>
            <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total Spent</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Ionicons name="trending-up-outline" size={18} color="#3b82f6" />
            <Text style={[s.summaryVal, { color: C.text }]}>${avgPPG.toFixed(3)}</Text>
            <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Avg $/Gal</Text>
          </View>
        </View>

        {/* List */}
        {sorted.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="flame-outline" size={44} color={C.textMuted} />
            <Text style={s.emptyTitle}>No fuel entries yet.</Text>
            <Text style={s.emptySubtitle}>
              Fuel expenses logged in the Expenses tab automatically appear here.{"\n"}Or tap "Log Fuel" to add manually.
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push("/add-fuel")}
            >
              <Text style={s.emptyBtnText}>Log Fuel Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {sorted.map((e: any) => (
              <View key={e.id} style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
                <View style={[s.iconWrap, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="flame" size={20} color="#f59e0b" />
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Text style={[s.vendor, { color: C.text }]} numberOfLines={1}>
                      {e.vendor ?? "Fuel Stop"}
                    </Text>
                    <Text style={[s.total, { color: C.red }]}>
                      -${Number(e.totalAmount).toFixed(2)}
                    </Text>
                  </View>
                  <View style={s.cardMid}>
                    <Text style={[s.detail, { color: C.textSecondary }]}>
                      {Number(e.gallons).toFixed(3)} gal · ${Number(e.pricePerGallon).toFixed(3)}/gal
                    </Text>
                    <View style={[s.stateBadge, { backgroundColor: C.background }]}>
                      <Text style={[s.stateBadgeText, { color: C.textSecondary }]}>
                        {e.jurisdiction ?? "—"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.date, { color: C.textMuted }]}>{fmtDate(e.date)}</Text>
                </View>
                <TouchableOpacity onPress={() => setDeleteId(e.id)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <ConfirmDialog
        visible={deleteId !== null}
        title="Delete Fuel Entry"
        message="Remove this fuel entry permanently?"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteFuel.mutate(deleteId, { onSuccess: () => { refetch(); setDeleteId(null); } });
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 10,
    },
    backBtn: { padding: 4 },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: "800", color: C.text },
    subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
    summaryRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 4,
    },
    summaryVal: { fontSize: 15, fontWeight: "800" },
    summaryLbl: { fontSize: 11, fontWeight: "500", textAlign: "center" },
    empty: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 40,
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: C.textSecondary },
    emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 19 },
    emptyBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    list: { paddingHorizontal: 16, gap: 10 },
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 2,
    },
    cardBody: { flex: 1, gap: 3 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    vendor: { fontSize: 14, fontWeight: "700", flex: 1 },
    total: { fontSize: 15, fontWeight: "800" },
    cardMid: { flexDirection: "row", alignItems: "center", gap: 8 },
    detail: { fontSize: 12, flex: 1 },
    stateBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    stateBadgeText: { fontSize: 11, fontWeight: "700" },
    date: { fontSize: 11, marginTop: 2 },
    deleteBtn: { padding: 4, marginTop: 2 },
    red: { color: "#ef4444" },
  });
}
