import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useIncomeEntry, useDeleteIncome, useUpdateIncome, getAuthToken } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useColorScheme } from "@/hooks/useColorScheme";
import { API_BASE_URL } from "@/constants/api";

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `${API_BASE_URL}/geo/geocode?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

async function routeDistance(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<number | null> {
  try {
    const waypoints = `${from.lon},${from.lat};${to.lon},${to.lat}`;
    const url = `${API_BASE_URL}/geo/route?coords=${encodeURIComponent(waypoints)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.miles ?? null;
  } catch {
    return null;
  }
}

function Row({ label, value, C }: { label: string; value?: string | null; C: typeof Colors.light }) {
  if (!value) return null;
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: C.text }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: { fontSize: 14, fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "600", maxWidth: "55%", textAlign: "right" },
});

export default function IncomeDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = Colors[isDark ? "dark" : "light"];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isLoading } = useIncomeEntry(id ? parseInt(id) : null);
  const deleteIncome = useDeleteIncome();
  const updateIncome = useUpdateIncome();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const s = makeStyles(C);

  const handleRecalculate = async () => {
    if (!entry?.pickupLocation || !entry?.deliveryLocation) return;
    setRecalculating(true);
    try {
      const [fromCoord, toCoord] = await Promise.all([
        geocode(entry.pickupLocation),
        geocode(entry.deliveryLocation),
      ]);
      if (!fromCoord || !toCoord) {
        Alert.alert("Location not found", "Could not geocode one or both locations. You can edit this entry to update manually.");
        return;
      }
      const miles = await routeDistance(fromCoord, toCoord);
      if (miles == null) {
        Alert.alert("Route error", "Could not calculate route distance.");
        return;
      }
      await updateIncome.mutateAsync({
        id: parseInt(id!),
        data: {
          date: entry.date,
          source: entry.source,
          amount: entry.amount,
          pickupLocation: entry.pickupLocation,
          deliveryLocation: entry.deliveryLocation,
          loadedMiles: miles,
          emptyMiles: entry.emptyMiles,
          trailerNumber: entry.trailerNumber,
          routeName: entry.routeName,
          notes: entry.notes,
        },
      });
      qc.invalidateQueries({ queryKey: ["income-entry", parseInt(id!)] });
    } catch {
      Alert.alert("Error", "Something went wrong. Try again.");
    } finally {
      setRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
        <Text style={{ color: C.textSecondary }}>Income entry not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const date = entry.date
    ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const hasLocations = !!(entry.pickupLocation && entry.deliveryLocation);
  const hasMiles = entry.loadedMiles != null;
  const showCalcBanner = hasLocations && !hasMiles;
  const showRecalcLink = hasLocations && hasMiles;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[s.backText, { color: C.primary }]}>Income</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={() => router.push(`/add-income?id=${id}`)} style={s.iconBtn}>
            <Ionicons name="pencil-outline" size={20} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmDelete(true)} style={s.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: C.greenLight }]}>
          <View style={[s.heroIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.65)" }]}>
            <Ionicons name="trending-up" size={32} color={C.green} />
          </View>
          <Text style={[s.heroAmount, { color: C.green }]}>
            +${Number(entry.amount).toFixed(2)}
          </Text>
          <Text style={[s.heroSource, { color: C.text }]}>
            {entry.source || "Income"}
          </Text>
          <View style={[s.badge, { backgroundColor: C.green + "22" }]}>
            <Text style={[s.badgeText, { color: C.green }]}>Income</Text>
          </View>
        </View>

        {/* Route & Miles Card */}
        {(hasLocations || hasMiles) && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
            <View style={s.cardTitleRow}>
              <Text style={[s.sectionTitle, { color: C.text }]}>Route & Miles</Text>
              {showRecalcLink && (
                <TouchableOpacity
                  style={s.recalcLink}
                  onPress={handleRecalculate}
                  disabled={recalculating}
                >
                  {recalculating
                    ? <ActivityIndicator size="small" color={C.teal} />
                    : <Ionicons name="refresh-outline" size={14} color={C.teal} />}
                  <Text style={[s.recalcLinkText, { color: C.teal }]}>
                    {recalculating ? "Calculating…" : "Recalculate"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {entry.pickupLocation && entry.deliveryLocation && (
              <View style={s.routeRow}>
                <View style={s.routeStop}>
                  <View style={[s.routeDot, { backgroundColor: C.green }]} />
                  <Text style={[s.routeCity, { color: C.text }]}>{entry.pickupLocation}</Text>
                </View>
                <View style={[s.routeLine, { backgroundColor: C.separator }]} />
                <View style={s.routeStop}>
                  <View style={[s.routeDot, { backgroundColor: C.red }]} />
                  <Text style={[s.routeCity, { color: C.text }]}>{entry.deliveryLocation}</Text>
                </View>
              </View>
            )}

            {/* Calculate banner for entries missing miles */}
            {showCalcBanner && (
              <TouchableOpacity
                style={[s.calcBanner, { backgroundColor: C.teal + "18", borderColor: C.teal + "40" }]}
                onPress={handleRecalculate}
                disabled={recalculating}
                activeOpacity={0.8}
              >
                {recalculating ? (
                  <ActivityIndicator size="small" color={C.teal} />
                ) : (
                  <Ionicons name="navigate-outline" size={18} color={C.teal} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.calcBannerTitle, { color: C.teal }]}>
                    {recalculating ? "Calculating miles…" : "No miles recorded"}
                  </Text>
                  {!recalculating && (
                    <Text style={[s.calcBannerSub, { color: C.textSecondary }]}>
                      Tap to estimate from {entry.pickupLocation} → {entry.deliveryLocation}
                    </Text>
                  )}
                </View>
                {!recalculating && (
                  <Ionicons name="chevron-forward" size={16} color={C.teal} />
                )}
              </TouchableOpacity>
            )}

            {hasMiles && (
              <View style={s.milesRow}>
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{entry.loadedMiles}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Loaded mi</Text>
                </View>
                <View style={[s.milesDivider, { backgroundColor: C.separator }]} />
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{entry.emptyMiles ?? 0}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Empty mi</Text>
                </View>
                <View style={[s.milesDivider, { backgroundColor: C.separator }]} />
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{(entry.loadedMiles ?? 0) + (entry.emptyMiles ?? 0)}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Total mi</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Details Card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.sectionTitle, { color: C.text }]}>Details</Text>
          <View style={[s.divider, { backgroundColor: C.separator }]} />
          <View>
            <Row label="Date" value={date} C={C} />
            <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
            <Row label="Source / Broker" value={entry.source} C={C} />
            {entry.trailerNumber ? (
              <>
                <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
                <Row label="Trailer #" value={entry.trailerNumber} C={C} />
              </>
            ) : null}
            {entry.notes ? (
              <>
                <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
                <View style={{ paddingVertical: 12 }}>
                  <Text style={[rowStyles.label, { color: C.textSecondary, marginBottom: 6 }]}>Notes</Text>
                  <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{entry.notes}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete Income"
        message="Remove this income entry permanently?"
        onConfirm={() => {
          deleteIncome.mutate(parseInt(id!), {
            onSuccess: () => { setConfirmDelete(false); router.back(); },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
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
    iconBtn: { padding: 8 },
    content: { padding: 16, paddingBottom: 60, gap: 14 },
    hero: {
      alignItems: "center",
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderRadius: 20,
      gap: 8,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    heroAmount: { fontSize: 32, fontWeight: "800" },
    heroSource: { fontSize: 18, fontWeight: "700" },
    badge: {
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
      marginTop: 4,
    },
    badgeText: { fontSize: 13, fontWeight: "700" },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: { fontSize: 15, fontWeight: "700" },
    recalcLink: { flexDirection: "row", alignItems: "center", gap: 5 },
    recalcLinkText: { fontSize: 13, fontWeight: "600" },
    divider: { height: 1, marginHorizontal: -16 },
    rowDivider: { height: 1 },
    routeRow: { paddingVertical: 12, gap: 6 },
    routeStop: { flexDirection: "row", alignItems: "center", gap: 10 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeLine: { width: 2, height: 20, marginLeft: 4 },
    routeCity: { fontSize: 14, fontWeight: "600" },
    calcBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    calcBannerTitle: { fontSize: 14, fontWeight: "700" },
    calcBannerSub: { fontSize: 12, marginTop: 2 },
    milesRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingVertical: 12,
    },
    milesStat: { alignItems: "center", flex: 1 },
    milesNum: { fontSize: 22, fontWeight: "700" },
    milesLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
    milesDivider: { width: 1, height: 36 },
  });
}
