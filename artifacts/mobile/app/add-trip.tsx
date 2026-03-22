import React, { useState, useEffect } from "react";
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
import { useCreateTrip, useUpdateTrip, useTrip, useTrips } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { trackEntryAndRequestReview } from "@/lib/appReview";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
].map((s) => ({ label: s, value: s }));

type Mode = "location" | "odometer";

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

async function routeDistance(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const meters = data.routes[0].distance;
    return Math.round(meters * 0.000621371);
  } catch {
    return null;
  }
}

export default function AddTripScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? parseInt(id) : null;
  const isEditing = editId != null;

  const { data: existing } = useTrip(editId);
  const { data: allTrips } = useTrips();
  const [prefilled, setPrefilled] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [mode, setMode] = useState<Mode>("location");
  const [date, setDate] = useState(today);
  const [jurisdiction, setJurisdiction] = useState("");
  const [notes, setNotes] = useState("");

  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [emptyFromLocation, setEmptyFromLocation] = useState("");
  const [loadedMiles, setLoadedMiles] = useState("");
  const [emptyMiles, setEmptyMiles] = useState("");
  const [calculatingLoaded, setCalculatingLoaded] = useState(false);
  const [calculatingEmpty, setCalculatingEmpty] = useState(false);

  const [startOdo, setStartOdo] = useState("");
  const [endOdo, setEndOdo] = useState("");

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;
  const isSaving = createTrip.isPending || updateTrip.isPending;

  useEffect(() => {
    if (existing && !prefilled) {
      setDate(existing.date ?? today);
      setJurisdiction(existing.jurisdiction ?? "");
      setNotes(existing.notes ?? "");
      setLoadedMiles(existing.loadedMiles != null ? String(existing.loadedMiles) : "");
      setEmptyMiles(existing.emptyMiles != null ? String(existing.emptyMiles) : "");
      setStartOdo(existing.startOdometer != null ? String(existing.startOdometer) : "");
      setEndOdo(existing.endOdometer != null ? String(existing.endOdometer) : "");
      if (existing.pickupLocation) {
        setPickupLocation(existing.pickupLocation);
        setMode("location");
      }
      if (existing.deliveryLocation) setDeliveryLocation(existing.deliveryLocation);
      setPrefilled(true);
    }
  }, [existing]);

  useEffect(() => {
    if (!isEditing && allTrips?.length && !emptyFromLocation) {
      const last = allTrips[0];
      if (last?.deliveryLocation) {
        setEmptyFromLocation(last.deliveryLocation);
      }
    }
  }, [allTrips]);

  const handleCalculateLoaded = async () => {
    if (!pickupLocation.trim() || !deliveryLocation.trim()) {
      return Alert.alert("Missing info", "Enter both pickup and delivery locations first.");
    }
    setCalculatingLoaded(true);
    const [fromCoord, toCoord] = await Promise.all([
      geocode(pickupLocation),
      geocode(deliveryLocation),
    ]);
    if (!fromCoord || !toCoord) {
      setCalculatingLoaded(false);
      return Alert.alert("Location not found", "Could not find one or both locations. Try adding city and state (e.g. Dallas, TX).");
    }
    const miles = await routeDistance(fromCoord, toCoord);
    setCalculatingLoaded(false);
    if (miles == null) {
      return Alert.alert("Route error", "Could not calculate route distance. Enter miles manually.");
    }
    setLoadedMiles(String(miles));
    if (!endOdo && startOdo) setEndOdo(String(parseFloat(startOdo) + miles));
  };

  const handleCalculateEmpty = async () => {
    if (!emptyFromLocation.trim() || !pickupLocation.trim()) {
      return Alert.alert("Missing info", "Enter the previous delivery location and current pickup location.");
    }
    setCalculatingEmpty(true);
    const [fromCoord, toCoord] = await Promise.all([
      geocode(emptyFromLocation),
      geocode(pickupLocation),
    ]);
    if (!fromCoord || !toCoord) {
      setCalculatingEmpty(false);
      return Alert.alert("Location not found", "Could not find one or both locations.");
    }
    const miles = await routeDistance(fromCoord, toCoord);
    setCalculatingEmpty(false);
    if (miles == null) {
      return Alert.alert("Route error", "Could not calculate empty miles. Enter manually.");
    }
    setEmptyMiles(String(miles));
  };

  const calcOdometerMiles = () => {
    const start = parseFloat(startOdo);
    const end = parseFloat(endOdo);
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const total = end - start;
      setLoadedMiles(total.toFixed(0));
      if (!emptyMiles) setEmptyMiles("0");
    }
  };

  const handleSave = async () => {
    const loaded = parseFloat(loadedMiles);
    const empty = parseFloat(emptyMiles) || 0;
    if (!jurisdiction.trim()) return Alert.alert("Error", "State / Jurisdiction is required");
    if (isNaN(loaded) || loaded <= 0) return Alert.alert("Error", "Loaded miles are required");

    const startOdoNum = parseFloat(startOdo) || 0;
    const endOdoNum = parseFloat(endOdo) || (startOdoNum + loaded + empty);

    const payload = {
      date,
      pickupLocation: pickupLocation.trim() || null,
      deliveryLocation: deliveryLocation.trim() || null,
      startOdometer: startOdoNum,
      endOdometer: endOdoNum,
      loadedMiles: loaded,
      emptyMiles: empty,
      jurisdiction: jurisdiction.toUpperCase().slice(0, 2),
      notes: notes.trim() || null,
    };

    try {
      if (isEditing) {
        await updateTrip.mutateAsync({ id: editId!, data: payload });
      } else {
        await createTrip.mutateAsync(payload);
        trackEntryAndRequestReview().catch(() => {});
      }
      router.back();
    } catch {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "save"} trip`);
    }
  };

  const totalMiles = (parseFloat(loadedMiles) || 0) + (parseFloat(emptyMiles) || 0);

  return (
    <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>{isEditing ? "Edit Trip" : "Log Trip"}</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 90 }]}
      >
        {/* Mode Toggle */}
        <View style={[s.modeToggle, { backgroundColor: C.card, borderColor: C.separator }]}>
          <TouchableOpacity
            style={[s.modeBtn, mode === "location" && { backgroundColor: C.primary }]}
            onPress={() => setMode("location")}
          >
            <Ionicons name="navigate-outline" size={14} color={mode === "location" ? "#fff" : C.textSecondary} />
            <Text style={[s.modeBtnText, { color: mode === "location" ? "#fff" : C.textSecondary }]}>By Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, mode === "odometer" && { backgroundColor: C.primary }]}
            onPress={() => setMode("odometer")}
          >
            <Ionicons name="speedometer-outline" size={14} color={mode === "odometer" ? "#fff" : C.textSecondary} />
            <Text style={[s.modeBtnText, { color: mode === "odometer" ? "#fff" : C.textSecondary }]}>By Odometer</Text>
          </TouchableOpacity>
        </View>

        {/* Date */}
        <FormInput
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        {mode === "location" ? (
          <>
            {/* Loaded Miles Section */}
            <View style={[s.sectionBox, { borderColor: C.teal + "60", backgroundColor: C.tealLight }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="cube-outline" size={15} color={C.teal} />
                <Text style={[s.sectionLabel, { color: C.teal }]}>LOADED LEG</Text>
              </View>
              <FormInput
                label="Pickup Location"
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder="Dallas, TX"
              />
              <FormInput
                label="Delivery Location"
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
                placeholder="Houston, TX"
              />
              <TouchableOpacity
                style={[s.calcBtn, { backgroundColor: C.teal, opacity: calculatingLoaded ? 0.7 : 1 }]}
                onPress={handleCalculateLoaded}
                disabled={calculatingLoaded}
                activeOpacity={0.8}
              >
                {calculatingLoaded
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="navigate" size={15} color="#fff" />}
                <Text style={s.calcBtnText}>
                  {calculatingLoaded ? "Calculating…" : "Calculate Loaded Miles"}
                </Text>
              </TouchableOpacity>
              <FormInput
                label="Loaded Miles"
                value={loadedMiles}
                onChangeText={setLoadedMiles}
                placeholder="Auto-calculated or enter manually"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Empty Miles Section */}
            <View style={[s.sectionBox, { borderColor: C.orange + "60", backgroundColor: C.orangeLight }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="arrow-forward-outline" size={15} color={C.orange} />
                <Text style={[s.sectionLabel, { color: C.orange }]}>EMPTY LEG (Deadhead)</Text>
              </View>
              <Text style={[s.hint, { color: C.textSecondary }]}>
                Where did you drive from (empty) to reach the pickup?
              </Text>
              <FormInput
                label="Drove empty from"
                value={emptyFromLocation}
                onChangeText={setEmptyFromLocation}
                placeholder="Previous delivery city (auto-filled)"
              />
              <TouchableOpacity
                style={[s.calcBtn, { backgroundColor: C.orange, opacity: calculatingEmpty ? 0.7 : 1 }]}
                onPress={handleCalculateEmpty}
                disabled={calculatingEmpty}
                activeOpacity={0.8}
              >
                {calculatingEmpty
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="navigate" size={15} color="#fff" />}
                <Text style={s.calcBtnText}>
                  {calculatingEmpty ? "Calculating…" : "Calculate Empty Miles"}
                </Text>
              </TouchableOpacity>
              <FormInput
                label="Empty Miles"
                value={emptyMiles}
                onChangeText={setEmptyMiles}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        ) : (
          <>
            {/* Odometer Section */}
            <View style={[s.sectionBox, { borderColor: C.primary + "60", backgroundColor: C.primaryLight }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="speedometer-outline" size={15} color={C.primary} />
                <Text style={[s.sectionLabel, { color: C.primary }]}>ODOMETER READINGS</Text>
              </View>
              <View style={s.row}>
                <View style={s.half}>
                  <FormInput
                    label="Start Odometer"
                    value={startOdo}
                    onChangeText={setStartOdo}
                    placeholder="125000"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.half}>
                  <FormInput
                    label="End Odometer"
                    value={endOdo}
                    onChangeText={setEndOdo}
                    onBlur={calcOdometerMiles}
                    placeholder="125550"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[s.calcBtn, { backgroundColor: C.primary }]}
                onPress={calcOdometerMiles}
                activeOpacity={0.8}
              >
                <Ionicons name="calculator-outline" size={15} color="#fff" />
                <Text style={s.calcBtnText}>Calculate from Odometer</Text>
              </TouchableOpacity>
            </View>

            <View style={s.row}>
              <View style={s.half}>
                <FormInput
                  label="Loaded Miles"
                  value={loadedMiles}
                  onChangeText={setLoadedMiles}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.half}>
                <FormInput
                  label="Empty Miles"
                  value={emptyMiles}
                  onChangeText={setEmptyMiles}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        )}

        {/* Miles Summary */}
        {(parseFloat(loadedMiles) > 0 || parseFloat(emptyMiles) > 0) && (
          <View style={[s.summaryBox, { backgroundColor: C.card, borderColor: C.separator }]}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryNum, { color: C.teal }]}>{parseFloat(loadedMiles || "0").toFixed(0)}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Loaded</Text>
              </View>
              <Text style={[s.summaryPlus, { color: C.textMuted }]}>+</Text>
              <View style={s.summaryItem}>
                <Text style={[s.summaryNum, { color: C.orange }]}>{parseFloat(emptyMiles || "0").toFixed(0)}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Empty</Text>
              </View>
              <Text style={[s.summaryPlus, { color: C.textMuted }]}>=</Text>
              <View style={s.summaryItem}>
                <Text style={[s.summaryNum, { color: C.text }]}>{totalMiles.toFixed(0)}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total</Text>
              </View>
            </View>
          </View>
        )}

        {/* Jurisdiction */}
        <SelectField
          label="State / Jurisdiction"
          value={jurisdiction}
          options={US_STATES}
          placeholder="Select state"
          onChange={setJurisdiction}
        />

        {/* Notes */}
        <View style={{ marginBottom: 8 }}>
          <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Route details, stops, etc."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>

      <View style={[s.footer, { paddingBottom: bottomPad + 12, borderTopColor: C.separator, backgroundColor: C.background }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>{isEditing ? "Update Trip" : "Save Trip"}</Text>}
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
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  modeBtnText: { fontSize: 13, fontWeight: "600" },
  sectionBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  hint: { fontSize: 12, marginBottom: 6, lineHeight: 17 },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    marginVertical: 4,
  },
  calcBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  summaryBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  summaryItem: { alignItems: "center" },
  summaryNum: { fontSize: 24, fontWeight: "800" },
  summaryLbl: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  summaryPlus: { fontSize: 20, fontWeight: "300" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
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
