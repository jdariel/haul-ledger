import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { SwipeableRow } from "@/components/SwipeableRow";
import { useExpenses, useDeleteExpense } from "@/hooks/useApi";

const CATEGORIES = [
  "All", "Fuel", "Repairs", "Maintenance", "Insurance",
  "Tolls", "Parking", "Scale Fee", "Lumper", "Other",
];

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCategoryColor(category: string, theme: any) {
  const map: Record<string, string> = {
    Fuel: theme.primary,
    Repairs: theme.red,
    Maintenance: theme.orange,
    Insurance: theme.yellow,
    Tolls: theme.green,
    Parking: theme.greenLight,
    "Scale Fee": theme.primaryLight,
    Lumper: theme.textSecondary,
  };
  return map[category] ?? theme.textMuted;
}

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showWeekOnly, setShowWeekOnly] = useState(false);
  const [search, setSearch] = useState("");

  const { data: expenses, isLoading, refetch } = useExpenses({
    category: selectedCategory !== "All" ? selectedCategory : undefined,
    week: showWeekOnly,
    search: search.trim() || undefined,
  });
  const deleteExpense = useDeleteExpense();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleDelete = (id: number) => {
    Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteExpense.mutate(id),
      },
    ]);
  };

  const totalShown = expenses?.reduce((s: number, e: any) => s + e.amount, 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <ThemedText weight="bold" style={styles.title}>
            Expenses
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
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push("/add-expense")}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
          <Feather name="search" size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchant..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === cat ? theme.primary : theme.card,
                  borderColor: selectedCategory === cat ? theme.primary : theme.cardBorder,
                },
              ]}
            >
              <ThemedText
                weight="medium"
                style={[
                  styles.categoryText,
                  { color: selectedCategory === cat ? "#fff" : theme.textSecondary },
                ]}
              >
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {expenses && expenses.length > 0 ? (
          <View style={styles.totalRow}>
            <ThemedText variant="muted" style={styles.totalLabel}>
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · Total:
            </ThemedText>
            <ThemedText variant="red" weight="semibold" style={styles.totalValue}>
              {formatCurrency(totalShown)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={expenses ?? []}
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
              <Feather name="credit-card" size={48} color={theme.textMuted} />
              <ThemedText variant="muted" style={styles.emptyText}>
                No expenses found
              </ThemedText>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/add-expense")}
              >
                <ThemedText weight="semibold" style={{ color: "#fff", fontSize: 15 }}>
                  Add Expense
                </ThemedText>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <SwipeableRow onDelete={() => handleDelete(item.id)}>
              <Card style={styles.expenseCard}>
                <View style={styles.expenseRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(item.category, theme) + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryDotInner,
                        { backgroundColor: getCategoryColor(item.category, theme) },
                      ]}
                    />
                  </View>
                  <View style={styles.expenseInfo}>
                    <ThemedText weight="semibold" style={styles.merchant}>
                      {item.merchant}
                    </ThemedText>
                    <View style={styles.expenseMeta}>
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: getCategoryColor(item.category, theme) + "22" },
                        ]}
                      >
                        <ThemedText
                          style={[styles.catBadgeText, { color: getCategoryColor(item.category, theme) }]}
                        >
                          {item.category}
                        </ThemedText>
                      </View>
                      <ThemedText variant="muted" style={styles.expenseDate}>
                        {item.date}
                      </ThemedText>
                    </View>
                    {item.notes ? (
                      <ThemedText variant="muted" style={styles.notes} numberOfLines={1}>
                        {item.notes}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText variant="red" weight="bold" style={styles.amount}>
                    -{formatCurrency(item.amount)}
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
    marginBottom: 12,
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  categoryScroll: { gap: 8, paddingBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 13 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 15 },
  expenseCard: { padding: 12 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryDotInner: { width: 10, height: 10, borderRadius: 5 },
  expenseInfo: { flex: 1 },
  merchant: { fontSize: 15 },
  expenseMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  expenseDate: { fontSize: 12 },
  notes: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 16 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
});
