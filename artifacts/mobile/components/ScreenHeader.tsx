import React from "react";
import { View, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack, rightAction }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding + 12,
          borderBottomColor: theme.separator,
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          <ThemedText weight="bold" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText variant="secondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});
