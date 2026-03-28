import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, RefreshControl, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useCostSettings, useCostAnalysis,
  useCreateCostSetting, useUpdateCostSetting, useDeleteCostSetting,
  useLogCostToExpense, useLogAllCostsToExpenses,
} from "@/hooks/useApi";

type Frequency = "monthly" | "weekly" | "annual" | "per_mile";

const FREQ_LABELS: Record<Frequency, string> = {
  monthly: "/mo",
  weekly: "/wk",
  annual: "/yr",
  per_mile: "/mi",
};

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "annual", label: "Annual" },
  { value: "per_mile", label: "Per Mile" },
];

const PRESET_COSTS = [
  "Insurance",
  "Truck Payment",
  "Driver Pay",
  "Phone / Comms",
  "Permits & Licenses",
  "ELD / Software",
  "Factoring Fee",
  "Maintenance",
  "Tires",
  "Parking",
];

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function MetricCard({ icon, label, value, sub, color, C }: any) {
  return (
    <View style={[mc.card, { backgroundColor: C.card, borderColor: C.separator }]}>
      <View style={[mc.iconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[mc.value, { color: C.text }]}>{value}</Text>
      <Text style={[mc.label, { color: C.textSecondary }]}>{label}</Text>
      {sub ? <Text style={[mc.sub, { color: C.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

const mc = StyleSheet.create({
  card: { flex: 1, minWidth: "46%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  value: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "600" },
  sub: { fontSize: 11, marginTop: 1 },
});

export default function CostSetupScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);

  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [showPresets, setShowPresets] = useState(false);
  const [monthlyMiles, setMonthlyMiles] = useState("");

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useCostSettings();
  const { data: analysis, isLoading: analysisLoading, refetch: refetchAnalysis } = useCostAnalysis();

  useEffect(() => {
    if (analysis?.milesPerMonth > 0 && !monthlyMiles) {
      setMonthlyMiles(String(Math.round(analysis.milesPerMonth)));
    }
  }, [analysis]);

  const createCost = useCreateCostSetting();
  const updateCost = useUpdateCostSetting();
  const deleteCost = useDeleteCostSetting();
  const logOne = useLogCostToExpense();
  const logAll = useLogAllCostsToExpenses();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchItems(), refetchAnalysis()]);
    setRefreshing(false);
  };

  const openAdd = (preset?: string) => {
    setEditItem(null);
    setLabel(preset ?? "");
    setAmount("");
    setFrequency("monthly");
    setShowPresets(false);
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setLabel(item.label);
    setAmount(String(item.amount));
    setFrequency(item.frequency as Frequency);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setLabel("");
    setAmount("");
    setFrequency("monthly");
  };

  const handleSave = async () => {
    if (!label.trim()) return Alert.alert("Validation", "Enter a label.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert("Validation", "Enter a valid amount.");
    try {
      if (editItem) {
        await updateCost.mutateAsync({ id: editItem.id, data: { label: label.trim(), amount: amt, frequency } });
        closeForm();
      } else {
        const res = await createCost.mutateAsync({ label: label.trim(), amount: amt, frequency });
        closeForm();
        if ((res as any).expenseLogged && frequency !== "per_mile") {
          Alert.alert(
            "Added to Expenses",
            `"${label.trim()}" was also logged in your expenses for today. You won't need to enter it again.`,
            [{ text: "Got it" }],
          );
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save.");
    }
  };

  const handleLogOne = async (item: any) => {
    try {
      await logOne.mutateAsync({ id: item.id });
      Alert.alert("Logged", `"${item.label}" added to today's expenses.`, [{ text: "OK" }]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not log expense.");
    }
  };

  const handleLogAll = async () => {
    if (!items || items.length === 0) return;
    const loggable = items.filter((i: any) => i.frequency !== "per_mile");
    if (loggable.length === 0) return Alert.alert("Nothing to log", "Per-mile costs can't be directly logged.");
    Alert.alert(
      "Log All Fixed Costs",
      `Add all ${loggable.length} fixed costs to today's expenses?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log All",
          onPress: async () => {
            try {
              const res: any = await logAll.mutateAsync(undefined);
              Alert.alert("Done", `${res.logged} expense${res.logged !== 1 ? "s" : ""} added for today.`, [{ text: "OK" }]);
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Could not log expenses.");
            }
          },
        },
      ],
    );
  };

  const handleDelete = (id: number, lbl: string) => {
    setDeleteTarget({ id, label: lbl });
  };

  const isLoading = itemsLoading || analysisLoading;
  const a = analysis;

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>Cost Setup</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          {/* ── Your Numbers ── */}
          <Text style={[s.sectionTitle, { color: C.text }]}>Your Numbers</Text>
          <Text style={[s.sectionSub, { color: C.textSecondary }]}>
            Calculated from your fuel log, trips, expenses, and income.
          </Text>

          {a && (
            <>
              <View style={s.metricsGrid}>
                <MetricCard
                  icon="flame-outline"
                  label="Avg Fuel Cost"
                  value={a.avgFuelCostPerGallon > 0 ? fmt(a.avgFuelCostPerGallon, 3) : "—"}
                  sub={a.totalGallons > 0 ? `${a.totalGallons.toLocaleString()} gal total` : "No fuel data"}
                  color="#f97316"
                  C={C}
                />
                <MetricCard
                  icon="speedometer-outline"
                  label="Truck MPG"
                  value={a.truckMpg > 0 ? `${a.truckMpg} mpg` : "—"}
                  sub={a.totalMiles > 0 ? `${a.totalMiles.toLocaleString()} mi logged` : "No trip data"}
                  color="#22c55e"
                  C={C}
                />
              </View>

              <View style={s.metricsGrid}>
                <MetricCard
                  icon="trending-down-outline"
                  label="Cost per Mile"
                  value={a.costPerMile > 0 ? fmt(a.costPerMile, 3) : "—"}
                  sub="Expenses + fixed costs"
                  color="#ef4444"
                  C={C}
                />
                <MetricCard
                  icon="trending-up-outline"
                  label="Revenue per Mile"
                  value={a.revenuePerMile > 0 ? fmt(a.revenuePerMile, 3) : "—"}
                  sub="From income log"
                  color="#22c55e"
                  C={C}
                />
              </View>

              <View style={s.metricsGrid}>
                <MetricCard
                  icon="cash-outline"
                  label="Net per Mile"
                  value={a.netPerMile !== 0 ? fmt(a.netPerMile, 3) : "—"}
                  sub={a.netPerMile > 0 ? "Profitable" : a.netPerMile < 0 ? "Operating at a loss" : ""}
                  color={a.netPerMile >= 0 ? "#22c55e" : "#ef4444"}
                  C={C}
                />
                <MetricCard
                  icon="map-outline"
                  label="Break-even Miles"
                  value={a.breakEvenMilesPerMonth > 0 ? a.breakEvenMilesPerMonth.toLocaleString() : "—"}
                  sub="Miles/month to cover fixed costs"
                  color="#8b5cf6"
                  C={C}
                />
              </View>

              {/* Fixed monthly summary */}
              {a.fixedMonthlyCost > 0 && (
                <View style={[s.summaryCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Total Fixed Costs</Text>
                    <Text style={[s.summaryValue, { color: C.text }]}>{fmt(a.fixedMonthlyCost)}/mo</Text>
                  </View>
                  <View style={[s.summaryDivider, { backgroundColor: C.separator }]} />
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Total Expenses (all time)</Text>
                    <Text style={[s.summaryValue, { color: "#ef4444" }]}>{fmt(a.totalExpenses)}</Text>
                  </View>
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Total Income (all time)</Text>
                    <Text style={[s.summaryValue, { color: "#22c55e" }]}>{fmt(a.totalIncome)}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {!a && (
            <View style={[s.emptyBox, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Ionicons name="bar-chart-outline" size={28} color={C.textMuted} />
              <Text style={[s.emptyText, { color: C.textSecondary }]}>
                Add fuel entries, trips, expenses, and income to see your numbers here.
              </Text>
            </View>
          )}

          {/* ── Fixed Costs ── */}
          <View style={s.costHeader}>
            <Text style={[s.sectionTitle, { color: C.text, marginBottom: 0 }]}>Fixed Costs</Text>
            <View style={s.costHeaderBtns}>
              <TouchableOpacity
                style={[s.presetBtn, { backgroundColor: C.card, borderColor: C.separator }]}
                onPress={() => setShowPresets(true)}
              >
                <Ionicons name="list-outline" size={16} color={C.primary} />
                <Text style={[s.presetBtnText, { color: C.primary }]}>Presets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: C.primary }]}
                onPress={() => openAdd()}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[s.sectionSub, { color: C.textSecondary, marginTop: 0 }]}>
            Added costs are automatically logged to your expenses. Use "Log All" to re-log each month.
          </Text>

          {/* Log All banner */}
          {items && items.filter((i: any) => i.frequency !== "per_mile").length > 0 && (
            <TouchableOpacity
              style={[s.logAllBanner, { backgroundColor: "#22c55e18", borderColor: "#22c55e40" }]}
              onPress={handleLogAll}
              disabled={logAll.isPending}
            >
              {logAll.isPending
                ? <ActivityIndicator color="#22c55e" size="small" />
                : <Ionicons name="arrow-down-circle-outline" size={20} color="#22c55e" />}
              <Text style={[s.logAllText, { color: "#22c55e" }]}>Log All Fixed Costs to Expenses</Text>
            </TouchableOpacity>
          )}

          {!items || items.length === 0 ? (
            <View style={[s.emptyBox, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Ionicons name="receipt-outline" size={28} color={C.textMuted} />
              <Text style={[s.emptyText, { color: C.textSecondary }]}>
                No fixed costs yet. Add your insurance, truck payment, driver pay, etc.
              </Text>
            </View>
          ) : (
            <View style={[s.costList, { backgroundColor: C.card, borderColor: C.separator }]}>
              {items.map((item: any, i: number) => (
                <View
                  key={item.id}
                  style={[
                    s.costRow,
                    i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator },
                  ]}
                >
                  <View style={s.costInfo}>
                    <Text style={[s.costLabel, { color: C.text }]}>{item.label}</Text>
                    <View style={[s.freqBadge, { backgroundColor: C.primary + "18" }]}>
                      <Text style={[s.freqText, { color: C.primary }]}>
                        {FREQ_LABELS[item.frequency as Frequency] ?? "/mo"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.costAmount, { color: C.text }]}>
                    {fmt(item.amount)}
                  </Text>
                  {item.frequency !== "per_mile" && (
                    <TouchableOpacity onPress={() => handleLogOne(item)} style={s.iconBtn} disabled={logOne.isPending}>
                      <Ionicons name="arrow-down-circle-outline" size={18} color="#22c55e" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                    <Ionicons name="pencil-outline" size={17} color={C.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.label)} style={s.iconBtn}>
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── Cost Per Mile Breakdown ── */}
          {items && items.length > 0 && (() => {
            const freqToMonthly: Record<string, number> = {
              monthly: 1, weekly: 52 / 12, annual: 1 / 12, per_mile: 0,
            };
            let fixedMonthly = 0;
            let perMileTotal = 0;
            for (const item of items) {
              if (item.frequency === "per_mile") {
                perMileTotal += item.amount;
              } else {
                fixedMonthly += item.amount * (freqToMonthly[item.frequency] ?? 1);
              }
            }
            const miles = parseFloat(monthlyMiles) || 0;
            const fixedPerMile = miles > 0 ? fixedMonthly / miles : null;
            const totalFixedPerMile = fixedPerMile !== null ? fixedPerMile + perMileTotal : null;
            const fullCostPerMile = analysis?.costPerMile > 0 ? analysis.costPerMile : null;

            return (
              <View>
                <Text style={[s.sectionTitle, { color: C.text }]}>What You Spend Per Mile</Text>
                <View style={[s.cpmCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  {/* Monthly miles input row */}
                  <View style={s.cpmMilesRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cpmMilesLabel, { color: C.textSecondary }]}>Monthly Miles</Text>
                      <Text style={[s.cpmMilesHint, { color: C.textMuted }]}>
                        {analysis?.milesPerMonth > 0 ? "From your trip log" : "Enter your typical monthly miles"}
                      </Text>
                    </View>
                    <View style={[s.cpmMilesBox, { borderColor: C.separator, backgroundColor: C.background }]}>
                      <TextInput
                        style={[s.cpmMilesInput, { color: C.text }]}
                        placeholder="e.g. 10000"
                        placeholderTextColor={C.textMuted}
                        value={monthlyMiles}
                        onChangeText={setMonthlyMiles}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={[s.cpmDivider, { backgroundColor: C.separator }]} />

                  {/* Fixed cost per mile */}
                  <View style={s.cpmRow}>
                    <Text style={[s.cpmLabel, { color: C.textSecondary }]}>Fixed Costs / Mile</Text>
                    <Text style={[s.cpmValue, { color: fixedPerMile !== null ? "#ef4444" : C.textMuted }]}>
                      {fixedPerMile !== null ? fmt(fixedPerMile, 4) : miles === 0 ? "Enter miles →" : "—"}
                    </Text>
                  </View>
                  <Text style={[s.cpmSub, { color: C.textMuted }]}>
                    {fmt(fixedMonthly)}/mo ÷ {miles > 0 ? miles.toLocaleString() : "?"} mi
                  </Text>

                  {perMileTotal > 0 && (
                    <>
                      <View style={s.cpmRow}>
                        <Text style={[s.cpmLabel, { color: C.textSecondary }]}>Per-Mile Costs</Text>
                        <Text style={[s.cpmValue, { color: "#ef4444" }]}>{fmt(perMileTotal, 4)}</Text>
                      </View>
                      <Text style={[s.cpmSub, { color: C.textMuted }]}>Driver pay or other per-mile rates</Text>
                    </>
                  )}

                  {totalFixedPerMile !== null && (
                    <>
                      <View style={[s.cpmDivider, { backgroundColor: C.separator }]} />
                      <View style={[s.cpmTotalRow, { backgroundColor: "#ef444412", borderRadius: 12, padding: 12 }]}>
                        <View>
                          <Text style={[s.cpmTotalLabel, { color: C.text }]}>Fixed Cost per Mile</Text>
                          <Text style={[s.cpmTotalSub, { color: C.textMuted }]}>From your cost setup only</Text>
                        </View>
                        <Text style={[s.cpmTotalValue, { color: "#ef4444" }]}>{fmt(totalFixedPerMile, 4)}/mi</Text>
                      </View>
                    </>
                  )}

                  {fullCostPerMile !== null && (
                    <>
                      <View style={[s.cpmDivider, { backgroundColor: C.separator }]} />
                      <View style={[s.cpmTotalRow, { backgroundColor: C.primary + "12", borderRadius: 12, padding: 12 }]}>
                        <View>
                          <Text style={[s.cpmTotalLabel, { color: C.text }]}>All-In Cost per Mile</Text>
                          <Text style={[s.cpmTotalSub, { color: C.textMuted }]}>Fixed + fuel + all logged expenses</Text>
                        </View>
                        <Text style={[s.cpmTotalValue, { color: C.primary }]}>{fmt(fullCostPerMile, 4)}/mi</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
        <View style={[s.modal, { backgroundColor: C.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: C.separator }]}>
            <TouchableOpacity onPress={closeForm} hitSlop={12}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: C.text }]}>{editItem ? "Edit Cost" : "Add Fixed Cost"}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {/* Label */}
            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Label</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.card, borderColor: C.separator, color: C.text }]}
              placeholder="e.g. Insurance, Truck Payment"
              placeholderTextColor={C.textMuted}
              value={label}
              onChangeText={setLabel}
              autoFocus={!editItem}
            />

            {/* Amount */}
            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Amount ($)</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.card, borderColor: C.separator, color: C.text }]}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Frequency */}
            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Frequency</Text>
            <View style={s.freqGrid}>
              {FREQ_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.freqOption,
                    { borderColor: C.separator },
                    frequency === opt.value && { backgroundColor: C.primary, borderColor: C.primary },
                  ]}
                  onPress={() => setFrequency(opt.value)}
                >
                  <Text style={[s.freqOptionText, { color: frequency === opt.value ? "#fff" : C.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: C.primary }]}
              onPress={handleSave}
              disabled={createCost.isPending || updateCost.isPending}
            >
              {createCost.isPending || updateCost.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnText}>{editItem ? "Save Changes" : "Add Cost"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Presets Modal ── */}
      <Modal visible={showPresets} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPresets(false)}>
        <View style={[s.modal, { backgroundColor: C.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: C.separator }]}>
            <TouchableOpacity onPress={() => setShowPresets(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: C.text }]}>Common Costs</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={[s.presetHint, { color: C.textSecondary }]}>
              Tap a category to quickly add it as a fixed cost.
            </Text>
            <View style={[s.presetList, { backgroundColor: C.card, borderColor: C.separator }]}>
              {PRESET_COSTS.map((p, i) => (
                <TouchableOpacity
                  key={p}
                  style={[s.presetRow, i < PRESET_COSTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator }]}
                  onPress={() => openAdd(p)}
                >
                  <Text style={[s.presetRowText, { color: C.text }]}>{p}</Text>
                  <Ionicons name="add-circle-outline" size={20} color={C.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Delete Cost"
        message={deleteTarget ? `Remove "${deleteTarget.label}"?` : ""}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          setDeleteTarget(null);
          try { await deleteCost.mutateAsync(id); } catch (e: any) { Alert.alert("Error", (e as any).message); }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 4 },
    back: { width: 36, height: 36, justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700" },
    loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700" },
    sectionSub: { fontSize: 13, lineHeight: 18, marginTop: -4 },
    metricsGrid: { flexDirection: "row", gap: 10 },
    summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    summaryLabel: { fontSize: 13 },
    summaryValue: { fontSize: 14, fontWeight: "700" },
    summaryDivider: { height: 1 },
    emptyBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
    costHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    costHeaderBtns: { flexDirection: "row", gap: 8 },
    presetBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    presetBtnText: { fontSize: 13, fontWeight: "600" },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    costList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    costRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
    costInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    costLabel: { fontSize: 15, fontWeight: "600" },
    freqBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    freqText: { fontSize: 11, fontWeight: "700" },
    costAmount: { fontSize: 15, fontWeight: "700", marginRight: 4 },
    iconBtn: { padding: 4 },
    modal: { flex: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 17, fontWeight: "700" },
    modalBody: { padding: 20, gap: 8 },
    fieldLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginTop: 4 },
    freqGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    freqOption: { flex: 1, minWidth: "40%", alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    freqOptionText: { fontSize: 14, fontWeight: "600" },
    saveBtn: { marginTop: 16, paddingVertical: 15, borderRadius: 14, alignItems: "center" },
    saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    logAllBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
    logAllText: { fontSize: 14, fontWeight: "700", flex: 1 },
    cpmCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", padding: 16, gap: 6 },
    cpmMilesRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
    cpmMilesLabel: { fontSize: 14, fontWeight: "600" },
    cpmMilesHint: { fontSize: 11, marginTop: 1 },
    cpmMilesBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 110 },
    cpmMilesInput: { fontSize: 16, fontWeight: "700", textAlign: "right" },
    cpmDivider: { height: 1, marginVertical: 6 },
    cpmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    cpmLabel: { fontSize: 13 },
    cpmValue: { fontSize: 15, fontWeight: "700" },
    cpmSub: { fontSize: 11, marginTop: -2 },
    cpmTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    cpmTotalLabel: { fontSize: 14, fontWeight: "700" },
    cpmTotalSub: { fontSize: 11, marginTop: 1 },
    cpmTotalValue: { fontSize: 20, fontWeight: "900" },
    presetHint: { fontSize: 13, marginBottom: 8 },
    presetList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    presetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
    presetRowText: { fontSize: 15, fontWeight: "500" },
  });
}
