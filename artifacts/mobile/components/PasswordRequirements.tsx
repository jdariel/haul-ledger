import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PASSWORD_RULES } from "@/lib/passwordValidation";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Props {
  password: string;
}

export function PasswordRequirements({ password }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <View style={[s.container, { backgroundColor: C.card, borderColor: C.separator }]}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View key={rule.label} style={s.row}>
            <Ionicons
              name={met ? "checkmark-circle" : "ellipse-outline"}
              size={15}
              color={met ? "#16a34a" : C.textMuted}
            />
            <Text style={[s.label, { color: met ? "#16a34a" : C.textSecondary }]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 17,
  },
});
