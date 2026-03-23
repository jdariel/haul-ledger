import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Text,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { SelectField } from "@/components/SelectField";
import { useCreateExpense, useUpdateExpense, useExpense } from "@/hooks/useApi";
import { API_BASE_URL } from "@/constants/api";
import { useColorScheme } from "@/hooks/useColorScheme";
import { trackEntryAndRequestReview } from "@/lib/appReview";

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

const PAYMENT_METHODS = [
  { label: "Cash", value: "Cash" },
  { label: "Check", value: "Check" },
  { label: "Fuel Card", value: "Fuel Card" },
  { label: "EFS Check", value: "EFS Check" },
  { label: "Comchek", value: "Comchek" },
  { label: "Credit Card", value: "Credit Card" },
  { label: "Other", value: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
].map((s) => ({ label: s, value: s }));

type ScanStatus = "idle" | "picking" | "uploading" | "analyzing" | "done" | "error";

async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.split(",")[1] ?? "";
  if (Platform.OS !== "web") {
    return FileSystem.readAsStringAsync(uri, { encoding: "base64" as never });
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function AddExpenseScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { scan, id } = useLocalSearchParams<{ scan?: string; id?: string }>();
  const editId = id ? parseInt(id) : null;
  const isEditing = editId != null;

  const { data: existing, isLoading: loadingExisting } = useExpense(editId);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Fuel");
  const [payment, setPayment] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [gallons, setGallons] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (existing && !prefilled) {
      setDate(existing.date ?? today);
      setMerchant(existing.merchant ?? "");
      setCategory(existing.category ?? "Fuel");
      setPayment(existing.paymentMethod ?? "");
      setAmount(existing.amount != null ? String(existing.amount) : "");
      setNotes(existing.notes ?? "");
      setGallons(existing.gallons != null ? String(existing.gallons) : "");
      setPricePerGallon(existing.pricePerGallon != null ? String(existing.pricePerGallon) : "");
      setJurisdiction(existing.jurisdiction ?? "");
      setReceiptUrl(existing.receiptUrl ?? null);
      setPrefilled(true);
    }
  }, [existing]);

  const isFuel = category === "Fuel";
  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;
  const isScanning = scanStatus === "uploading" || scanStatus === "analyzing";
  const isSaving = createExpense.isPending || updateExpense.isPending;

  useEffect(() => {
    if (scan === "1") launchPicker(false);
  }, []);

  const launchPicker = async (fromCamera: boolean) => {
    setScanStatus("picking");
    let result;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required.");
        setScanStatus("idle");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    }
    if (result.canceled || !result.assets[0]) {
      setScanStatus("idle");
      return;
    }
    const uri = result.assets[0].uri;
    setReceiptUri(uri);
    await processReceipt(uri);
  };

  const processReceipt = async (uri: string) => {
    try {
      setScanStatus("uploading");
      const base64 = await uriToBase64(uri);
      setScanStatus("analyzing");
      const response = await fetch(`${API_BASE_URL}/receipts/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();

      if (data.merchant) setMerchant(data.merchant);
      if (data.date) setDate(data.date);
      if (data.amount != null) setAmount(String(data.amount));
      if (data.category && CATEGORIES.some((c) => c.value === data.category)) setCategory(data.category);
      if (data.gallons != null) setGallons(String(data.gallons));
      if (data.pricePerGallon != null) setPricePerGallon(String(data.pricePerGallon));
      if (data.jurisdiction) setJurisdiction(data.jurisdiction);
      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);

      setScanStatus("done");
    } catch {
      setScanStatus("error");
      Alert.alert("Scan failed", "Could not read the receipt. Please fill in the details manually.");
    }
  };

  const handleSave = async () => {
    if (!merchant.trim()) return Alert.alert("Error", "Merchant is required");
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Valid amount is required");
    const payload = {
      date,
      merchant: merchant.trim(),
      category,
      paymentMethod: payment || null,
      amount: parseFloat(amount),
      notes: notes.trim() || null,
      gallons: gallons ? parseFloat(gallons) : null,
      pricePerGallon: pricePerGallon ? parseFloat(pricePerGallon) : null,
      jurisdiction: jurisdiction || null,
      receiptUrl: receiptUrl ?? null,
    };
    try {
      if (isEditing) {
        await updateExpense.mutateAsync({ id: editId!, data: payload });
      } else {
        await createExpense.mutateAsync(payload as any);
        trackEntryAndRequestReview().catch(() => {});
      }
      router.back();
    } catch {
      Alert.alert("Error", `Failed to ${isEditing ? "update" : "save"} expense`);
    }
  };

  if (isEditing && loadingExisting) {
    return (
      <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={[s.title, { color: C.text }]}>{isEditing ? "Edit Expense" : "Log Expense"}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 80 }]}
      >
        {/* Scan Receipt button / status — only show when adding */}
        {!isEditing && (scanStatus === "idle" || scanStatus === "picking" || scanStatus === "error") ? (
          <View style={s.scanActions}>
            <TouchableOpacity
              style={[s.scanBtn, { backgroundColor: C.primaryLight }]}
              onPress={() => launchPicker(true)}
              activeOpacity={0.7}
              disabled={isScanning}
            >
              <Ionicons name="camera-outline" size={17} color={C.primary} />
              <Text style={[s.scanBtnText, { color: C.primary }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.scanBtn, { backgroundColor: C.primaryLight }]}
              onPress={() => launchPicker(false)}
              activeOpacity={0.7}
              disabled={isScanning}
            >
              <Ionicons name="image-outline" size={17} color={C.primary} />
              <Text style={[s.scanBtnText, { color: C.primary }]}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>
        ) : !isEditing && isScanning ? (
          <View style={[s.scanningBox, { backgroundColor: C.primaryLight }]}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={[s.scanningText, { color: C.primary }]}>
              {scanStatus === "uploading" ? "Uploading receipt…" : "AI is reading your receipt…"}
            </Text>
          </View>
        ) : !isEditing && scanStatus === "done" ? (
          <View style={[s.receiptPreview, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
            <View style={s.receiptPreviewLeft}>
              {receiptUri ? (
                <Image source={{ uri: receiptUri }} style={s.receiptThumb} />
              ) : null}
              <View>
                <View style={[s.aiBadge, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name="sparkles" size={11} color={C.primary} />
                  <Text style={[s.aiBadgeText, { color: C.primary }]}>Auto-filled</Text>
                </View>
                <Text style={[s.receiptHint, { color: C.textSecondary }]}>Review & correct if needed</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { setScanStatus("idle"); setReceiptUri(null); }} hitSlop={8}>
              <Ionicons name="refresh-outline" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Merchant */}
        <FormInput
          label="Merchant"
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Pilot Flying J"
          autoFocus={!scan && !isEditing}
        />

        {/* Amount + Date row */}
        <View style={s.row}>
          <View style={s.half}>
            <FormInput
              label="Amount ($)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.half}>
            <FormInput
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Category + Payment row */}
        <View style={s.row}>
          <View style={s.half}>
            <SelectField label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
          </View>
          <View style={s.half}>
            <SelectField label="Payment" value={payment} options={PAYMENT_METHODS} placeholder="Select" onChange={setPayment} />
          </View>
        </View>

        {/* Fuel Details */}
        {isFuel && (
          <View style={[s.fuelBox, { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }]}>
            <View style={s.fuelHeader}>
              <MaterialCommunityIcons name="fire" size={16} color="#f59e0b" />
              <Text style={s.fuelTitle}>FUEL DETAILS</Text>
            </View>
            <View style={s.row}>
              <View style={s.half}>
                <FormInput label="$/Gallon" value={pricePerGallon} onChangeText={setPricePerGallon} placeholder="3.459" keyboardType="decimal-pad" />
              </View>
              <View style={s.half}>
                <FormInput label="Gallons" value={gallons} onChangeText={setGallons} placeholder="120.5" keyboardType="decimal-pad" />
              </View>
            </View>
            <SelectField label="State / Jurisdiction" value={jurisdiction} options={US_STATES} placeholder="Select state" onChange={setJurisdiction} />
          </View>
        )}

        {/* Notes */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: C.inputBackground, borderColor: C.cardBorder, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Details..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>

      {/* Save Button */}
      <View style={[s.footer, { paddingBottom: bottomPad + 12, borderTopColor: C.separator, backgroundColor: C.background }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>{isEditing ? "Update Expense" : "Save Expense"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  scanActions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanBtnText: { fontSize: 14, fontWeight: "600" },
  scanningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  scanningText: { fontSize: 14, fontWeight: "600" },
  receiptPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  receiptPreviewLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  receiptThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#e5e7eb" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 3,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700" },
  receiptHint: { fontSize: 12 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  fuelBox: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 16 },
  fuelHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  fuelTitle: { fontSize: 12, fontWeight: "700", color: "#f59e0b", letterSpacing: 0.8 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 90,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
