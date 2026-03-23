import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";
import { Colors } from "@/constants/colors";
import { useExpense, useDeleteExpense } from "@/hooks/useApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useColorScheme } from "@/hooks/useColorScheme";

const BASE_URL =
  Platform.OS === "web"
    ? "/api"
    : `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

function receiptImageUrl(objectPath: string): string {
  return `${BASE_URL}/storage${objectPath}`;
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  Fuel: { icon: "flame", color: "#f59e0b", bg: "#fef3c7" },
  Maintenance: { icon: "construct", color: "#8b5cf6", bg: "#ede9fe" },
  Repairs: { icon: "build", color: "#8b5cf6", bg: "#ede9fe" },
  Lumper: { icon: "people", color: "#3b82f6", bg: "#eff6ff" },
  Tolls: { icon: "car", color: "#6b7280", bg: "#f3f4f6" },
  Parking: { icon: "location", color: "#14b8a6", bg: "#ccfbf1" },
  "Scale Fee": { icon: "scale", color: "#f97316", bg: "#fff7ed" },
  Insurance: { icon: "shield-checkmark", color: "#0ea5e9", bg: "#e0f2fe" },
  Other: { icon: "ellipsis-horizontal", color: "#6b7280", bg: "#f3f4f6" },
};

function Row({ label, value, C }: { label: string; value?: string | null; C: typeof Colors.light }) {
  if (!value) return null;
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: C.text }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  label: { fontSize: 14, fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "600", maxWidth: "55%", textAlign: "right" },
});

export default function ExpenseDetailScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: expense, isLoading } = useExpense(id ? parseInt(id) : null);
  const deleteExpense = useDeleteExpense();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const s = makeStyles(C);
  const { width, height } = Dimensions.get("window");

  const handleDelete = () => setConfirmDelete(true);

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
        <Text style={{ color: C.textSecondary }}>Expense not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = CATEGORY_ICONS[expense.category] ?? CATEGORY_ICONS.Other;
  const hasReceipt = !!expense.receiptUrl && !imageError;
  const imgUrl = expense.receiptUrl ? receiptImageUrl(expense.receiptUrl) : null;

  const date = expense.date
    ? new Date(expense.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const isFuel =
    expense.category === "Fuel" &&
    (expense.gallons != null || expense.pricePerGallon != null);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[s.backText, { color: C.primary }]}>Expenses</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity onPress={() => router.push(`/add-expense?id=${id}`)} style={s.deleteBtn}>
            <Ionicons name="pencil-outline" size={20} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: meta.bg }]}>
          <View style={[s.heroIcon]}>
            <Ionicons name={meta.icon as any} size={32} color={meta.color} />
          </View>
          <Text style={[s.heroAmount, { color: C.text }]}>
            -${Number(expense.amount).toFixed(2)}
          </Text>
          <Text style={[s.heroMerchant, { color: C.text }]}>
            {expense.merchant || expense.category}
          </Text>
          <View style={[s.categoryBadge, { backgroundColor: meta.color + "22" }]}>
            <Text style={[s.categoryBadgeText, { color: meta.color }]}>
              {expense.category}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.sectionTitle, { color: C.text }]}>Details</Text>
          <View style={[s.divider, { backgroundColor: C.separator }]} />
          <View style={{ gap: 0 }}>
            <Row label="Date" value={date} C={C} />
            <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
            <Row label="Merchant" value={expense.merchant} C={C} />
            <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
            <Row label="Payment Method" value={expense.paymentMethod} C={C} />
            {expense.notes ? (
              <>
                <View style={[s.rowDivider, { backgroundColor: C.separator }]} />
                <View style={{ paddingVertical: 12 }}>
                  <Text style={[rowStyles.label, { color: C.textSecondary, marginBottom: 6 }]}>
                    Notes
                  </Text>
                  <Text style={[{ color: C.text, fontSize: 14, lineHeight: 20 }]}>
                    {expense.notes}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Fuel Details Card */}
        {isFuel && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={[s.sectionTitle, { color: C.text }]}>Fuel Details</Text>
            <View style={[s.divider, { backgroundColor: C.separator }]} />
            <View style={s.fuelGrid}>
              <View style={[s.fuelStat, { backgroundColor: C.background }]}>
                <Ionicons name="water-outline" size={18} color="#f59e0b" />
                <Text style={[s.fuelStatVal, { color: C.text }]}>
                  {expense.gallons != null ? Number(expense.gallons).toFixed(3) : "—"}
                </Text>
                <Text style={[s.fuelStatLbl, { color: C.textSecondary }]}>Gallons</Text>
              </View>
              <View style={[s.fuelStat, { backgroundColor: C.background }]}>
                <Ionicons name="pricetag-outline" size={18} color="#10b981" />
                <Text style={[s.fuelStatVal, { color: C.text }]}>
                  {expense.pricePerGallon != null
                    ? `$${Number(expense.pricePerGallon).toFixed(3)}`
                    : "—"}
                </Text>
                <Text style={[s.fuelStatLbl, { color: C.textSecondary }]}>Per Gallon</Text>
              </View>
              <View style={[s.fuelStat, { backgroundColor: C.background }]}>
                <Ionicons name="location-outline" size={18} color="#3b82f6" />
                <Text style={[s.fuelStatVal, { color: C.text }]}>
                  {expense.jurisdiction ?? "—"}
                </Text>
                <Text style={[s.fuelStatLbl, { color: C.textSecondary }]}>State</Text>
              </View>
            </View>
          </View>
        )}

        {/* Receipt Card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.sectionTitle, { color: C.text }]}>Receipt</Text>
          <View style={[s.divider, { backgroundColor: C.separator }]} />

          {imgUrl && !imageError ? (
            <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.85}>
              <Image
                source={{ uri: imgUrl }}
                style={s.receiptThumb}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
              <View style={[s.viewFullBtn, { borderColor: C.separator }]}>
                <Ionicons name="expand-outline" size={15} color={C.primary} />
                <Text style={[s.viewFullText, { color: C.primary }]}>Tap to view full receipt</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.noReceipt}>
              <Ionicons name="receipt-outline" size={36} color={C.textMuted} />
              <Text style={[s.noReceiptText, { color: C.textMuted }]}>
                {imageError ? "Receipt image unavailable" : "No receipt attached"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      {imgUrl && (
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={s.imageModal}>
            <TouchableOpacity
              style={s.imageModalClose}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: imgUrl }}
              style={{ width, height: height * 0.85 }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete Expense"
        message="Remove this expense permanently?"
        onConfirm={() => {
          deleteExpense.mutate(parseInt(id!), {
            onSuccess: () => { setConfirmDelete(false); router.back(); },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { fontSize: 16, fontWeight: "500" },
    deleteBtn: { padding: 8 },
    content: { padding: 16, paddingBottom: 60, gap: 14 },
    hero: {
      alignItems: "center",
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderRadius: 20,
      gap: 8,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.6)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    heroAmount: { fontSize: 32, fontWeight: "800" },
    heroMerchant: { fontSize: 18, fontWeight: "700" },
    categoryBadge: {
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 20,
      marginTop: 4,
    },
    categoryBadgeText: { fontSize: 13, fontWeight: "700" },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    sectionTitle: { fontSize: 15, fontWeight: "700" },
    divider: { height: 1, marginHorizontal: -16 },
    rowDivider: { height: 1 },
    fuelGrid: { flexDirection: "row", gap: 10 },
    fuelStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 12,
      gap: 4,
    },
    fuelStatVal: { fontSize: 16, fontWeight: "800" },
    fuelStatLbl: { fontSize: 11, fontWeight: "500" },
    receiptThumb: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      marginTop: 4,
    },
    viewFullBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 10,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    viewFullText: { fontSize: 13, fontWeight: "600" },
    noReceipt: {
      alignItems: "center",
      paddingVertical: 30,
      gap: 8,
    },
    noReceiptText: { fontSize: 14 },
    imageModal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    },
    imageModalClose: {
      position: "absolute",
      top: 60,
      right: 20,
      zIndex: 10,
    },
  });
}
