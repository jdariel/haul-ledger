import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  useQuickExpenses,
  useCreateQuickExpense,
  useDeleteQuickExpense,
  useCreateExpense,
} from "@/hooks/useApi";

const CATEGORIES = [
  { label: "Fuel", value: "Fuel" },
  { label: "Repairs", value: "Repairs" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Insurance", value: "Insurance" },
  { label: "Tolls", value: "Tolls" },
  { label: "Parking", value: "Parking" },
  { label: "Scale Fee", value: "Scale Fee" },
  { label: "Lumper", value: "Lumper" },
  { label: "Other", value: "Other" },
];

const CATEGORY_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  Fuel:        { icon: "flame-outline",         bg: "#fef9c3", color: "#ca8a04" },
  Repairs:     { icon: "construct-outline",      bg: "#fee2e2", color: "#ef4444" },
  Maintenance: { icon: "settings-outline",       bg: "#ede9fe", color: "#7c3aed" },
  Insurance:   { icon: "shield-checkmark-outline", bg: "#dcfce7", color: "#16a34a" },
  Tolls:       { icon: "car-outline",            bg: "#e0f2fe", color: "#0284c7" },
  Parking:     { icon: "location-outline",       bg: "#fce7f3", color: "#be185d" },
  "Scale Fee": { icon: "scale-outline",          bg: "#f0fdf4", color: "#15803d" },
  Lumper:      { icon: "people-outline",         bg: "#fff7ed", color: "#ea580c" },
  Other:       { icon: "ellipsis-horizontal-circle-outline", bg: "#f1f5f9", color: "#64748b" },
};

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

interface QuickExpense {
  id: number;
  label: string;
  category: string;
  defaultAmount: number;
}

export default function QuickAddScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const C = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { data: templates = [], isLoading } = useQuickExpenses();
  const createTemplate = useCreateQuickExpense();
  const deleteTemplate = useDeleteQuickExpense();
  const createExpense = useCreateExpense();

  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Tolls");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  const resetForm = () => { setLabel(""); setCategory("Tolls"); setAmount(""); };

  const handleSaveTemplate = async () => {
    if (!label.trim()) return Alert.alert("Validation", "Please enter a label for this template.");
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Alert.alert("Validation", "Please enter a valid amount.");

    setSaving(true);
    try {
      await createTemplate.mutateAsync({ label: label.trim(), category, defaultAmount: amt });
      resetForm();
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleLog = async (template: QuickExpense) => {
    setLoggingId(template.id);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createExpense.mutateAsync({
        date: today,
        merchant: template.label,
        category: template.category,
        amount: template.defaultAmount,
        notes: "Logged via Quick Add",
      });
      Alert.alert("Logged!", `$${template.defaultAmount.toFixed(2)} ${template.label} added to expenses.`);
    } catch {
      Alert.alert("Error", "Failed to log expense.");
    } finally {
      setLoggingId(null);
    }
  };

  const handleDelete = (template: QuickExpense) => {
    Alert.alert(
      "Delete Template",
      `Remove "${template.label}" from Quick Add?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTemplate.mutate(template.id),
        },
      ]
    );
  };

  const s = makeStyles(C);

  const renderItem = ({ item }: { item: QuickExpense }) => {
    const style = CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS["Other"];
    const isLogging = loggingId === item.id;
    return (
      <View style={[s.row, { borderBottomColor: C.separator }]}>
        <View style={[s.iconBox, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon as any} size={20} color={style.color} />
        </View>
        <View style={s.rowContent}>
          <Text style={[s.rowLabel, { color: C.text }]} numberOfLines={1}>{item.label}</Text>
          <View style={[s.catBadge, { backgroundColor: style.bg }]}>
            <Text style={[s.catBadgeText, { color: style.color }]}>{item.category}</Text>
          </View>
        </View>
        <Text style={[s.amount, { color: C.text }]}>{fmt(item.defaultAmount)}</Text>
        <TouchableOpacity
          style={[s.logBtn, { backgroundColor: C.primary }]}
          onPress={() => handleLog(item)}
          disabled={isLogging}
          activeOpacity={0.8}
        >
          {isLogging
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="flash" size={16} color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>Quick Add</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: C.primary }]}
          onPress={() => { resetForm(); setModalVisible(true); }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <Text style={[s.subtitle, { color: C.textSecondary }]}>
        Tap ⚡ to instantly log an expense using a saved template.
      </Text>

      {/* List */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : templates.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
            <Ionicons name="flash-outline" size={40} color={C.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: C.text }]}>No templates yet</Text>
          <Text style={[s.emptyBody, { color: C.textSecondary }]}>
            Save recurring expenses like toll fees, parking, or scale fees. Log them with one tap.
          </Text>
          <TouchableOpacity
            style={[s.emptyBtn, { backgroundColor: C.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={s.emptyBtnText}>Add First Template</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={templates as QuickExpense[]}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          style={[s.list, { backgroundColor: C.card, borderColor: C.separator }]}
        />
      )}

      {/* Add Template Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity style={s.modalBackdropTouch} onPress={() => setModalVisible(false)} />
          <View style={[s.sheet, { backgroundColor: C.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: C.text }]}>New Template</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetBody}>
              <FormInput
                label="Label"
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Weigh Station Fee"
                autoCapitalize="words"
              />
              <SelectField
                label="Category"
                value={category}
                options={CATEGORIES}
                onChange={setCategory}
              />
              <FormInput
                label="Default Amount ($)"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[s.sheetSave, { backgroundColor: C.primary }, saving && { opacity: 0.7 }]}
              onPress={handleSaveTemplate}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.sheetSaveText}>Save Template</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { width: 36, height: 36, justifyContent: "center" },
    title: { fontSize: 20, fontWeight: "700" },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    subtitle: {
      fontSize: 13,
      marginHorizontal: 16,
      marginBottom: 16,
      lineHeight: 18,
    },
    list: {
      marginHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    rowContent: { flex: 1, gap: 3 },
    rowLabel: { fontSize: 14, fontWeight: "600" },
    catBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    catBadgeText: { fontSize: 11, fontWeight: "600" },
    amount: { fontSize: 15, fontWeight: "700", minWidth: 54, textAlign: "right" },
    logBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteBtn: { width: 30, justifyContent: "center", alignItems: "center" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 14 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 20, fontWeight: "700" },
    emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 21 },
    emptyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 12,
      marginTop: 4,
    },
    emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    modalBackdrop: { flex: 1, justifyContent: "flex-end" },
    modalBackdropTouch: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 16,
      gap: 16,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#d1d5db",
      alignSelf: "center",
      marginBottom: 4,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sheetTitle: { fontSize: 18, fontWeight: "700" },
    sheetBody: { gap: 4 },
    sheetSave: {
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 4,
    },
    sheetSaveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}
