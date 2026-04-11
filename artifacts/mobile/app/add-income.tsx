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
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DatePickerField } from "@/components/DatePickerField";
import { router, useLocalSearchParams } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";

import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useCreateIncome, useUpdateIncome, useIncomeEntry, useSavedRoutes, useIncome, useFleet } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { trackEntryAndRequestReview } from "@/lib/appReview";
import { API_BASE_URL } from "@/constants/api";
import { getAuthToken } from "@/hooks/useApi";

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

async function routeDistanceMulti(
  coords: { lat: number; lon: number }[]
): Promise<number | null> {
  if (coords.length < 2) return null;
  try {
    const waypoints = coords.map(c => `${c.lon},${c.lat}`).join(";");
    const url = `${API_BASE_URL}/geo/route?coords=${encodeURIComponent(waypoints)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.miles ?? null;
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
  const { id, forUserId, driverName } = useLocalSearchParams<{ id?: string; forUserId?: string; driverName?: string }>();
  const editId = id ? parseInt(id) : null;
  const isEditing = editId != null;
  const forDriverId = forUserId ? parseInt(forUserId) : undefined;

  const { data: fleet } = useFleet();
  const isOwner = fleet?.role === "owner" && !forDriverId;
  const fleetMembers: Array<{ userId: number; name: string }> = isOwner ? (fleet?.members ?? []) : [];
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const effectiveForUserId = forDriverId ?? selectedDriverId ?? undefined;

  const { data: existing, isLoading: loadingExisting } = useIncomeEntry(editId);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Multi-stop route: first = pickup, last = delivery, middle = intermediate stops
  const [stops, setStops] = useState<string[]>(["", ""]);
  const [loadedMiles, setLoadedMiles] = useState<number | null>(null);
  const [emptyMiles, setEmptyMiles] = useState<number | null>(null);
  const [emptyFromLabel, setEmptyFromLabel] = useState<string | null>(null);
  // Deadhead TO — optional parking/terminal after final delivery
  const [deadheadToEnabled, setDeadheadToEnabled] = useState(false);
  const [parkingLocation, setParkingLocation] = useState("");
  const [emptyToMiles, setEmptyToMiles] = useState<number | null>(null);
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
      // Restore stops from pickupLocation / deliveryLocation
      const pickup = existing.pickupLocation ?? "";
      const delivery = existing.deliveryLocation ?? "";
      setStops([pickup, delivery]);
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

  const resetMiles = () => {
    setLoadedMiles(null);
    setEmptyMiles(null);
    setEmptyFromLabel(null);
    setEmptyToMiles(null);
  };

  const handleCalculateMiles = async () => {
    const filledStops = stops.filter(s => s.trim());
    if (filledStops.length < 2) {
      return Alert.alert("Missing stops", "Enter at least a pickup and delivery city to calculate miles.");
    }
    if (deadheadToEnabled && !parkingLocation.trim()) {
      return Alert.alert("Missing location", "Enter your parking/terminal city or disable that option.");
    }
    setCalculating(true);
    resetMiles();

    try {
      // Geocode all filled stops in parallel
      const coords = await Promise.all(filledStops.map(s => geocode(s)));
      if (coords.some(c => c === null)) {
        setCalculating(false);
        return Alert.alert("Location not found", "Could not find one or more stops. Try city + state (e.g. Newark, NJ).");
      }

      // Loaded miles: multi-stop route through all stops
      const loaded = await routeDistanceMulti(coords as { lat: number; lon: number }[]);
      if (loaded == null) {
        setCalculating(false);
        return Alert.alert("Route error", "Could not calculate route. Check your internet connection.");
      }
      setLoadedMiles(loaded);

      // Empty FROM: last delivery → first stop (pickup)
      let totalEmpty = 0;
      if (lastDelivery) {
        const lastCoord = await geocode(lastDelivery);
        if (lastCoord) {
          const emptyFrom = await routeDistanceMulti([lastCoord, coords[0]!]);
          if (emptyFrom != null) {
            totalEmpty += emptyFrom;
            setEmptyFromLabel(lastDelivery);
          }
        }
      }

      // Empty TO: last stop (delivery) → parking location
      if (deadheadToEnabled && parkingLocation.trim()) {
        const parkingCoord = await geocode(parkingLocation.trim());
        if (parkingCoord) {
          const emptyTo = await routeDistanceMulti([coords[coords.length - 1]!, parkingCoord]);
          if (emptyTo != null) {
            totalEmpty += emptyTo;
            setEmptyToMiles(emptyTo);
          }
        }
      }

      if (totalEmpty > 0) setEmptyMiles(totalEmpty);
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

    const firstStop = stops[0]?.trim() ?? "";
    const lastStop = stops[stops.length - 1]?.trim() ?? "";
    if (firstStop) payload.pickupLocation = firstStop;
    if (lastStop) payload.deliveryLocation = lastStop;
    if (firstStop && lastStop) {
      const filledStops = stops.filter(s => s.trim());
      payload.routeName = filledStops.join(" → ");
    }
    if (loadedMiles != null) payload.loadedMiles = loadedMiles;
    if (emptyMiles != null) payload.emptyMiles = emptyMiles;
    if (effectiveForUserId) payload.forUserId = effectiveForUserId;

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

      {driverName ? (
        <View style={[s.driverBanner, { backgroundColor: "#2563eb18", borderColor: "#2563eb40" }]}>
          <Ionicons name="person-circle-outline" size={18} color="#2563eb" />
          <Text style={[s.driverBannerText, { color: "#2563eb" }]}>Adding for {driverName}</Text>
        </View>
      ) : isOwner && !isEditing && fleetMembers.length > 1 ? (
        <View style={[s.pickerBox, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.pickerLabel, { color: C.textSecondary }]}>Log for</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerChips}>
            <TouchableOpacity
              style={[s.chip, selectedDriverId === null && { backgroundColor: C.primary }]}
              onPress={() => setSelectedDriverId(null)}
            >
              <Text style={[s.chipText, { color: selectedDriverId === null ? "#fff" : C.text }]}>Myself</Text>
            </TouchableOpacity>
            {fleetMembers.filter((m: any) => m.role !== "owner").map((m: any) => (
              <TouchableOpacity
                key={m.userId}
                style={[s.chip, selectedDriverId === m.userId && { backgroundColor: C.primary }, { borderColor: C.separator, borderWidth: 1 }]}
                onPress={() => setSelectedDriverId(m.userId)}
              >
                <View style={[s.chipAvatar, { backgroundColor: selectedDriverId === m.userId ? "#ffffff40" : C.primary + "20" }]}>
                  <Text style={[s.chipAvatarText, { color: selectedDriverId === m.userId ? "#fff" : C.primary }]}>
                    {m.name?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text style={[s.chipText, { color: selectedDriverId === m.userId ? "#fff" : C.text }]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

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
            <DatePickerField
              label="DATE"
              value={date}
              onChange={setDate}
            />
          </View>
        </View>

        {/* Route Section */}
        <View style={[s.routeBox, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
          <Text style={[s.routeBoxTitle, { color: C.text }]}>Route & Miles</Text>
          <Text style={[s.routeBoxSub, { color: C.textSecondary }]}>
            Add all stops in order. Use intermediate stops for multi-leg loads.
          </Text>

          {/* Dynamic stops list */}
          {stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stops.length - 1;
            const label = isFirst ? "PICKUP" : isLast ? "DELIVERY" : `STOP ${idx}`;
            const placeholder = isFirst ? "Edison, NJ" : isLast ? "Newark, NJ" : "City, ST";
            return (
              <View key={idx} style={s.stopRow}>
                {/* Connector line */}
                <View style={s.stopConnector}>
                  <View style={[
                    s.stopDot,
                    { backgroundColor: isFirst ? C.teal : isLast ? C.primary : C.textSecondary },
                  ]} />
                  {!isLast && <View style={[s.stopLine, { backgroundColor: C.separator }]} />}
                </View>
                <View style={s.stopInput}>
                  <Text style={[s.stopLabel, { color: C.textSecondary }]}>{label}</Text>
                  <View style={s.stopInputRow}>
                    <TextInput
                      style={[s.stopField, { backgroundColor: C.inputBackground, borderColor: C.cardBorder ?? C.separator, color: C.text, flex: 1 }]}
                      value={stop}
                      onChangeText={(v) => {
                        const updated = [...stops];
                        updated[idx] = v;
                        setStops(updated);
                        resetMiles();
                      }}
                      placeholder={placeholder}
                      placeholderTextColor={C.textMuted}
                    />
                    {/* Remove button for intermediate stops only */}
                    {!isFirst && !isLast && (
                      <TouchableOpacity
                        style={[s.removeStopBtn, { backgroundColor: C.redLight }]}
                        onPress={() => {
                          const updated = stops.filter((_, i) => i !== idx);
                          setStops(updated);
                          resetMiles();
                        }}
                      >
                        <Ionicons name="close" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Add intermediate stop */}
          <TouchableOpacity
            style={[s.addStopBtn, { borderColor: C.separator }]}
            onPress={() => {
              // Insert before the last stop (delivery)
              const updated = [...stops];
              updated.splice(stops.length - 1, 0, "");
              setStops(updated);
              resetMiles();
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color={C.primary} />
            <Text style={[s.addStopText, { color: C.primary }]}>Add intermediate stop</Text>
          </TouchableOpacity>

          {/* Empty miles section */}
          <View style={[s.emptySection, { borderTopColor: C.separator }]}>
            <Text style={[s.emptySectionTitle, { color: C.text }]}>Empty Miles (Deadhead)</Text>

            {/* Empty FROM — auto from last delivery */}
            {lastDelivery ? (
              <View style={[s.deadheadRow, { backgroundColor: C.tealLight, borderColor: C.teal + "40" }]}>
                <Ionicons name="arrow-forward-circle-outline" size={16} color={C.teal} />
                <Text style={[s.deadheadRowText, { color: C.teal }]} numberOfLines={1}>
                  Coming from: {lastDelivery}
                </Text>
              </View>
            ) : (
              <Text style={[s.noLastDelivery, { color: C.textMuted }]}>
                No prior delivery found — empty miles from will not be calculated.
              </Text>
            )}

            {/* Empty TO — deadhead to parking toggle */}
            <TouchableOpacity
              style={s.toggleRow}
              onPress={() => { setDeadheadToEnabled(v => !v); setEmptyToMiles(null); resetMiles(); }}
              activeOpacity={0.75}
            >
              <View style={[
                s.toggle,
                { backgroundColor: deadheadToEnabled ? C.primary : C.separator },
              ]}>
                <View style={[s.toggleThumb, { left: deadheadToEnabled ? 18 : 2 }]} />
              </View>
              <Text style={[s.toggleLabel, { color: C.text }]}>
                Deadheading to parking/terminal after delivery
              </Text>
            </TouchableOpacity>

            {deadheadToEnabled && (
              <FormInput
                label="PARKING / TERMINAL CITY"
                value={parkingLocation}
                onChangeText={(v) => { setParkingLocation(v); resetMiles(); }}
                placeholder="Houston, TX"
              />
            )}
          </View>

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
                  Deadhead from: {emptyFromLabel}{emptyToMiles ? ` · To parking: ${emptyToMiles} mi` : ""}
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
  driverBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  driverBannerText: { fontSize: 14, fontWeight: "600" },
  pickerBox: { marginHorizontal: 20, marginBottom: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  pickerLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  pickerChips: { flexDirection: "row", gap: 8, paddingRight: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "transparent" },
  chipAvatar: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  chipAvatarText: { fontSize: 10, fontWeight: "800" },
  chipText: { fontSize: 13, fontWeight: "600" },
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
  // Multi-stop styles
  stopRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  stopConnector: { width: 20, alignItems: "center", paddingTop: 22 },
  stopDot: { width: 10, height: 10, borderRadius: 5 },
  stopLine: { width: 2, flex: 1, minHeight: 16, marginTop: 2 },
  stopInput: { flex: 1, gap: 2, marginBottom: 8 },
  stopLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  stopInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stopField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  removeStopBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 4,
  },
  addStopText: { fontSize: 13, fontWeight: "600" },
  emptySection: { borderTopWidth: 1, paddingTop: 14, marginTop: 8, gap: 10 },
  emptySectionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  deadheadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  deadheadRowText: { fontSize: 12, fontWeight: "500", flex: 1 },
  noLastDelivery: { fontSize: 12, fontStyle: "italic" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggle: { width: 40, height: 24, borderRadius: 12, position: "relative" },
  toggleThumb: { position: "absolute", top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleLabel: { fontSize: 13, flex: 1, fontWeight: "500" },
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
