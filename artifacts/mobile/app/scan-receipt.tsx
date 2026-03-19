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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useCreateExpense } from "@/hooks/useApi";

const CATEGORIES = ["Fuel", "Maintenance", "Lumper", "Tolls", "Parking", "Scale Fee", "Other"];

export default function ScanReceiptScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<{ amount?: string; merchant?: string; category?: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Other");

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
      setImage(result.assets[0].uri);
      setLoading(true);
      // Simulate parsing — in a real app you'd send to an OCR API
      setTimeout(() => {
        setParsed({ amount: "", merchant: "", category: "Other" });
        setSelectedCategory("Other");
        setLoading(false);
      }, 1200);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    const amount = parseFloat(parsed.amount || "0");
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Enter amount", "Please enter the expense amount.");
      return;
    }
    await createExpense.mutateAsync({
      category: selectedCategory,
      merchant: parsed.merchant || "Receipt",
      amount,
      date: new Date().toISOString().split("T")[0],
      notes: "Scanned receipt",
    });
    router.back();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[s.backText, { color: C.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Scan Receipt</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Image area */}
        {!image ? (
          <View style={s.placeholder}>
            <View style={[s.scanIcon, { backgroundColor: C.orangeLight }]}>
              <Ionicons name="scan-outline" size={48} color={C.orange} />
            </View>
            <Text style={s.placeholderTitle}>Scan a Receipt</Text>
            <Text style={s.placeholderSub}>Take a photo or choose from your library to extract expense details automatically.</Text>
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
              onPress={() => { setImage(null); setParsed(null); }}
            >
              <Ionicons name="refresh-outline" size={15} color={C.textSecondary} />
              <Text style={[s.retakeText, { color: C.textSecondary }]}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={[s.loadingText, { color: C.textSecondary }]}>Reading receipt…</Text>
          </View>
        )}

        {/* Parsed Fields */}
        {parsed && !loading && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>Receipt Details</Text>

            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Merchant</Text>
            <View style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator }]}>
              <Text
                style={[s.inputText, { color: parsed.merchant ? C.text : C.textMuted }]}
                onPress={() => {}}
              >
                {parsed.merchant || "Enter merchant name…"}
              </Text>
            </View>

            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Amount ($)</Text>
            <View style={[s.input, { backgroundColor: C.inputBackground, borderColor: C.separator }]}>
              <Text style={[s.inputText, { color: parsed.amount ? C.text : C.textMuted }]}>
                {parsed.amount || "Enter amount…"}
              </Text>
            </View>

            <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Category</Text>
            <View style={s.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    s.catChip,
                    { borderColor: selectedCategory === cat ? C.primary : C.separator,
                      backgroundColor: selectedCategory === cat ? C.primaryLight : C.card }
                  ]}
                >
                  <Text style={[s.catText, { color: selectedCategory === cat ? C.primary : C.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: C.primary }]}
              onPress={handleSave}
              disabled={createExpense.isPending}
            >
              <Text style={s.saveBtnText}>
                {createExpense.isPending ? "Saving…" : "Save Expense"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
    content: { padding: 20, gap: 16 },
    placeholder: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 12,
    },
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
      height: 280,
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
    loadingBox: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 8 },
    loadingText: { fontSize: 14 },
    card: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      gap: 8,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
    fieldLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
    input: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    inputText: { fontSize: 15 },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    catText: { fontSize: 13, fontWeight: "600" },
    saveBtn: {
      marginTop: 8,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
    },
    saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}
