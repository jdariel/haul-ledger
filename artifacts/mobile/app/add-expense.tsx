import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { FormInput } from "@/components/FormInput";
import { useCreateExpense, useAssets } from "@/hooks/useApi";

const CATEGORIES = [
  "Fuel", "Repairs", "Maintenance", "Insurance",
  "Tolls", "Parking", "Scale Fee", "Lumper", "Other",
];

export default function AddExpenseScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createExpense = useCreateExpense();
  const { data: assets } = useAssets();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Fuel");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const isFuel = category === "Fuel";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const trucks = assets?.filter((a: any) => a.type === "Truck") ?? [];

  const handleSave = async () => {
    if (!merchant.trim()) return Alert.alert("Error", "Merchant is required");
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Valid amount is required");

    try {
      await createExpense.mutateAsync({
        date,
        merchant: merchant.trim(),
        category,
        amount: parseFloat(amount),
        notes: notes.trim() || null,
        truckId: selectedTruck,
        gallons: gallons ? parseFloat(gallons) : null,
        pricePerGallon: pricePerGallon ? parseFloat(pricePerGallon) : null,
        jurisdiction: jurisdiction.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save expense");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Add Expense
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createExpense.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createExpense.isPending ? "Saving..." : "Save"}
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
        <FormInput
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />
        <FormInput
          label="Merchant / Vendor"
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Pilot Flying J"
          autoFocus
        />
        <FormInput
          label="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <ThemedText variant="secondary" weight="medium" style={styles.fieldLabel}>
          Category
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.catChip,
                {
                  backgroundColor: category === cat ? theme.primary : theme.card,
                  borderColor: category === cat ? theme.primary : theme.cardBorder,
                },
              ]}
            >
              <ThemedText
                weight="medium"
                style={[styles.catText, { color: category === cat ? "#fff" : theme.textSecondary }]}
              >
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {trucks.length > 0 ? (
          <>
            <ThemedText variant="secondary" weight="medium" style={[styles.fieldLabel, { marginTop: 8 }]}>
              Truck (Optional)
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.catScroll, { marginBottom: 16 }]}
            >
              {trucks.map((truck: any) => (
                <TouchableOpacity
                  key={truck.id}
                  onPress={() => setSelectedTruck(selectedTruck === truck.id ? null : truck.id)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selectedTruck === truck.id ? theme.primaryLight : theme.card,
                      borderColor: selectedTruck === truck.id ? theme.primaryLight : theme.cardBorder,
                    },
                  ]}
                >
                  <ThemedText
                    weight="medium"
                    style={{ color: selectedTruck === truck.id ? "#fff" : theme.textSecondary, fontSize: 13 }}
                  >
                    {truck.year} {truck.make}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}

        {isFuel ? (
          <>
            <View style={styles.fuelRow}>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Gallons"
                  value={gallons}
                  onChangeText={setGallons}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Price/Gal"
                  value={pricePerGallon}
                  onChangeText={setPricePerGallon}
                  placeholder="0.000"
                  keyboardType="decimal-pad"
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
          </>
        ) : null}

        <FormInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details..."
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
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  catScroll: { gap: 8, paddingBottom: 16 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: { fontSize: 13 },
  fuelRow: { flexDirection: "row", gap: 12 },
});
