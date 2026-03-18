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
import { useCreateIncome } from "@/hooks/useApi";

export default function AddIncomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createIncome = useCreateIncome();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [routeName, setRouteName] = useState("");
  const [notes, setNotes] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async () => {
    if (!source.trim()) return Alert.alert("Error", "Source is required");
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Log Income
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createIncome.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.green }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createIncome.isPending ? "Saving..." : "Save"}
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
          label="Source / Broker"
          value={source}
          onChangeText={setSource}
          placeholder="e.g. J.B. Hunt, Amazon Freight"
          autoFocus
        />
        <FormInput
          label="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <FormInput
          label="Trailer Number (Optional)"
          value={trailerNumber}
          onChangeText={setTrailerNumber}
          placeholder="e.g. TR-1234"
        />
        <FormInput
          label="Route Name (Optional)"
          value={routeName}
          onChangeText={setRouteName}
          placeholder="e.g. Dallas → Houston"
        />
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
});
