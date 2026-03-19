import React, { useState } from "react";
import {
  ScrollView,
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
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useCreateExpense, useAssets } from "@/hooks/useApi";

const CATEGORIES = [
  { label: "Fuel", value: "Fuel" },
  { label: "Repairs", value: "Repairs" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Insurance", value: "Insurance" },
  { label: "Tolls", value: "Tolls" },
  { label: "Parking", value: "Parking" },
  { label: "Scale Fee", value: "Scale Fee" },
  { label: "Lumper", value: "Lumper" },
  { label: "Other", value: "Other" },
];

const PAYMENT_METHODS = [
  { label: "Cash", value: "Cash" },
  { label: "Check", value: "Check" },
  { label: "Fuel Card", value: "Fuel Card" },
  { label: "EFS Check", value: "EFS Check" },
  { label: "Comchek", value: "Comchek" },
  { label: "Credit Card", value: "Credit Card" },
  { label: "Other", value: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
].map((s) => ({ label: s, value: s }));

export default function AddExpenseScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const createExpense = useCreateExpense();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Fuel");
  const [payment, setPayment] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const isFuel = category === "Fuel";
  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

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
        gallons: gallons ? parseFloat(gallons) : null,
        pricePerGallon: pricePerGallon ? parseFloat(pricePerGallon) : null,
        jurisdiction: jurisdiction || null,
      } as Parameters<typeof createExpense.mutateAsync>[0]);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save expense");
    }
  };

  return (
    <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={[s.title, { color: C.text }]}>Log Expense</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 80 }]}
      >
        {/* Scan Receipt */}
        <TouchableOpacity
          style={[s.scanRow, { backgroundColor: C.primaryLight }]}
          onPress={() => router.push("/scan-receipt")}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={18} color={C.primary} />
          <Text style={[s.scanText, { color: C.primary }]}>Scan Receipt to Auto-fill</Text>
        </TouchableOpacity>

        {/* Merchant */}
        <FormInput
          label="Merchant"
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Pilot Flying J"
          autoFocus
        />

        {/* Amount + Date row */}
        <View style={s.row}>
          <View style={s.half}>
            <FormInput
              label="Amount ($)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.half}>
            <FormInput
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="MM/DD/YYYY"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Category + Payment row */}
        <View style={s.row}>
          <View style={s.half}>
            <SelectField
              label="Category"
              value={category}
              options={CATEGORIES}
              onChange={setCategory}
            />
          </View>
          <View style={s.half}>
            <SelectField
              label="Payment"
              value={payment}
              options={PAYMENT_METHODS}
              placeholder="Select"
              onChange={setPayment}
            />
          </View>
        </View>

        {/* Fuel Details */}
        {isFuel && (
          <View style={[s.fuelBox, { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }]}>
            <View style={s.fuelHeader}>
              <MaterialCommunityIcons name="fire" size={16} color="#f59e0b" />
              <Text style={s.fuelTitle}>FUEL DETAILS</Text>
            </View>

            <View style={s.row}>
              <View style={s.half}>
                <FormInput
                  label="$/Gallon"
                  value={pricePerGallon}
                  onChangeText={setPricePerGallon}
                  placeholder="3.459"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.half}>
                <FormInput
                  label="Gallons"
                  value={gallons}
                  onChangeText={setGallons}
                  placeholder="120.5"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <SelectField
              label="State / Jurisdiction"
              value={jurisdiction}
              options={US_STATES}
              placeholder="Select state"
              onChange={setJurisdiction}
            />
          </View>
        )}

        {/* Notes */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: C.inputBackground, borderColor: C.cardBorder, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Details..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>

      {/* Save Button */}
      <View style={[s.footer, { paddingBottom: bottomPad + 12, borderTopColor: C.separator, backgroundColor: C.background }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary, opacity: createExpense.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createExpense.isPending}
          activeOpacity={0.85}
        >
          {createExpense.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>Save Expense</Text>
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
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  scanText: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  fuelBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  fuelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  fuelTitle: { fontSize: 12, fontWeight: "700", color: "#f59e0b", letterSpacing: 0.8 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 90,
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
