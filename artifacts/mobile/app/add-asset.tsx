import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { FormInput } from "@/components/FormInput";
import { useCreateAsset } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AddAssetScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createAsset = useCreateAsset();

  const [type, setType] = useState<"Truck" | "Trailer">("Truck");
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async () => {
    if (!vin.trim() || !plate.trim() || !make.trim() || !model.trim()) {
      return Alert.alert("Error", "All fields are required");
    }
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      return Alert.alert("Error", "Invalid year");
    }

    try {
      await createAsset.mutateAsync({
        type,
        vin: vin.trim(),
        plate: plate.trim(),
        year: yearNum,
        make: make.trim(),
        model: model.trim(),
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to add asset");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Add Fleet Asset
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createAsset.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createAsset.isPending ? "Saving..." : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 40 }}
      >
        <ThemedText variant="secondary" weight="medium" style={styles.fieldLabel}>
          Type
        </ThemedText>
        <View style={styles.typeRow}>
          {(["Truck", "Trailer"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: type === t ? theme.primary : theme.card,
                  borderColor: type === t ? theme.primary : theme.cardBorder,
                },
              ]}
            >
              <Feather
                name={t === "Truck" ? "truck" : "box"}
                size={18}
                color={type === t ? "#fff" : theme.textSecondary}
              />
              <ThemedText
                weight="semibold"
                style={{ color: type === t ? "#fff" : theme.textSecondary }}
              >
                {t}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <FormInput
          label="VIN"
          value={vin}
          onChangeText={setVin}
          placeholder="Vehicle Identification Number"
          autoCapitalize="characters"
          autoFocus
        />
        <FormInput
          label="License Plate"
          value={plate}
          onChangeText={setPlate}
          placeholder="e.g. ABC-1234"
          autoCapitalize="characters"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Year"
              value={year}
              onChangeText={setYear}
              placeholder="2020"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 2 }}>
            <FormInput
              label="Make"
              value={make}
              onChangeText={setMake}
              placeholder="e.g. Peterbilt"
            />
          </View>
        </View>
        <FormInput
          label="Model"
          value={model}
          onChangeText={setModel}
          placeholder="e.g. 389"
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
  fieldLabel: { fontSize: 13, marginBottom: 10 },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  row: { flexDirection: "row", gap: 12 },
});
