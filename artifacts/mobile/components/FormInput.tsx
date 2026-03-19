import React from "react";
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormInput({ label, error, style, ...props }: FormInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <ThemedText variant="secondary" weight="medium" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: error ? theme.red : theme.cardBorder,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        {...props}
      />
      {error ? (
        <ThemedText variant="red" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
