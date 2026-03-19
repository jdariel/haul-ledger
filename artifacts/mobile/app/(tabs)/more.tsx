import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppContext } from "@/context/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";

interface RowProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  last?: boolean;
  C: typeof Colors.light;
}

function Row({ icon, iconBg, iconColor, label, subtitle, onPress, rightElement, last, C }: RowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        rowS.row,
        !last && { borderBottomWidth: 1, borderBottomColor: C.separator },
      ]}
    >
      <View style={[rowS.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={19} color={iconColor} />
      </View>
      <View style={rowS.text}>
        <Text style={[rowS.label, { color: C.text }]}>{label}</Text>
        {subtitle ? <Text style={[rowS.sub, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {rightElement ?? <Ionicons name="chevron-forward" size={15} color={C.textMuted} />}
    </TouchableOpacity>
  );
}

const rowS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  text: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 1 },
});

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { settings, updateSettings } = useAppContext();
  const isDark = settings.colorScheme === "dark";
  const [mileTarget, setMileTarget] = useState(String(settings.mileageGoal || ""));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <View style={s.profileTop}>
            <View style={[s.avatar, { backgroundColor: C.primary }]}>
              <Text style={s.avatarText}>DJ</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: C.text }]}>Dariel Jimenez</Text>
              <Text style={[s.profileEmail, { color: C.textSecondary }]}>jimenezdariel16@gmail.com</Text>
              <View style={[s.authBadge, { backgroundColor: C.primary + "18" }]}>
                <Ionicons name="shield-checkmark" size={10} color={C.primary} />
                <Text style={[s.authBadgeText, { color: C.primary }]}>Replit Auth</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tools */}
        <Text style={s.sectionLabel}>Tools</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <Row icon="map-outline" iconBg={C.primaryLight} iconColor={C.primary}
            label="Trips" subtitle="Log trips and track mileage"
            onPress={() => router.push("/add-trip")} C={C} />
          <Row icon="flame-outline" iconBg={C.orangeLight} iconColor={C.orange}
            label="Fuel Log" subtitle="Track fuel purchases for IFTA"
            onPress={() => router.push("/fuel-log")} C={C} />
          <Row icon="git-merge-outline" iconBg={C.tealLight} iconColor={C.teal}
            label="Saved Routes" subtitle="Templates for quick income logging"
            onPress={() => router.push("/add-route")} C={C} />
          <Row icon="car-outline" iconBg={C.tealLight} iconColor={C.teal}
            label="Fleet" subtitle="Manage trucks and trailers"
            onPress={() => router.push("/add-asset")} C={C} />
          <Row icon="flash-outline" iconBg="#fef9c3" iconColor="#ca8a04"
            label="Quick Add" subtitle="Save common expenses for one-tap logging"
            onPress={() => {}} last C={C} />
        </View>

        {/* Goals */}
        <Text style={s.sectionLabel}>Goals</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <View style={s.goalRow}>
            <View style={[s.goalIcon, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="navigate" size={18} color={C.primary} />
            </View>
            <View style={s.goalText}>
              <Text style={[s.goalLabel, { color: C.text }]}>Weekly Miles Target</Text>
              <Text style={[s.goalSub, { color: C.textSecondary }]}>Track progress on your dashboard</Text>
            </View>
            <TextInput
              style={[s.goalInput, { borderColor: C.separator, color: C.text, backgroundColor: C.background }]}
              placeholder="e.g. 2500"
              placeholderTextColor={C.textMuted}
              value={mileTarget}
              onChangeText={setMileTarget}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: C.primary }]}
              onPress={() => updateSettings({ mileageGoal: parseInt(mileTarget) || 0 })}
            >
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences */}
        <Text style={s.sectionLabel}>Preferences</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <View style={[s.prefRow, { borderBottomWidth: 1, borderBottomColor: C.separator }]}>
            <View style={[rowS.iconBox, { backgroundColor: isDark ? "#1e293b" : "#fef9c3" }]}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={19} color={isDark ? "#818cf8" : "#ca8a04"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.prefLabel, { color: C.text }]}>Dark Mode</Text>
              <Text style={[{ fontSize: 12, color: C.textSecondary, marginTop: 1 }]}>
                {isDark ? "Dark theme active" : "Light theme active"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => updateSettings({ colorScheme: val ? "dark" : "light" })}
              trackColor={{ true: "#6366f1", false: C.separator }}
              thumbColor="#fff"
            />
          </View>
          <View style={s.prefRow}>
            <View style={[rowS.iconBox, { backgroundColor: C.greenLight }]}>
              <Ionicons name="notifications-outline" size={19} color={C.green} />
            </View>
            <Text style={[s.prefLabel, { color: C.text }]}>Notifications</Text>
            <Switch
              value={false}
              onValueChange={() => {}}
              trackColor={{ true: C.primary, false: C.separator }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Data & Export */}
        <Text style={s.sectionLabel}>Data & Export</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <Row icon="download-outline" iconBg={C.primaryLight} iconColor={C.primary}
            label="Export All Data" subtitle="Download a full backup of your records"
            onPress={() => {}} C={C} />
          <Row icon="document-text-outline" iconBg={C.tealLight} iconColor={C.teal}
            label="Export as CSV" subtitle="Spreadsheet-compatible format"
            onPress={() => {}} last C={C} />
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, gap: 10 }]}>
          <TouchableOpacity
            style={[s.acctBtn, { backgroundColor: C.primary }]}
            onPress={() => setShowSignOutConfirm(true)}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <Text style={s.acctBtnTextWhite}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.acctBtnOutline, { borderColor: "#ef4444" }]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={[s.acctBtnTextRed]}>Delete All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[s.footer, { color: C.textMuted }]}>HaulLedger v1.0.0</Text>
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete All Data"
        message="This will permanently delete all your records including expenses, income, trips and fuel logs. This cannot be undone."
        confirmText="Delete All"
        destructive
        onConfirm={() => { setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        destructive
        onConfirm={() => { setShowSignOutConfirm(false); }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 110, gap: 0 },
    pageTitle: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: "700", color: C.textMuted, letterSpacing: 0.6, marginTop: 22, marginBottom: 8, marginLeft: 4 },
    card: { borderRadius: 16, borderWidth: 1, padding: 16 },

    profileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
    profileInfo: { flex: 1, gap: 3 },
    profileName: { fontSize: 17, fontWeight: "700" },
    profileEmail: { fontSize: 13 },
    authBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
    authBadgeText: { fontSize: 11, fontWeight: "700" },

    goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    goalIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    goalText: { flex: 1 },
    goalLabel: { fontSize: 14, fontWeight: "600" },
    goalSub: { fontSize: 12, marginTop: 1 },
    goalInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, width: 68 },
    saveBtn: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
    saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    prefRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
    prefLabel: { flex: 1, fontSize: 15, fontWeight: "600" },

    acctBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, borderRadius: 12, paddingVertical: 13,
    },
    acctBtnTextWhite: { color: "#fff", fontSize: 15, fontWeight: "700" },
    acctBtnOutline: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12,
    },
    acctBtnTextRed: { color: "#ef4444", fontSize: 15, fontWeight: "600" },

    footer: { fontSize: 12, textAlign: "center", marginTop: 28 },
  });
}
