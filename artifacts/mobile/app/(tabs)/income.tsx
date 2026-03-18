import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { SwipeableRow } from "@/components/SwipeableRow";
import { useIncome, useDeleteIncome } from "@/hooks/useApi";

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IncomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [showWeekOnly, setShowWeekOnly] = useState(false);

  const { data: income, isLoading, refetch } = useIncome({ week: showWeekOnly });
  const deleteIncome = useDeleteIncome();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const total = income?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;

  const handleDelete = (id: number) => {
    Alert.alert("Delete Income", "Remove this income entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteIncome.mutate(id),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <ThemedText weight="bold" style={styles.title}>
            Income
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowWeekOnly(!showWeekOnly)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: showWeekOnly ? theme.primary : theme.card,
                  borderColor: showWeekOnly ? theme.primary : theme.cardBorder,
                },
              ]}
            >
              <ThemedText
                weight="medium"
                style={[styles.toggleText, { color: showWeekOnly ? "#fff" : theme.text }]}
              >
                Week
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.green }]}
              onPress={() => router.push("/add-income")}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {income && income.length > 0 ? (
          <Card style={styles.totalCard}>
            <View style={styles.totalRow}>
              <View style={[styles.totalIcon, { backgroundColor: theme.green + "22" }]}>
                <MaterialCommunityIcons name="cash" size={20} color={theme.green} />
              </View>
              <View>
                <ThemedText variant="secondary" style={styles.totalLabel}>
                  {showWeekOnly ? "This Week" : "All Time"} Total
                </ThemedText>
                <ThemedText variant="green" weight="bold" style={styles.totalValue}>
                  +{formatCurrency(total)}
                </ThemedText>
              </View>
            </View>
          </Card>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={income ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottomPad + 100,
            gap: 8,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="cash" size={48} color={theme.textMuted} />
              <ThemedText variant="muted" style={styles.emptyText}>
                No income entries yet
              </ThemedText>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: theme.green }]}
                onPress={() => router.push("/add-income")}
              >
                <ThemedText weight="semibold" style={{ color: "#fff", fontSize: 15 }}>
                  Log Income
                </ThemedText>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <SwipeableRow onDelete={() => handleDelete(item.id)}>
              <Card style={styles.incomeCard}>
                <View style={styles.incomeRow}>
                  <View style={[styles.incomeIcon, { backgroundColor: theme.green + "22" }]}>
                    <Feather name="arrow-down-left" size={18} color={theme.green} />
                  </View>
                  <View style={styles.incomeInfo}>
                    <ThemedText weight="semibold" style={styles.source}>
                      {item.source}
                    </ThemedText>
                    <View style={styles.incomeMeta}>
                      {item.routeName ? (
                        <ThemedText variant="muted" style={styles.metaText}>
                          {item.routeName}
                        </ThemedText>
                      ) : null}
                      {item.trailerNumber ? (
                        <ThemedText variant="muted" style={styles.metaText}>
                          Trailer #{item.trailerNumber}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText variant="muted" style={styles.incomeDate}>
                      {item.date}
                    </ThemedText>
                    {item.notes ? (
                      <ThemedText variant="muted" style={styles.notes} numberOfLines={1}>
                        {item.notes}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText variant="green" weight="bold" style={styles.amount}>
                    +{formatCurrency(item.amount)}
                  </ThemedText>
                </View>
              </Card>
            </SwipeableRow>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28 },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  totalCard: { marginBottom: 8 },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  totalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 22 },
  incomeCard: { padding: 14 },
  incomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  incomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  incomeInfo: { flex: 1 },
  source: { fontSize: 16 },
  incomeMeta: { flexDirection: "row", gap: 8, marginTop: 4 },
  metaText: { fontSize: 12 },
  incomeDate: { fontSize: 12, marginTop: 2 },
  notes: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 18 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
});
