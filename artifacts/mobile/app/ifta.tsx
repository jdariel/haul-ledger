import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useIFTA } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_PERIODS = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"];

function getCurrentQuarter() {
  const m = new Date().getMonth();
  return Math.floor(m / 3) + 1;
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals);
}

function fmtMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${abs.toFixed(2)}`;
}

export default function IFTAScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const now = new Date();
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useIFTA(quarter, year);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = makeStyles(C);

  const jurisdictions: any[] = data?.jurisdictions ?? [];
  const totalMiles: number = data?.totalMiles ?? 0;
  const totalGallons: number = data?.totalGallons ?? 0;
  const fleetMpg: number = data?.fleetMpg ?? 0;
  const totalTaxDue: number = data?.totalTaxDue ?? 0;

  const totalGallonsConsumed = jurisdictions.reduce((s: number, j: any) => s + j.gallonsConsumed, 0);
  const totalGallonsPurchased = jurisdictions.reduce((s: number, j: any) => s + j.gallonsPurchased, 0);
  const totalNetGallons = jurisdictions.reduce((s: number, j: any) => s + j.netTaxableGallons, 0);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>IFTA Report</Text>
          <Text style={s.headerSub}>International Fuel Tax Agreement</Text>
        </View>
        <TouchableOpacity style={s.exportBtn}>
          <Ionicons name="share-outline" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={[s.periodCard, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.periodLabel, { color: C.textSecondary }]}>REPORTING PERIOD</Text>

          {/* Year row */}
          <View style={s.yearRow}>
            <TouchableOpacity
              onPress={() => setYear(y => y - 1)}
              style={[s.yearArrow, { borderColor: C.separator }]}
            >
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </TouchableOpacity>
            <Text style={[s.yearText, { color: C.text }]}>{year}</Text>
            <TouchableOpacity
              onPress={() => setYear(y => Math.min(y + 1, now.getFullYear()))}
              style={[s.yearArrow, { borderColor: C.separator }]}
              disabled={year >= now.getFullYear()}
            >
              <Ionicons name="chevron-forward" size={16} color={year >= now.getFullYear() ? C.textMuted : C.text} />
            </TouchableOpacity>
          </View>

          {/* Quarter Tabs */}
          <View style={[s.quarterRow, { backgroundColor: C.background, borderColor: C.separator }]}>
            {QUARTERS.map((q, i) => {
              const active = quarter === i + 1;
              return (
                <TouchableOpacity
                  key={q}
                  style={[s.quarterTab, active && { backgroundColor: C.primary }]}
                  onPress={() => setQuarter(i + 1)}
                >
                  <Text style={[s.quarterTabLabel, { color: active ? "#fff" : C.textSecondary }]}>{q}</Text>
                  <Text style={[s.quarterTabSub, { color: active ? "#fff" : C.textMuted }]}>{QUARTER_PERIODS[i]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={[s.disclaimer, { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }]}>
          <Ionicons name="information-circle-outline" size={14} color="#92400e" />
          <Text style={s.disclaimerText}>
            Tax rates are approximate (2024). Always verify with your IFTA jurisdiction before filing.
          </Text>
        </View>

        {isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[s.loadingText, { color: C.textMuted }]}>Calculating IFTA report…</Text>
          </View>
        ) : (
          <>
            {/* Summary Strip */}
            <View style={s.summaryStrip}>
              <View style={[s.summaryItem, { backgroundColor: C.card, borderColor: C.separator }]}>
                <Ionicons name="navigate" size={18} color={C.primary} />
                <Text style={[s.summaryVal, { color: C.text }]}>{totalMiles.toFixed(0)}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total Miles</Text>
              </View>
              <View style={[s.summaryItem, { backgroundColor: C.card, borderColor: C.separator }]}>
                <Ionicons name="flame" size={18} color="#f59e0b" />
                <Text style={[s.summaryVal, { color: C.text }]}>{totalGallons.toFixed(1)}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Total Gallons</Text>
              </View>
              <View style={[s.summaryItem, { backgroundColor: C.card, borderColor: C.separator }]}>
                <Ionicons name="speedometer" size={18} color="#8b5cf6" />
                <Text style={[s.summaryVal, { color: C.text }]}>{fleetMpg > 0 ? fleetMpg.toFixed(2) : "—"}</Text>
                <Text style={[s.summaryLbl, { color: C.textSecondary }]}>Fleet MPG</Text>
              </View>
              <View style={[s.summaryItem, {
                backgroundColor: totalTaxDue >= 0 ? "#fee2e2" : "#d1fae5",
                borderColor: totalTaxDue >= 0 ? "#ef4444" : "#10b981",
              }]}>
                <Ionicons name="receipt" size={18} color={totalTaxDue >= 0 ? "#ef4444" : "#10b981"} />
                <Text style={[s.summaryVal, { color: totalTaxDue >= 0 ? "#ef4444" : "#10b981" }]}>
                  {fmtMoney(totalTaxDue)}
                </Text>
                <Text style={[s.summaryLbl, { color: totalTaxDue >= 0 ? "#b91c1c" : "#065f46" }]}>
                  {totalTaxDue >= 0 ? "Tax Due" : "Credit"}
                </Text>
              </View>
            </View>

            {/* IFTA Form Header */}
            <View style={[s.formHeader, { backgroundColor: C.primary }]}>
              <Text style={s.formHeaderTitle}>IFTA QUARTERLY FUEL TAX REPORT</Text>
              <Text style={s.formHeaderPeriod}>Period: Q{quarter} {year} ({QUARTER_PERIODS[quarter - 1]} {year})</Text>
            </View>

            {/* Jurisdiction Table */}
            {jurisdictions.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                <Ionicons name="map-outline" size={40} color={C.textMuted} />
                <Text style={[s.emptyTitle, { color: C.textSecondary }]}>No jurisdiction data</Text>
                <Text style={[s.emptySub, { color: C.textMuted }]}>
                  Log trips and fuel entries with state/province codes to generate your IFTA report.
                </Text>
                <TouchableOpacity
                  style={[s.emptyBtn, { borderColor: C.primary }]}
                  onPress={() => router.push("/add-trip")}
                >
                  <Ionicons name="add" size={15} color={C.primary} />
                  <Text style={[s.emptyBtnText, { color: C.primary }]}>Add Trip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {jurisdictions.map((j: any, idx: number) => {
                  const taxDueColor = j.taxDue >= 0 ? C.red : C.green;
                  return (
                    <View key={j.code} style={[s.jurCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                      {/* Jurisdiction header */}
                      <View style={[s.jurHeader, { backgroundColor: j.taxDue >= 0 ? "#fef2f2" : "#f0fdf4" }]}>
                        <View style={s.jurCodeBadge}>
                          <Text style={s.jurCode}>{j.code}</Text>
                        </View>
                        <Text style={[s.jurName, { color: C.text }]}>{j.name}</Text>
                        <View style={s.jurHeaderRight}>
                          <Text style={[s.jurTaxLabel, { color: C.textMuted }]}>
                            {j.taxDue >= 0 ? "Tax Due" : "Credit"}
                          </Text>
                          <Text style={[s.jurTaxAmt, { color: taxDueColor }]}>
                            {fmtMoney(j.taxDue)}
                          </Text>
                        </View>
                      </View>

                      {/* Data grid */}
                      <View style={s.jurGrid}>
                        <View style={s.jurCell}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Total Miles</Text>
                          <Text style={[s.jurCellVal, { color: C.text }]}>{j.totalMiles.toFixed(0)}</Text>
                        </View>
                        <View style={[s.jurCell, s.jurCellBorder, { borderColor: C.separator }]}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Taxable Miles</Text>
                          <Text style={[s.jurCellVal, { color: C.text }]}>{j.taxableMiles.toFixed(0)}</Text>
                        </View>
                        <View style={s.jurCell}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Gallons Consumed</Text>
                          <Text style={[s.jurCellVal, { color: C.text }]}>{j.gallonsConsumed.toFixed(3)}</Text>
                        </View>
                        <View style={[s.jurCell, s.jurCellBorder, { borderColor: C.separator }]}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Gallons Purchased</Text>
                          <Text style={[s.jurCellVal, { color: C.text }]}>{j.gallonsPurchased.toFixed(3)}</Text>
                        </View>
                        <View style={s.jurCell}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Net Taxable Gal.</Text>
                          <Text style={[s.jurCellVal, { color: j.netTaxableGallons >= 0 ? C.red : C.green }]}>
                            {j.netTaxableGallons.toFixed(3)}
                          </Text>
                        </View>
                        <View style={[s.jurCell, s.jurCellBorder, { borderColor: C.separator }]}>
                          <Text style={[s.jurCellLabel, { color: C.textSecondary }]}>Tax Rate / Gal.</Text>
                          <Text style={[s.jurCellVal, { color: C.text }]}>${j.taxRate.toFixed(4)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Totals Row */}
                <View style={[s.totalsCard, { backgroundColor: C.primary + "18", borderColor: C.primary }]}>
                  <Text style={[s.totalsTitle, { color: C.primary }]}>TOTALS</Text>
                  <View style={s.totalsGrid}>
                    <View style={s.totalsCell}>
                      <Text style={[s.totalsCellLabel, { color: C.textSecondary }]}>Total Miles</Text>
                      <Text style={[s.totalsCellVal, { color: C.text }]}>{totalMiles.toFixed(0)}</Text>
                    </View>
                    <View style={[s.totalsCell, { borderLeftWidth: 1, borderLeftColor: C.primary + "40" }]}>
                      <Text style={[s.totalsCellLabel, { color: C.textSecondary }]}>Gal. Consumed</Text>
                      <Text style={[s.totalsCellVal, { color: C.text }]}>{totalGallonsConsumed.toFixed(3)}</Text>
                    </View>
                    <View style={[s.totalsCell, { borderLeftWidth: 1, borderLeftColor: C.primary + "40" }]}>
                      <Text style={[s.totalsCellLabel, { color: C.textSecondary }]}>Gal. Purchased</Text>
                      <Text style={[s.totalsCellVal, { color: C.text }]}>{totalGallonsPurchased.toFixed(3)}</Text>
                    </View>
                    <View style={[s.totalsCell, { borderLeftWidth: 1, borderLeftColor: C.primary + "40" }]}>
                      <Text style={[s.totalsCellLabel, { color: C.textSecondary }]}>Net Taxable</Text>
                      <Text style={[s.totalsCellVal, { color: totalNetGallons >= 0 ? C.red : C.green }]}>
                        {totalNetGallons.toFixed(3)}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.totalsTaxRow, { borderTopColor: C.primary + "30" }]}>
                    <Text style={[s.totalsTaxLabel, { color: C.textSecondary }]}>
                      {totalTaxDue >= 0 ? "TOTAL TAX DUE" : "TOTAL CREDIT"}
                    </Text>
                    <Text style={[s.totalsTaxAmt, { color: totalTaxDue >= 0 ? C.red : C.green }]}>
                      {fmtMoney(totalTaxDue)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Instructions Card */}
            <View style={[s.infoCard, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.infoTitle, { color: C.text }]}>How to Use This Report</Text>
              <View style={s.infoList}>
                {[
                  "Log trips with jurisdiction (state/province code e.g. TX, CA, ON)",
                  "Log fuel entries with the state where fuel was purchased",
                  "Fleet MPG is calculated from your total miles and total gallons",
                  "Net taxable gallons = gallons consumed in state - gallons purchased in state",
                  "Positive net = tax owed; Negative net = credit from that state",
                ].map((tip, i) => (
                  <View key={i} style={s.infoRow}>
                    <View style={[s.infoBullet, { backgroundColor: C.primary }]} />
                    <Text style={[s.infoText, { color: C.textSecondary }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
      backgroundColor: C.card,
    },
    backBtn: { padding: 4 },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: { fontSize: 17, fontWeight: "800", color: C.text },
    headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
    exportBtn: { padding: 4 },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 12, paddingBottom: 40 },

    periodCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    periodLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
    yearArrow: {
      width: 32, height: 32, borderRadius: 8, borderWidth: 1,
      justifyContent: "center", alignItems: "center",
    },
    yearText: { fontSize: 22, fontWeight: "800", minWidth: 60, textAlign: "center" },
    quarterRow: {
      flexDirection: "row",
      borderRadius: 12,
      borderWidth: 1,
      padding: 3,
      gap: 3,
    },
    quarterTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: "center",
      gap: 2,
    },
    quarterTabLabel: { fontSize: 13, fontWeight: "700" },
    quarterTabSub: { fontSize: 9, fontWeight: "500" },

    disclaimer: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
    },
    disclaimerText: { fontSize: 11, color: "#92400e", flex: 1, lineHeight: 16 },

    loadingBox: { alignItems: "center", gap: 12, paddingVertical: 60 },
    loadingText: { fontSize: 14 },

    summaryStrip: { flexDirection: "row", gap: 8 },
    summaryItem: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      alignItems: "center",
      gap: 4,
    },
    summaryVal: { fontSize: 14, fontWeight: "800" },
    summaryLbl: { fontSize: 9, fontWeight: "600", textAlign: "center" },

    formHeader: {
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      gap: 4,
    },
    formHeaderTitle: { fontSize: 13, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
    formHeaderPeriod: { fontSize: 11, color: "rgba(255,255,255,0.85)" },

    emptyCard: {
      borderRadius: 16, borderWidth: 1,
      padding: 32, alignItems: "center", gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: "600" },
    emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
    emptyBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      marginTop: 8, borderWidth: 1.5, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    emptyBtnText: { fontSize: 14, fontWeight: "700" },

    jurCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
    jurHeader: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    },
    jurCodeBadge: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: "#3b82f6",
      justifyContent: "center", alignItems: "center",
    },
    jurCode: { fontSize: 13, fontWeight: "800", color: "#fff" },
    jurName: { flex: 1, fontSize: 14, fontWeight: "600" },
    jurHeaderRight: { alignItems: "flex-end" },
    jurTaxLabel: { fontSize: 10, fontWeight: "600" },
    jurTaxAmt: { fontSize: 15, fontWeight: "800" },
    jurGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 12,
      gap: 0,
    },
    jurCell: { width: "50%", paddingVertical: 8, paddingHorizontal: 4 },
    jurCellBorder: { borderLeftWidth: 1 },
    jurCellLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
    jurCellVal: { fontSize: 15, fontWeight: "700", marginTop: 2 },

    totalsCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      overflow: "hidden",
    },
    totalsTitle: {
      fontSize: 12, fontWeight: "800", letterSpacing: 0.8,
      textAlign: "center", paddingTop: 12,
    },
    totalsGrid: { flexDirection: "row", padding: 12, paddingTop: 8 },
    totalsCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
    totalsCellLabel: { fontSize: 9, fontWeight: "600", textAlign: "center" },
    totalsCellVal: { fontSize: 13, fontWeight: "700", marginTop: 2 },
    totalsTaxRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    },
    totalsTaxLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
    totalsTaxAmt: { fontSize: 22, fontWeight: "800" },

    infoCard: {
      borderRadius: 14, borderWidth: 1,
      padding: 16, gap: 12,
    },
    infoTitle: { fontSize: 14, fontWeight: "700" },
    infoList: { gap: 8 },
    infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    infoBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
    infoText: { fontSize: 13, lineHeight: 18, flex: 1 },
  });
}
