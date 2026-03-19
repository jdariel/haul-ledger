import React from "react";
import { Text, TextProps } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ThemedTextProps extends TextProps {
  variant?: "default" | "secondary" | "muted" | "primary" | "green" | "red";
  weight?: "regular" | "medium" | "semibold" | "bold";
}

export function ThemedText({
  style,
  variant = "default",
  weight = "regular",
  ...props
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const color =
    variant === "secondary"
      ? theme.textSecondary
      : variant === "muted"
      ? theme.textMuted
      : variant === "primary"
      ? theme.primary
      : variant === "green"
      ? theme.green
      : variant === "red"
      ? theme.red
      : theme.text;

  const fontFamily =
    weight === "bold"
      ? "Inter_700Bold"
      : weight === "semibold"
      ? "Inter_600SemiBold"
      : weight === "medium"
      ? "Inter_500Medium"
      : "Inter_400Regular";

  return <Text style={[{ color, fontFamily }, style]} {...props} />;
}
