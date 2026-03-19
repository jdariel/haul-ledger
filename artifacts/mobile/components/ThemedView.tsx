import React from "react";
import { View, ViewProps } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ThemedViewProps extends ViewProps {
  variant?: "background" | "card" | "secondary";
}

export function ThemedView({ style, variant = "background", ...props }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const bg =
    variant === "card"
      ? theme.card
      : variant === "secondary"
      ? theme.backgroundSecondary
      : theme.background;

  return <View style={[{ backgroundColor: bg }, style]} {...props} />;
}
