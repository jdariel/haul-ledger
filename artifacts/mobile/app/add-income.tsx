import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Text,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";

import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useCreateIncome, useUpdateIncome, useIncomeEntry, useSavedRoutes, useIncome } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { trackEntryAndRequestReview } from "@/lib/appReview";

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, { headers: { "User-Agent": "HaulLedger/1.0" } });
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function routeDistance(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    return Math.round(data.routes[0].distance * 0.000621371);
  } catch {
    return null;
  }
}

export default function AddIncomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const { data: savedRoutes } = useSavedRoutes();
  const { data: allIncome } = useIncome();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? parseInt(id) : null;
  const isEditing = editId != null;

  const { data: existing, isLoading: loadingExisting } = useIncomeEntry(editId);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [loadedMiles, setLoadedMiles] = useState<number | null>(null);
  const [emptyMiles, setEmptyMiles] = useState<number | null>(null);
  const [emptyFromLabel, setEmptyFromLabel] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;
  const isSaving = createIncome.isPending || updateIncome.isPending;

  useEffect(() => {
    if (existing && !prefilled) {
      setDate(existing.date ?? today);
      setSource(existing.source ?? "");
      setAmount(existing.amount != null ? String(existing.amount) : "");
      setTrailerNumber(existing.trailerNumber ?? "");
      setNotes(existing.notes ?? "");
      setPickupLocation(existing.pickupLocation ?? "");
      setDeliveryLocation(existing.deliveryLocation ?? "");
      setLoadedMiles(existing.loadedMiles ?? null);
      setEmptyMiles(existing.emptyMiles ?? null);
      setPrefilled(true);
    }
  }, [existing]);

  const lastDelivery = (() => {
    if (!allIncome?.length) return null;
    const sorted = [...allIncome].sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const last = sorted.find((e: any) => e.deliveryLocation);
    return last?.deliveryLocation ?? null;
  })();

  const routeOptions = [
    { label: "Pick a saved route…", value: "" },
    ...(savedRoutes ?? []).map((r: any) => ({ label: r.name, value: String(r.id) })),
  ];

  const handleRouteSelect = (routeId: string) => {
    setSelectedRoute(routeId);
    if (!routeId) return;
    const route = (savedRoutes ?? []).find((r: any) => String(r.id) === routeId);
    if (route) {
      if (route.standardRate) setAmount(String(route.standardRate));
    }
  };

  const handleCalculateMiles = async () => {
    if (!pickupLocation.trim() || !deliveryLocation.trim()) {
      return Alert.alert("Missing locations", "Enter both pickup and delivery cities to calculate miles.");
    }
    setCalculating(true);
    setLoadedMiles(null);
    setEmptyMiles(null);
    setEmptyFromLabel(null);

    try {
      const [pickupCoord, deliveryCoord] = await Promise.all([
        geocode(pickupLocation),
        geocode(deliveryLocation),
      ]);

      if (!pickupCoord || !deliveryCoord) {
        setCalculating(false);
        return Alert.alert("Location not found", "Could not find one or both locations. Try adding city and state (e.g. Newark, NJ).");
      }

      const loaded = await routeDistance(pickupCoord, deliveryCoord);
      if (loaded == null) {
        setCalculating(false);
        return Alert.alert("Route error", "Could not calculate route. Check your internet connection.");
      }
      setLoadedMiles(loaded);

      if (lastDelivery) {
        const lastCoord = await geocode(lastDelivery);
        if (lastCoord) {
          const empty = await routeDistance(lastCoord, pickupCoord);
          if (empty != null) {
            setEmptyMiles(empty);
            setEmptyFromLabel(lastDelivery);
          }
        }
      }
    } catch {
      Alert.alert("Error", "Something went wrong calculating miles.");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!source.trim()) return Alert.alert("Error", "Source / Broker is required");
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Valid amount is required");

    const payload: any = {
      date,
      source: source.trim(),
      amount: parseFloat(amount),
      trailerNumber: trailerNumber.trim() || null,
      notes: notes.trim() || null,
    };

    if (pickupLocation.trim()) payload.pickupLocation = pickupLocation.trim();
    if (deliveryLocation.trim()) payload.deliveryLocation = deliveryLocation.trim();
    if (pickupLocation.trim() && deliveryLocation.trim()) {
      payload.routeName = `${pickupLocation.trim()} → ${deliveryLocation.trim()}`;
    }
    if (loadedMiles != null) payload.loadedMiles = loadedMiles;
    if (emptyMiles != null) payload.emptyMiles = emptyMiles;

    try {
      if (isEditing) {
        await updateIncome.mutateAsync({ id: editId!, data: payload });
      } else {
        await createIncome.mutateAsync(payload);
        trackEntryAndRequestReview().catch(() => {});
      }
      router.back();
    } catch {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "save"} income`);
    }
  };

  if (isEditing && loadingExisting) {
    return (
      <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const totalMiles = (loadedMiles ?? 0) + (emptyMiles ?? 0);
  const hasMiles = loadedMiles != null;

  return (
    <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad }]}>
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={[s.title, { color: C.green }]}>{isEditing ? "Edit Income" : "Log Income"}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 80 }]}
      >
        {/* Quick Fill from Saved Route — only on new entry */}
        {!isEditing && (
          <View style={[s.quickFillBox, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
            <Text style={[s.quickFillLabel, { color: C.textSecondary }]}>Quick Fill from Saved Route</Text>
            <SelectField
              label=""
              value={selectedRoute}
              options={routeOptions}
              placeholder="Pick a saved route…"
              onChange={handleRouteSelect}
            />
          </View>
        )}

        {/* Source */}
        <FormInput
          label="Source (Broker/Load ID)"
          value={source}
          onChangeText={setSource}
          placeholder="TQL Load #12345"
          autoFocus={!isEditing}
        />

        {/* Amount + Date row */}
        <View style={s.row}>
          <View style={s.half}>
            <FormInput
              label="Amount ($)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.half}>
            <FormInput
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Route Section */}
        <View style={[s.routeBox, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
          <Text style={[s.routeBoxTitle, { color: C.text }]}>Route & Miles</Text>
          <Text style={[s.routeBoxSub, { color: C.textSecondary }]}>
            Enter pickup and delivery to auto-calculate miles and log your trip automatically.
          </Text>

          <FormInput
            label="Pickup City"
            value={pickupLocation}
            onChangeText={(v) => { setPickupLocation(v); setLoadedMiles(null); setEmptyMiles(null); }}
            placeholder="Edison, NJ"
          />
          <FormInput
            label="Delivery City"
            value={deliveryLocation}
            onChangeText={(v) => { setDeliveryLocation(v); setLoadedMiles(null); setEmptyMiles(null); }}
            placeholder="Newark, NJ"
          />

          {lastDelivery && !pickupLocation && (
            <View style={[s.prevDeliveryHint, { backgroundColor: C.tealLight }]}>
              <Ionicons name="information-circle-outline" size={14} color={C.teal} />
              <Text style={[s.prevDeliveryText, { color: C.teal }]}>
                Last delivery: {lastDelivery} — empty miles will auto-calculate
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.calcBtn, { backgroundColor: C.teal, opacity: calculating ? 0.7 : 1 }]}
            onPress={handleCalculateMiles}
            disabled={calculating}
            activeOpacity={0.85}
          >
            {calculating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={16} color="#fff" />
                <Text style={s.calcBtnText}>Calculate Miles</Text>
              </>
            )}
          </TouchableOpacity>

          {hasMiles && (
            <View style={[s.milesResult, { backgroundColor: C.tealLight, borderColor: C.teal }]}>
              <View style={s.milesRow}>
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{loadedMiles}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Loaded mi</Text>
                </View>
                <View style={[s.milesDivider, { backgroundColor: C.separator }]} />
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{emptyMiles ?? 0}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Empty mi</Text>
                </View>
                <View style={[s.milesDivider, { backgroundColor: C.separator }]} />
                <View style={s.milesStat}>
                  <Text style={[s.milesNum, { color: C.teal }]}>{totalMiles}</Text>
                  <Text style={[s.milesLabel, { color: C.textSecondary }]}>Total mi</Text>
                </View>
              </View>
              {emptyFromLabel && (
                <Text style={[s.emptyFromText, { color: C.textSecondary }]}>
                  Empty from: {emptyFromLabel}
                </Text>
              )}
              <Text style={[s.tripAutoNote, { color: C.teal }]}>
                ✓ Trip will be logged automatically
              </Text>
            </View>
          )}
        </View>

        {/* Trailer # */}
        <FormInput
          label="Trailer #"
          value={trailerNumber}
          onChangeText={setTrailerNumber}
          placeholder="TR-5678"
        />

        {/* Notes */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: C.inputBackground, borderColor: C.cardBorder, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Load details..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>

      <View style={[s.footer, { paddingBottom: bottomPad + 12, borderTopColor: C.separator, backgroundColor: C.background }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.green, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>{isEditing ? "Update Income" : "Save Income"}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  quickFillBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  quickFillLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 90,
  },
  routeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  routeBoxTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  routeBoxSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  prevDeliveryHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  prevDeliveryText: { fontSize: 12, flex: 1, lineHeight: 16 },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
    marginBottom: 4,
  },
  calcBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  milesResult: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },
  milesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  milesStat: { alignItems: "center", flex: 1 },
  milesNum: { fontSize: 22, fontWeight: "700" },
  milesLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  milesDivider: { width: 1, height: 36 },
  emptyFromText: { fontSize: 12, textAlign: "center", marginBottom: 6 },
  tripAutoNote: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
