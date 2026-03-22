import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { useCreateExpense, apiFetch } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/useColorScheme";

async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    return uri.split(",")[1] ?? "";
  }
  if (Platform.OS !== "web") {
    return FileSystem.readAsStringAsync(uri, { encoding: "base64" as never });
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CATEGORIES = ["Fuel", "Maintenance", "Lumper", "Tolls", "Parking", "Scale Fee", "Other"];

interface ParsedReceipt {
  merchant: string;
  date: string;
  amount: string;
  category: string;
  gallons: string;
  pricePerGallon: string;
  jurisdiction: string;
  receiptUrl: string | null;
}

type ScanStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export default function ScanReceiptScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);

  const [image, setImage] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);

  const createExpense = useCreateExpense();

  const pickImage = async (fromCamera: boolean) => {
    let result;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required to scan receipts.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
    }

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImage(uri);
      setParsed(null);
      setErrorMsg(null);
      await processReceipt(uri);
    }
  };

  const processReceipt = async (uri: string) => {
    try {
      setScanStatus("uploading");
      const base64 = await uriToBase64(uri);

      setScanStatus("analyzing");
      const data = await apiFetch("/receipts/process", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
        }),
      });
      const today = new Date().toISOString().split("T")[0];

      setParsed({
        merchant: data.merchant ?? "",
        date: data.date ?? today,
        amount: data.amount != null ? String(data.amount) : "",
        category: CATEGORIES.includes(data.category) ? data.category : "Other",
        gallons: data.gallons != null ? String(data.gallons) : "",
        pricePerGallon: data.pricePerGallon != null ? String(data.pricePerGallon) : "",
        jurisdiction: data.jurisdiction ?? "",
        receiptUrl: data.receiptUrl ?? null,
      });
      setScanStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not read receipt";
      setErrorMsg(msg);
      setScanStatus("error");
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    const amount = parseFloat(parsed.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Enter amount", "Please enter a valid expense amount.");
      return;
    }
    if (!parsed.merchant.trim()) {
      Alert.alert("Enter merchant", "Please enter a merchant name.");
      return;
    }

    const expenseData: Record<string, unknown> = {
      category: parsed.category,
      merchant: parsed.merchant.trim(),
      amount,
      date: parsed.date || new Date().toISOString().split("T")[0],
      notes: "Scanned receipt",
      receiptUrl: parsed.receiptUrl ?? undefined,
    };

    if (parsed.category === "Fuel") {
      if (parsed.gallons) expenseData.gallons = parseFloat(parsed.gallons);
      if (parsed.pricePerGallon) expenseData.pricePerGallon = parseFloat(parsed.pricePerGallon);
      if (parsed.jurisdiction) expenseData.jurisdiction = parsed.jurisdiction.trim();
    }

    await createExpense.mutateAsync(expenseData as Parameters<typeof createExpense.mutateAsync>[0]);
    router.back();
  };

  const update = (field: keyof ParsedReceipt, value: string) => {
    setParsed((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const statusLabel: Record<ScanStatus, string> = {
    idle: "",
    uploading: "Uploading receipt…",
    analyzing: "AI is reading your receipt…",
    done: "",
    error: "",
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.primary} />
            <Text style={[s.backText, { color: C.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Scan Receipt</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!image ? (
            <View style={s.placeholder}>
              <View style={[s.scanIcon, { backgroundColor: C.orangeLight }]}>
                <Ionicons name="scan-outline" size={48} color={C.orange} />
              </View>
              <Text style={s.placeholderTitle}>Scan a Receipt</Text>
              <Text style={s.placeholderSub}>
                Take a photo or choose from your library. AI will extract the expense details automatically.
              </Text>
              <View style={s.btnRow}>
                <TouchableOpacity
                  style={[s.pickBtn, { backgroundColor: C.primary }]}
                  onPress={() => pickImage(true)}
                >
                  <Ionicons name="camera-outline" size={18} color="#fff" />
                  <Text style={s.pickBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.pickBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.separator }]}
                  onPress={() => pickImage(false)}
                >
                  <Ionicons name="image-outline" size={18} color={C.text} />
                  <Text style={[s.pickBtnText, { color: C.text }]}>Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.imageContainer}>
              <Image source={{ uri: image }} style={s.receiptImage} resizeMode="contain" />
              <TouchableOpacity
                style={[s.retakeBtn, { borderColor: C.separator, backgroundColor: C.card }]}
                onPress={() => { setImage(null); setParsed(null); setScanStatus("idle"); setErrorMsg(null); }}
              >
                <Ionicons name="refresh-outline" size={15} color={C.textSecondary} />
                <Text style={[s.retakeText, { color: C.textSecondary }]}>Retake</Text>
              </TouchableOpacity>
            </View>
          )}

          {(scanStatus === "uploading" || scanStatus === "analyzing") && (
            <View style={s.statusBox}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[s.statusText, { color: C.textSecondary }]}>{statusLabel[scanStatus]}</Text>
            </View>
          )}

          {scanStatus === "error" && (
            <View style={[s.errorBox, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              <Text style={[s.errorText, { color: "#ef4444" }]}>{errorMsg}</Text>
            </View>
          )}

          {parsed && scanStatus === "done" && (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <View style={s.cardHeaderRow}>
                <Text style={[s.cardTitle, { color: C.text }]}>Receipt Details</Text>
                <View style={[s.aiBadge, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name="sparkles" size={11} color={C.primary} />
                  <Text style={[s.aiBadgeText, { color: C.primary }]}>AI Filled</Text>
                </View>
              </View>

              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>MERCHANT</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                value={parsed.merchant}
                onChangeText={(v) => update("merchant", v)}
                placeholder="Merchant name"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>DATE</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                value={parsed.date}
                onChangeText={(v) => update("date", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>AMOUNT ($)</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                value={parsed.amount}
                onChangeText={(v) => update("amount", v)}
                placeholder="0.00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>CATEGORY</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => update("category", cat)}
                    style={[
                      s.catChip,
                      {
                        borderColor: parsed.category === cat ? C.primary : C.separator,
                        backgroundColor: parsed.category === cat ? C.primaryLight : C.card,
                      },
                    ]}
                  >
                    <Text style={[s.catText, { color: parsed.category === cat ? C.primary : C.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {parsed.category === "Fuel" && (
                <>
                  <Text style={[s.sectionLabel, { color: C.text }]}>Fuel Details</Text>

                  <Text style={[s.fieldLabel, { color: C.textSecondary }]}>GALLONS</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                    value={parsed.gallons}
                    onChangeText={(v) => update("gallons", v)}
                    placeholder="0.000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[s.fieldLabel, { color: C.textSecondary }]}>PRICE PER GALLON</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                    value={parsed.pricePerGallon}
                    onChangeText={(v) => update("pricePerGallon", v)}
                    placeholder="0.000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[s.fieldLabel, { color: C.textSecondary }]}>STATE / JURISDICTION</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator, color: C.text }]}
                    value={parsed.jurisdiction}
                    onChangeText={(v) => update("jurisdiction", v)}
                    placeholder="e.g. TX"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </>
              )}

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: createExpense.isPending ? C.separator : C.primary }]}
                onPress={handleSave}
                disabled={createExpense.isPending}
              >
                {createExpense.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
      backgroundColor: C.card,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 60 },
    backText: { fontSize: 15, fontWeight: "600" },
    title: { fontSize: 17, fontWeight: "700", color: C.text },
    content: { padding: 20, gap: 16, paddingBottom: 40 },
    placeholder: { alignItems: "center", paddingVertical: 40, gap: 12 },
    scanIcon: {
      width: 88,
      height: 88,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    placeholderTitle: { fontSize: 20, fontWeight: "800", color: C.text },
    placeholderSub: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 280 },
    btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    pickBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderRadius: 12,
      minWidth: 120,
      justifyContent: "center",
    },
    pickBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    imageContainer: { alignItems: "center", gap: 10 },
    receiptImage: {
      width: "100%",
      height: 260,
      borderRadius: 16,
      backgroundColor: C.inputBackground,
    },
    retakeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    retakeText: { fontSize: 13, fontWeight: "600" },
    statusBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      justifyContent: "center",
      paddingVertical: 12,
    },
    statusText: { fontSize: 14 },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    errorText: { fontSize: 14, flex: 1 },
    card: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      gap: 8,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    aiBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    aiBadgeText: { fontSize: 11, fontWeight: "700" },
    sectionLabel: { fontSize: 14, fontWeight: "700", marginTop: 8, marginBottom: -2 },
    fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 4 },
    input: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
    },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    catText: { fontSize: 13, fontWeight: "600" },
    saveBtn: {
      marginTop: 12,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
    },
    saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}
