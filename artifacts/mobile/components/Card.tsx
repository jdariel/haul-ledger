import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface CardProps extends ViewProps {
  noPadding?: boolean;
}

export function Card({ style, noPadding, ...props }: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        noPadding && { padding: 0 },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});
