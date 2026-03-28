import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useCostAnalysis } from "@/hooks/useApi";

function fmtUSD(n: number, decimals = 2) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtNum(n: number, decimals = 0) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

type ResultRowProps = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bold?: boolean;
  C: typeof Colors.light;
};

function ResultRow({ label, value, sub, color, bold, C }: ResultRowProps) {
  return (
    <View style={rr.row}>
      <View style={{ flex: 1 }}>
        <Text style={[rr.label, { color: C.textSecondary }, bold && { color: C.text, fontWeight: "700" }]}>
          {label}
        </Text>
        {sub ? <Text style={[rr.sub, { color: C.textMuted }]}>{sub}</Text> : null}
      </View>
      <Text style={[rr.value, { color: color ?? C.text }, bold && { fontSize: 17, fontWeight: "800" }]}>
        {value}
      </Text>
    </View>
  );
}

const rr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  label: { fontSize: 14 },
  sub: { fontSize: 11, marginTop: 1 },
  value: { fontSize: 15, fontWeight: "600", textAlign: "right" },
});

export default function LoadEvaluatorScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);

  const { data: analysis, isLoading } = useCostAnalysis();

  const [loadRate, setLoadRate] = useState("");
  const [loadMiles, setLoadMiles] = useState("");
  const [emptyMiles, setEmptyMiles] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [mpgInput, setMpgInput] = useState("6"); // default 6 MPG for diesel trucks
  const [monthlyMiles, setMonthlyMiles] = useState("");

  // Pre-fill from historical data when it loads; never overwrite a user edit
  useEffect(() => {
    if (analysis?.avgFuelCostPerGallon > 0 && !fuelPrice) {
      setFuelPrice(analysis.avgFuelCostPerGallon.toFixed(3));
    }
    if (analysis?.truckMpg > 0) {
      // Always sync MPG from fuel log history (more accurate than the default)
      setMpgInput(analysis.truckMpg.toFixed(2));
    }
    if (analysis?.milesPerMonth > 0 && !monthlyMiles) {
      setMonthlyMiles(String(Math.round(analysis.milesPerMonth)));
    }
  }, [analysis]);

  const calc = useMemo(() => {
    const rate = parseFloat(loadRate) || 0;
    const loaded = parseFloat(loadMiles) || 0;
    const empty = parseFloat(emptyMiles) || 0;
    const miles = loaded + empty;
    const fuelPerGal = parseFloat(fuelPrice) || 0;
    const mpg = parseFloat(mpgInput) || 6;
    const fixedMonthly = analysis?.fixedMonthlyCost ?? 0;
    const perMileFixed = analysis?.perMileFixed ?? 0;
    // Use user-entered monthly miles; fall back to 10,000 if none set
    const milesPerMonth = parseFloat(monthlyMiles) || 10000;

    if (rate <= 0 || miles <= 0 || fuelPerGal <= 0) return null;

    const fuelGallons = miles / mpg;
    const fuelCost = fuelGallons * fuelPerGal;

    const fixedAllocation = fixedMonthly > 0
      ? (fixedMonthly / milesPerMonth) * miles
      : 0;

    const perMileCosts = perMileFixed * miles;

    const totalCost = fuelCost + fixedAllocation + perMileCosts;
    const netProfit = rate - totalCost;
    const grossPerMile = miles > 0 ? rate / miles : 0;
    const netPerMile = miles > 0 ? netProfit / miles : 0;
    const marginPct = rate > 0 ? (netProfit / rate) * 100 : 0;

    return {
      rate, miles, loaded, empty,
      fuelGallons, fuelCost,
      fixedAllocation, perMileCosts,
      totalCost, netProfit,
      grossPerMile, netPerMile, marginPct,
      hasMpg: mpg > 0,
      hasFixed: fixedMonthly > 0,
    };
  }, [loadRate, loadMiles, emptyMiles, fuelPrice, mpgInput, monthlyMiles, analysis]);

  const netColor = calc
    ? calc.netProfit > 0
      ? "#22c55e"
      : "#ef4444"
    : C.text;

  const marginColor = calc
    ? calc.marginPct >= 20
      ? "#22c55e"
      : calc.marginPct >= 10
      ? "#f97316"
      : "#ef4444"
    : C.text;

  // Only flag if cost setup is missing — MPG now defaults to 6 so it's always available
  const hasMissingData = analysis && !analysis.fixedMonthlyCost;

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>Load Evaluator</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Missing data warning */}
          {hasMissingData && (
            <TouchableOpacity
              style={[s.warningBanner, { backgroundColor: "#f97316" + "18", borderColor: "#f97316" + "40" }]}
              onPress={() => router.push("/cost-setup")}
            >
              <Ionicons name="warning-outline" size={18} color="#f97316" />
              <Text style={[s.warningText, { color: "#f97316" }]}>
                Add your fixed costs (insurance, truck payment, etc.) in Cost Setup so they're included in every load calculation.{"  "}
                <Text style={{ fontWeight: "800" }}>Tap to set up →</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Inputs ── */}
          <Text style={[s.sectionTitle, { color: C.text }]}>Load Details</Text>

          <View style={[s.inputCard, { backgroundColor: C.card, borderColor: C.separator }]}>
            {/* Gross rate */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#22c55e20" }]}>
                <Ionicons name="cash-outline" size={18} color="#22c55e" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Gross Rate</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>Total pay for this load</Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <Text style={[s.inputPrefix, { color: C.textMuted }]}>$</Text>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="0.00"
                  placeholderTextColor={C.textMuted}
                  value={loadRate}
                  onChangeText={setLoadRate}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {/* Loaded miles */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#3b82f620" }]}>
                <Ionicons name="navigate-outline" size={18} color="#3b82f6" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Loaded Miles</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>Miles with freight</Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  value={loadMiles}
                  onChangeText={setLoadMiles}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {/* Empty miles */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#6b728020" }]}>
                <Ionicons name="map-outline" size={18} color="#6b7280" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Deadhead Miles</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>Empty miles to pickup</Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  value={emptyMiles}
                  onChangeText={setEmptyMiles}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {/* Truck MPG */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#06b6d420" }]}>
                <Ionicons name="speedometer-outline" size={18} color="#06b6d4" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Truck MPG</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>
                  {analysis?.truckMpg > 0
                    ? `Calculated from your fuel logs`
                    : "Default 6 MPG — add fuel logs to auto-calculate"}
                </Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="6"
                  placeholderTextColor={C.textMuted}
                  value={mpgInput}
                  onChangeText={setMpgInput}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {/* Fuel price */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#f9731620" }]}>
                <Ionicons name="flame-outline" size={18} color="#f97316" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Fuel Price</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>
                  {analysis?.avgFuelCostPerGallon > 0
                    ? `Avg from fuel log: $${analysis.avgFuelCostPerGallon.toFixed(3)}/gal`
                    : "Current $/gallon"}
                </Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <Text style={[s.inputPrefix, { color: C.textMuted }]}>$</Text>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="0.000"
                  placeholderTextColor={C.textMuted}
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.separator }]} />

            {/* Monthly miles — used to prorate fixed costs from Cost Setup */}
            <View style={s.inputRow}>
              <View style={[s.inputIconBox, { backgroundColor: "#8b5cf620" }]}>
                <Ionicons name="trending-up-outline" size={18} color="#8b5cf6" />
              </View>
              <View style={s.inputLabelCol}>
                <Text style={[s.inputLabel, { color: C.textSecondary }]}>Monthly Miles</Text>
                <Text style={[s.inputHint, { color: C.textMuted }]}>
                  {analysis?.milesPerMonth > 0
                    ? `From trip history: ~${Math.round(analysis.milesPerMonth).toLocaleString()} mi/mo`
                    : "Used to spread fixed costs per load"}
                </Text>
              </View>
              <View style={[s.inputBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="10,000"
                  placeholderTextColor={C.textMuted}
                  value={monthlyMiles}
                  onChangeText={setMonthlyMiles}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ── Results ── */}
          {!calc ? (
            <View style={[s.emptyResult, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Ionicons name="calculator-outline" size={32} color={C.textMuted} />
              <Text style={[s.emptyResultText, { color: C.textSecondary }]}>
                Fill in the load rate, miles, and fuel price to see your numbers.
              </Text>
            </View>
          ) : (
            <>
              {/* Net profit hero card */}
              <View style={[s.heroCard, { backgroundColor: netColor + "15", borderColor: netColor + "40" }]}>
                <Text style={[s.heroLabel, { color: netColor + "CC" }]}>
                  {calc.netProfit >= 0 ? "Clean Profit This Load" : "Operating at a Loss"}
                </Text>
                <Text style={[s.heroValue, { color: netColor }]}>
                  {fmtUSD(calc.netProfit)}
                </Text>
                <View style={s.heroRow}>
                  <View style={s.heroStat}>
                    <Text style={[s.heroStatValue, { color: netColor }]}>{fmtUSD(calc.netPerMile, 3)}</Text>
                    <Text style={[s.heroStatLabel, { color: netColor + "99" }]}>net/mile</Text>
                  </View>
                  <View style={[s.heroStatDivider, { backgroundColor: netColor + "30" }]} />
                  <View style={s.heroStat}>
                    <Text style={[s.heroStatValue, { color: marginColor }]}>
                      {calc.marginPct.toFixed(1)}%
                    </Text>
                    <Text style={[s.heroStatLabel, { color: netColor + "99" }]}>margin</Text>
                  </View>
                  <View style={[s.heroStatDivider, { backgroundColor: netColor + "30" }]} />
                  <View style={s.heroStat}>
                    <Text style={[s.heroStatValue, { color: netColor }]}>{fmtUSD(calc.grossPerMile, 3)}</Text>
                    <Text style={[s.heroStatLabel, { color: netColor + "99" }]}>gross/mile</Text>
                  </View>
                </View>
              </View>

              {/* Cost breakdown */}
              <Text style={[s.sectionTitle, { color: C.text }]}>Cost Breakdown</Text>
              <View style={[s.breakdownCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                <ResultRow
                  label="Gross Rate"
                  value={fmtUSD(calc.rate)}
                  C={C}
                />
                <View style={[s.bdDivider, { backgroundColor: C.separator }]} />

                <ResultRow
                  label="Fuel Cost"
                  value={`-${fmtUSD(calc.fuelCost)}`}
                  sub={`${fmtNum(calc.miles)} mi ÷ ${parseFloat(mpgInput) || 6} MPG = ${fmtNum(calc.fuelGallons, 1)} gal × $${fuelPrice}/gal`}
                  color="#ef4444"
                  C={C}
                />

                {calc.fixedAllocation > 0 && (
                  <ResultRow
                    label="Fixed Costs (pro-rated)"
                    value={`-${fmtUSD(calc.fixedAllocation)}`}
                    sub={`$${fmtNum(analysis?.fixedMonthlyCost ?? 0, 0)}/mo ÷ ${(parseFloat(monthlyMiles) || 10000).toLocaleString()} mi/mo × ${fmtNum(calc.miles)} mi`}
                    color="#ef4444"
                    C={C}
                  />
                )}

                {calc.perMileCosts > 0 && (
                  <ResultRow
                    label="Per-Mile Costs"
                    value={`-${fmtUSD(calc.perMileCosts)}`}
                    sub={`${fmtNum(calc.miles)} mi × $${analysis?.perMileFixed?.toFixed(4)}/mi`}
                    color="#ef4444"
                    C={C}
                  />
                )}

                <View style={[s.bdDivider, { backgroundColor: C.separator }]} />

                <ResultRow
                  label="Total Costs"
                  value={`-${fmtUSD(calc.totalCost)}`}
                  color="#ef4444"
                  bold
                  C={C}
                />

                <View style={[s.bdDivider, { backgroundColor: C.separator }]} />

                <ResultRow
                  label="Net Profit"
                  value={fmtUSD(calc.netProfit)}
                  color={netColor}
                  bold
                  C={C}
                />
              </View>

              {/* Trip summary */}
              <Text style={[s.sectionTitle, { color: C.text }]}>Trip Summary</Text>
              <View style={[s.breakdownCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                <ResultRow label="Loaded Miles" value={fmtNum(calc.loaded)} C={C} />
                {calc.empty > 0 && (
                  <ResultRow label="Deadhead Miles" value={fmtNum(calc.empty)} C={C} />
                )}
                <ResultRow label="Total Miles" value={fmtNum(calc.miles)} C={C} />
                <View style={[s.bdDivider, { backgroundColor: C.separator }]} />
                <ResultRow label="Gross Rate / Mile" value={fmtUSD(calc.grossPerMile, 3)} C={C} />
                <ResultRow label="Net / Mile" value={fmtUSD(calc.netPerMile, 3)} color={netColor} C={C} />
                <ResultRow
                  label="Margin"
                  value={`${calc.marginPct.toFixed(1)}%`}
                  sub={
                    calc.marginPct >= 20
                      ? "Good load"
                      : calc.marginPct >= 10
                      ? "Acceptable — negotiate if you can"
                      : calc.marginPct >= 0
                      ? "Thin margin — consider passing"
                      : "This load loses money"
                  }
                  color={marginColor}
                  C={C}
                />
              </View>

              {/* Guidance pill */}
              {calc.marginPct < 0 && (
                <View style={[s.guidanceBanner, { backgroundColor: "#ef444420", borderColor: "#ef444440" }]}>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={[s.guidanceText, { color: "#ef4444" }]}>
                    This load costs more than it pays. You'd need at least{" "}
                    <Text style={{ fontWeight: "800" }}>{fmtUSD(calc.totalCost)}</Text> to break even.
                  </Text>
                </View>
              )}
              {calc.marginPct >= 0 && calc.marginPct < 10 && (
                <View style={[s.guidanceBanner, { backgroundColor: "#f9731620", borderColor: "#f9731640" }]}>
                  <Ionicons name="warning-outline" size={18} color="#f97316" />
                  <Text style={[s.guidanceText, { color: "#f97316" }]}>
                    Thin margin. Try to negotiate to at least{" "}
                    <Text style={{ fontWeight: "800" }}>{fmtUSD(calc.totalCost / 0.9)}</Text> for a 10% margin.
                  </Text>
                </View>
              )}
              {calc.marginPct >= 20 && (
                <View style={[s.guidanceBanner, { backgroundColor: "#22c55e20", borderColor: "#22c55e40" }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                  <Text style={[s.guidanceText, { color: "#22c55e" }]}>
                    Solid load. You're keeping {calc.marginPct.toFixed(1)}% after all costs.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingBottom: 4,
    },
    back: { width: 36, height: 36, justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700" },
    loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },
    warningBanner: {
      flexDirection: "row", alignItems: "flex-start", gap: 10,
      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
    },
    warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
    sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: -4 },
    inputCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    inputIconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
    inputLabelCol: { flex: 1 },
    inputLabel: { fontSize: 14, fontWeight: "600" },
    inputHint: { fontSize: 11, marginTop: 1 },
    inputBox: {
      flexDirection: "row", alignItems: "center",
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 8, minWidth: 100,
    },
    inputPrefix: { fontSize: 15, marginRight: 2 },
    input: { fontSize: 16, fontWeight: "600", minWidth: 80, textAlign: "right" },
    divider: { height: 1, marginHorizontal: 16 },
    emptyResult: {
      borderRadius: 18, borderWidth: 1, padding: 32,
      alignItems: "center", gap: 12,
    },
    emptyResultText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    heroCard: {
      borderRadius: 20, borderWidth: 1,
      paddingVertical: 24, paddingHorizontal: 20,
      alignItems: "center", gap: 8,
    },
    heroLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    heroValue: { fontSize: 42, fontWeight: "900", letterSpacing: -1 },
    heroRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    heroStat: { flex: 1, alignItems: "center", gap: 2 },
    heroStatValue: { fontSize: 16, fontWeight: "800" },
    heroStatLabel: { fontSize: 11, fontWeight: "600" },
    heroStatDivider: { width: 1, height: 28, marginHorizontal: 8 },
    breakdownCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4 },
    bdDivider: { height: 1 },
    guidanceBanner: {
      flexDirection: "row", alignItems: "flex-start", gap: 10,
      paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1,
    },
    guidanceText: { flex: 1, fontSize: 13, lineHeight: 18 },
  });
}
