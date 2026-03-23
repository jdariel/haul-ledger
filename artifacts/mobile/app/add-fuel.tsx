import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { FormInput } from "@/components/FormInput";
import { useCreateFuelEntry } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { trackEntryAndRequestReview } from "@/lib/appReview";

export default function AddFuelScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createFuel = useCreateFuelEntry();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [vendor, setVendor] = useState("");
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const calcTotal = () => {
    const g = parseFloat(gallons);
    const p = parseFloat(pricePerGallon);
    if (!isNaN(g) && !isNaN(p)) {
      setTotalAmount((g * p).toFixed(2));
    }
  };

  const handleSave = async () => {
    if (!vendor.trim()) return Alert.alert("Error", "Vendor is required");
    if (!gallons || !pricePerGallon || !jurisdiction || !totalAmount) {
      return Alert.alert("Error", "All fuel fields are required");
    }

    try {
      await createFuel.mutateAsync({
        date,
        vendor: vendor.trim(),
        gallons: parseFloat(gallons),
        pricePerGallon: parseFloat(pricePerGallon),
        jurisdiction: jurisdiction.toUpperCase().slice(0, 2),
        totalAmount: parseFloat(totalAmount),
      });
      trackEntryAndRequestReview().catch(() => {});
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save fuel entry");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Log Fuel
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createFuel.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createFuel.isPending ? "Saving..." : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: bottomPad + 40,
        }}
      >
        <FormInput label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <FormInput
          label="Vendor"
          value={vendor}
          onChangeText={setVendor}
          placeholder="e.g. Pilot Flying J"
          autoFocus
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Gallons"
              value={gallons}
              onChangeText={setGallons}
              onBlur={calcTotal}
              placeholder="0.0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Price/Gallon"
              value={pricePerGallon}
              onChangeText={setPricePerGallon}
              onBlur={calcTotal}
              placeholder="0.000"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <FormInput
          label="Total Amount ($)"
          value={totalAmount}
          onChangeText={setTotalAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <FormInput
          label="Jurisdiction (State)"
          value={jurisdiction}
          onChangeText={(t) => setJurisdiction(t.toUpperCase().slice(0, 2))}
          placeholder="e.g. TX"
          autoCapitalize="characters"
          maxLength={2}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  row: { flexDirection: "row", gap: 12 },
});
