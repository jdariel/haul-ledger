import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "@/constants/colors";
import { useTrips, useDeleteTrip } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TripsScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { data: trips, refetch, isLoading } = useTrips();
  const deleteTrip = useDeleteTrip();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalLoaded = (trips ?? []).reduce((sum: number, t: any) => sum + (t.loadedMiles ?? 0), 0);
  const totalEmpty = (trips ?? []).reduce((sum: number, t: any) => sum + (t.emptyMiles ?? 0), 0);
  const totalMiles = totalLoaded + totalEmpty;

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[s.backText, { color: C.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Trips</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: C.primary }]}
          onPress={() => router.push("/add-trip")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Summary */}
        <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.summaryTitle, { color: C.textSecondary }]}>ALL TIME MILES</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: C.teal }]}>{totalLoaded.toFixed(0)}</Text>
              <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Loaded</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: C.separator }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: C.orange }]}>{totalEmpty.toFixed(0)}</Text>
              <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Empty</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: C.separator }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryNum, { color: C.text }]}>{totalMiles.toFixed(0)}</Text>
              <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : !trips?.length ? (
          <View style={s.empty}>
            <Ionicons name="navigate-circle-outline" size={56} color={C.textMuted} />
            <Text style={[s.emptyTitle, { color: C.textSecondary }]}>No trips logged yet</Text>
            <Text style={[s.emptySub, { color: C.textMuted }]}>Tap Add to log your first trip</Text>
          </View>
        ) : (
          <View style={s.list}>
            {(trips ?? []).map((trip: any) => {
              const tripDate = trip.date
                ? new Date(trip.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })
                : "—";
              const hasLocations = trip.pickupLocation || trip.deliveryLocation;
              const totalTripMiles = (trip.loadedMiles ?? 0) + (trip.emptyMiles ?? 0);

              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}
                  onPress={() => router.push(`/add-trip?id=${trip.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={s.cardTop}>
                    <View style={[s.dateTag, { backgroundColor: C.primaryLight }]}>
                      <Text style={[s.dateText, { color: C.primary }]}>{tripDate}</Text>
                    </View>
                    <View style={s.cardActions}>
                      <View style={[s.statePill, { backgroundColor: C.card, borderColor: C.separator }]}>
                        <Text style={[s.stateText, { color: C.textSecondary }]}>{trip.jurisdiction}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); setDeleteId(trip.id); }}
                        style={s.deleteBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={16} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {hasLocations && (
                    <View style={s.routeRow}>
                      <View style={s.routePin}>
                        <Ionicons name="radio-button-on" size={12} color={C.teal} />
                        <Text style={[s.routeText, { color: C.text }]} numberOfLines={1}>
                          {trip.pickupLocation || "—"}
                        </Text>
                      </View>
                      <View style={[s.routeLine, { backgroundColor: C.separator }]} />
                      <View style={s.routePin}>
                        <Ionicons name="location" size={12} color={C.red} />
                        <Text style={[s.routeText, { color: C.text }]} numberOfLines={1}>
                          {trip.deliveryLocation || "—"}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={[s.milesRow, { borderTopColor: C.separator }]}>
                    <View style={s.milesItem}>
                      <View style={[s.milesIcon, { backgroundColor: C.tealLight }]}>
                        <Ionicons name="cube-outline" size={13} color={C.teal} />
                      </View>
                      <Text style={[s.milesNum, { color: C.teal }]}>{(trip.loadedMiles ?? 0).toFixed(0)}</Text>
                      <Text style={[s.milesLbl, { color: C.textSecondary }]}>loaded</Text>
                    </View>
                    <View style={s.milesItem}>
                      <View style={[s.milesIcon, { backgroundColor: C.orangeLight }]}>
                        <Ionicons name="arrow-forward-outline" size={13} color={C.orange} />
                      </View>
                      <Text style={[s.milesNum, { color: C.orange }]}>{(trip.emptyMiles ?? 0).toFixed(0)}</Text>
                      <Text style={[s.milesLbl, { color: C.textSecondary }]}>empty</Text>
                    </View>
                    <View style={s.milesItem}>
                      <View style={[s.milesIcon, { backgroundColor: C.card, borderWidth: 1, borderColor: C.separator }]}>
                        <Ionicons name="navigate-outline" size={13} color={C.text} />
                      </View>
                      <Text style={[s.milesNum, { color: C.text }]}>{totalTripMiles.toFixed(0)}</Text>
                      <Text style={[s.milesLbl, { color: C.textSecondary }]}>total</Text>
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
        title="Delete Trip"
        message="Remove this trip permanently?"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteTrip.mutate(deleteId, {
              onSuccess: () => { refetch(); setDeleteId(null); },
            });
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { fontSize: 16, fontWeight: "500" },
    title: { fontSize: 18, fontWeight: "700", color: C.text },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    summaryCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    summaryTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 12, textAlign: "center" },
    summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryNum: { fontSize: 26, fontWeight: "800" },
    summaryLbl: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    summaryDivider: { width: 1, height: 40, marginHorizontal: 8 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "600" },
    emptySub: { fontSize: 14 },
    list: { gap: 10 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
    },
    dateTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    dateText: { fontSize: 12, fontWeight: "700" },
    cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    statePill: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    stateText: { fontSize: 12, fontWeight: "600" },
    deleteBtn: { padding: 4 },
    routeRow: {
      paddingHorizontal: 14,
      paddingBottom: 10,
      gap: 4,
    },
    routePin: { flexDirection: "row", alignItems: "center", gap: 8 },
    routeLine: { width: 1, height: 10, marginLeft: 5 },
    routeText: { fontSize: 13, fontWeight: "500", flex: 1 },
    milesRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    milesItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    milesIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    milesNum: { fontSize: 15, fontWeight: "800" },
    milesLbl: { fontSize: 11, fontWeight: "500" },
  });
}
