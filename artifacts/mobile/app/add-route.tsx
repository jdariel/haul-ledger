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
import { useCreateSavedRoute } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AddRouteScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const createRoute = useCreateSavedRoute();

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [standardRate, setStandardRate] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async () => {
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      return Alert.alert("Error", "Name, origin, and destination are required");
    }
    if (!standardRate || isNaN(parseFloat(standardRate))) {
      return Alert.alert("Error", "Valid standard rate is required");
    }

    try {
      await createRoute.mutateAsync({
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        standardRate: parseFloat(standardRate),
      });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save route");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: theme.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText weight="bold" style={styles.headerTitle}>
          Add Saved Route
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={createRoute.isPending}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText weight="semibold" style={{ color: "#fff" }}>
            {createRoute.isPending ? "Saving..." : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 40 }}
      >
        <FormInput
          label="Route Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Dallas–Houston Run"
          autoFocus
        />
        <FormInput
          label="Origin"
          value={origin}
          onChangeText={setOrigin}
          placeholder="e.g. Dallas, TX"
        />
        <FormInput
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Houston, TX"
        />
        <FormInput
          label="Standard Rate ($)"
          value={standardRate}
          onChangeText={setStandardRate}
          placeholder="0.00"
          keyboardType="decimal-pad"
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
