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
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { FormInput } from "@/components/FormInput";
import { useCreateTrip } from "@/hooks/useApi";

export default function AddTripScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createTrip = useCreateTrip();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [startOdo, setStartOdo] = useState("");
  const [endOdo, setEndOdo] = useState("");
  const [loadedMiles, setLoadedMiles] = useState("");
  const [emptyMiles, setEmptyMiles] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [notes, setNotes] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const calcMiles = () => {
    const start = parseFloat(startOdo);
    const end = parseFloat(endOdo);
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const total = end - start;
      if (!loadedMiles && !emptyMiles) {
        setLoadedMiles(total.toFixed(0));
        setEmptyMiles("0");
      }
    }
  };

  const handleSave = async () => {
    if (!startOdo || !endOdo || !jurisdiction.trim()) {
      return Alert.alert("Error", "Date, odometer readings, and jurisdiction are required");
    }
    const start = parseFloat(startOdo);
    const end = parseFloat(endOdo);
    if (isNaN(start) || isNaN(end) || end <= start) {
      return Alert.alert("Error", "End odometer must be greater than start");
    }

    try {
      await createTrip.mutateAsync({
        date,
        startOdometer: start,
        endOdometer: end,
        loadedMiles: parseFloat(loadedMiles) || 0,
        emptyMiles: parseFloat(emptyMiles) || 0,
        jurisdiction: jurisdiction.toUpperCase().slice(0, 2),
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save trip");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Log Trip
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createTrip.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.green }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createTrip.isPending ? "Saving..." : "Save"}
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
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Start Odometer"
              value={startOdo}
              onChangeText={setStartOdo}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput
              label="End Odometer"
              value={endOdo}
              onChangeText={setEndOdo}
              onBlur={calcMiles}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Loaded Miles"
              value={loadedMiles}
              onChangeText={setLoadedMiles}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Empty Miles"
              value={emptyMiles}
              onChangeText={setEmptyMiles}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>
        <FormInput
          label="Jurisdiction (State)"
          value={jurisdiction}
          onChangeText={(t) => setJurisdiction(t.toUpperCase().slice(0, 2))}
          placeholder="e.g. TX"
          autoCapitalize="characters"
          maxLength={2}
        />
        <FormInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Route details, stops, etc."
          multiline
          numberOfLines={3}
          style={{ minHeight: 80 }}
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
