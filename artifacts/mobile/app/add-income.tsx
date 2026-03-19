import React, { useState } from "react";
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
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useCreateIncome, useSavedRoutes } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AddIncomeScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const createIncome = useCreateIncome();
  const { data: savedRoutes } = useSavedRoutes();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [routeName, setRouteName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  const routeOptions = [
    { label: "Pick a saved route…", value: "" },
    ...(savedRoutes ?? []).map((r: any) => ({ label: r.name, value: String(r.id) })),
  ];

  const handleRouteSelect = (routeId: string) => {
    setSelectedRoute(routeId);
    if (!routeId) return;
    const route = (savedRoutes ?? []).find((r: any) => String(r.id) === routeId);
    if (route) {
      setRouteName(route.name);
      if (route.standardRate) setAmount(String(route.standardRate));
    }
  };

  const handleSave = async () => {
    if (!source.trim()) return Alert.alert("Error", "Source / Broker is required");
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Valid amount is required");

    try {
      await createIncome.mutateAsync({
        date,
        source: source.trim(),
        amount: parseFloat(amount),
        trailerNumber: trailerNumber.trim() || null,
        routeName: routeName.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save income");
    }
  };

  return (
    <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={[s.title, { color: C.green }]}>Log Income</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 80 }]}
      >
        {/* Quick Fill from Saved Route */}
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

        {/* Source */}
        <FormInput
          label="Source (Broker/Load ID)"
          value={source}
          onChangeText={setSource}
          placeholder="TQL Load #12345"
          autoFocus
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
              placeholder="MM/DD/YYYY"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Trailer # + Route Name row */}
        <View style={s.row}>
          <View style={s.half}>
            <FormInput
              label="Trailer #"
              value={trailerNumber}
              onChangeText={setTrailerNumber}
              placeholder="TR-5678"
            />
          </View>
          <View style={s.half}>
            <FormInput
              label="Route Name"
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Chicago - Dallas"
            />
          </View>
        </View>

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

      {/* Save Button */}
      <View style={[s.footer, { paddingBottom: bottomPad + 12, borderTopColor: C.separator, backgroundColor: C.background }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.green, opacity: createIncome.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={createIncome.isPending}
          activeOpacity={0.85}
        >
          {createIncome.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>Save Income</Text>
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
