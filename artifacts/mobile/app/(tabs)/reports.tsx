import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useExpenses, useIncome, useTrips, useFuelEntries } from "@/hooks/useApi";

function formatCurrency(val: number) {
  return `$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EXPENSE_CATEGORIES = [
  "Fuel", "Repairs", "Maintenance", "Insurance", "Tolls", "Parking", "Scale Fee", "Lumper", "Other",
];

type ReportType = "ifta" | "scheduleC";

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [activeReport, setActiveReport] = useState<ReportType>("ifta");

  const { data: expenses, isLoading: loadingExp } = useExpenses();
  const { data: income, isLoading: loadingInc } = useIncome();
  const { data: trips, isLoading: loadingTrips } = useTrips();
  const { data: fuel, isLoading: loadingFuel } = useFuelEntries();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isLoading = loadingExp || loadingInc || loadingTrips || loadingFuel;

  const milesByJurisdiction = (trips ?? []).reduce((acc: Record<string, { loaded: number; empty: number }>, t: any) => {
    if (!acc[t.jurisdiction]) acc[t.jurisdiction] = { loaded: 0, empty: 0 };
    acc[t.jurisdiction].loaded += t.loadedMiles;
    acc[t.jurisdiction].empty += t.emptyMiles;
    return acc;
  }, {});

  const fuelByJurisdiction = (fuel ?? []).reduce((acc: Record<string, { gallons: number; amount: number }>, f: any) => {
    if (!acc[f.jurisdiction]) acc[f.jurisdiction] = { gallons: 0, amount: 0 };
    acc[f.jurisdiction].gallons += f.gallons;
    acc[f.jurisdiction].amount += f.totalAmount;
    return acc;
  }, {});

  const allJurisdictions = Array.from(
    new Set([...Object.keys(milesByJurisdiction), ...Object.keys(fuelByJurisdiction)])
  ).sort();

  const expenseByCategory = EXPENSE_CATEGORIES.reduce((acc: Record<string, number>, cat) => {
    acc[cat] = (expenses ?? [])
      .filter((e: any) => e.category === cat)
      .reduce((s: number, e: any) => s + e.amount, 0);
    return acc;
  }, {});

  const totalIncome = (income ?? []).reduce((s: number, i: any) => s + i.amount, 0);
  const totalExpenses = (expenses ?? []).reduce((s: number, e: any) => s + e.amount, 0);

  const exportCSV = (type: ReportType) => {
    Alert.alert(
      "Export",
      `${type === "ifta" ? "IFTA" : "Schedule C"} report data is ready. In a production app this would download a CSV file.`,
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 12,
        paddingBottom: bottomPad + 100,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText weight="bold" style={styles.title}>
        Reports
      </ThemedText>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeReport === "ifta" ? theme.primary : theme.card,
              borderColor: activeReport === "ifta" ? theme.primary : theme.cardBorder,
            },
          ]}
          onPress={() => setActiveReport("ifta")}
        >
          <ThemedText
            weight="semibold"
            style={{ color: activeReport === "ifta" ? "#fff" : theme.textSecondary }}
          >
            IFTA Report
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeReport === "scheduleC" ? theme.primary : theme.card,
              borderColor: activeReport === "scheduleC" ? theme.primary : theme.cardBorder,
            },
          ]}
          onPress={() => setActiveReport("scheduleC")}
        >
          <ThemedText
            weight="semibold"
            style={{ color: activeReport === "scheduleC" ? "#fff" : theme.textSecondary }}
          >
            Schedule C
          </ThemedText>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : activeReport === "ifta" ? (
        <>
          <View style={styles.sectionHeader}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>
              Miles by Jurisdiction
            </ThemedText>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: theme.primary + "22", borderColor: theme.primary + "44" }]}
              onPress={() => exportCSV("ifta")}
            >
              <Feather name="download" size={14} color={theme.primary} />
              <ThemedText variant="primary" style={styles.exportText}>
                Export CSV
              </ThemedText>
            </TouchableOpacity>
          </View>

          {allJurisdictions.length === 0 ? (
            <ThemedText variant="muted" style={styles.noData}>
              No trip data yet
            </ThemedText>
          ) : (
            allJurisdictions.map((juris) => {
              const miles = milesByJurisdiction[juris];
              const fuelData = fuelByJurisdiction[juris];
              const totalMiles = (miles?.loaded ?? 0) + (miles?.empty ?? 0);
              const taxCalc = totalMiles > 0
                ? ((miles?.loaded ?? 0) / totalMiles) * (fuelData?.gallons ?? 0) * 0.246
                : 0;
              return (
                <Card key={juris} style={styles.jurisCard}>
                  <View style={styles.jurisHeader}>
                    <View style={[styles.jurisBadge, { backgroundColor: theme.primary + "22" }]}>
                      <ThemedText variant="primary" weight="bold" style={styles.jurisCode}>
                        {juris}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }} />
                    <ThemedText variant="secondary" style={styles.taxEst}>
                      Tax est: {formatCurrency(taxCalc)}
                    </ThemedText>
                  </View>
                  <View style={styles.jurisStats}>
                    <View style={styles.jStat}>
                      <ThemedText variant="muted" style={styles.jStatLabel}>Loaded</ThemedText>
                      <ThemedText weight="semibold" style={styles.jStatValue}>
                        {(miles?.loaded ?? 0).toFixed(0)} mi
                      </ThemedText>
                    </View>
                    <View style={styles.jStat}>
                      <ThemedText variant="muted" style={styles.jStatLabel}>Empty</ThemedText>
                      <ThemedText weight="semibold" style={styles.jStatValue}>
                        {(miles?.empty ?? 0).toFixed(0)} mi
                      </ThemedText>
                    </View>
                    <View style={styles.jStat}>
                      <ThemedText variant="muted" style={styles.jStatLabel}>Fuel Gal</ThemedText>
                      <ThemedText weight="semibold" style={styles.jStatValue}>
                        {(fuelData?.gallons ?? 0).toFixed(1)}
                      </ThemedText>
                    </View>
                    <View style={styles.jStat}>
                      <ThemedText variant="muted" style={styles.jStatLabel}>Fuel $</ThemedText>
                      <ThemedText weight="semibold" style={styles.jStatValue}>
                        {formatCurrency(fuelData?.amount ?? 0)}
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <ThemedText weight="semibold" style={styles.sectionTitle}>
              Schedule C Summary
            </ThemedText>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: theme.primary + "22", borderColor: theme.primary + "44" }]}
              onPress={() => exportCSV("scheduleC")}
            >
              <Feather name="download" size={14} color={theme.primary} />
              <ThemedText variant="primary" style={styles.exportText}>
                Export CSV
              </ThemedText>
            </TouchableOpacity>
          </View>

          <Card style={styles.summaryBlock}>
            <View style={styles.summaryRow}>
              <ThemedText variant="secondary">Gross Income</ThemedText>
              <ThemedText variant="green" weight="bold">+{formatCurrency(totalIncome)}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <View style={styles.summaryRow}>
              <ThemedText variant="secondary">Total Expenses</ThemedText>
              <ThemedText variant="red" weight="bold">-{formatCurrency(totalExpenses)}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <View style={styles.summaryRow}>
              <ThemedText weight="bold">Net Profit / Loss</ThemedText>
              <ThemedText
                weight="bold"
                style={{ color: totalIncome - totalExpenses >= 0 ? theme.green : theme.red }}
              >
                {totalIncome - totalExpenses >= 0 ? "+" : "-"}
                {formatCurrency(totalIncome - totalExpenses)}
              </ThemedText>
            </View>
          </Card>

          <ThemedText weight="semibold" style={[styles.sectionTitle, { marginTop: 16 }]}>
            Expenses by Category
          </ThemedText>
          {EXPENSE_CATEGORIES.map((cat) => {
            const amt = expenseByCategory[cat] ?? 0;
            if (amt === 0) return null;
            return (
              <Card key={cat} style={styles.catCard}>
                <View style={styles.catRow}>
                  <ThemedText variant="secondary" style={styles.catName}>
                    {cat}
                  </ThemedText>
                  <ThemedText variant="red" weight="semibold" style={styles.catAmount}>
                    -{formatCurrency(amt)}
                  </ThemedText>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, marginBottom: 20 },
  tabRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportText: { fontSize: 13 },
  noData: { fontSize: 15, textAlign: "center", marginVertical: 20 },
  jurisCard: { marginBottom: 10 },
  jurisHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  jurisBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jurisCode: { fontSize: 16 },
  taxEst: { fontSize: 13 },
  jurisStats: { flexDirection: "row", gap: 12 },
  jStat: { flex: 1 },
  jStatLabel: { fontSize: 11 },
  jStatValue: { fontSize: 14, marginTop: 2 },
  summaryBlock: { marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  divider: { height: 1, marginVertical: 8 },
  catCard: { marginBottom: 8, padding: 12 },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catName: { fontSize: 15 },
  catAmount: { fontSize: 15 },
});
