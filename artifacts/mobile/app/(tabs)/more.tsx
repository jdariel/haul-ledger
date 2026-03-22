import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { exportCSV, exportJSON } from "@/lib/export";
import { registerPushToken, unregisterPushToken } from "@/lib/pushNotifications";
import Constants from "expo-constants";
import { Colors } from "@/constants/colors";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
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
  const { user, token, logout, deleteAccount, updateProfile } = useAuth();
  const isDark = settings.colorScheme === "dark";
  const [mileTarget, setMileTarget] = useState(String(settings.mileageGoal || ""));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "generic">("generic");
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setBiometricAvailable(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("face");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("fingerprint");
        }
      }
    })();
  }, []);

  const biometricLabel = biometricType === "face"
    ? "Face ID"
    : biometricType === "fingerprint"
    ? "Fingerprint"
    : "Biometric";

  const handleBiometricToggle = async (val: boolean) => {
    if (val && !biometricAvailable) {
      Alert.alert(
        "Not Available",
        "Biometric authentication is not set up on this device. Enable it in your device settings first."
      );
      return;
    }
    await updateSettings({ biometricLock: val });
  };

  const handleExportCSV = async () => {
    if (exporting) return;
    setExporting("csv");
    try {
      await exportCSV();
    } catch (e: unknown) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = async () => {
    if (exporting) return;
    setExporting("json");
    try {
      await exportJSON();
    } catch (e: unknown) {
      Alert.alert("Export Failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setExporting(null);
    }
  };

  const handleNotificationsToggle = async (val: boolean) => {
    if (!token) return;
    if (val) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "denied") {
        Alert.alert(
          "Notifications Blocked",
          "Notifications are disabled in your device settings. Open Settings and enable them for HaulLedger.",
          [{ text: "OK" }]
        );
        return;
      }
      await registerPushToken(token);
      const { status: afterStatus } = await Notifications.getPermissionsAsync();
      if (afterStatus !== "granted") return;
    } else {
      await unregisterPushToken(token);
    }
    await updateSettings({ notificationsEnabled: val });
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert("Validation", "Name must be at least 2 characters.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(editName.trim());
      setEditProfileVisible(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "??";

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
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: C.text }]}>{user?.name ?? "—"}</Text>
              <Text style={[s.profileEmail, { color: C.textSecondary }]}>{user?.email ?? ""}</Text>
              <View style={[s.authBadge, { backgroundColor: C.primary + "18" }]}>
                <Ionicons name="shield-checkmark" size={10} color={C.primary} />
                <Text style={[s.authBadgeText, { color: C.primary }]}>HaulLedger Account</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.editProfileBtn, { backgroundColor: C.background }]}
              onPress={() => { setEditName(user?.name ?? ""); setEditProfileVisible(true); }}
            >
              <Ionicons name="pencil-outline" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tools */}
        <Text style={s.sectionLabel}>Tools</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <Row icon="map-outline" iconBg={C.primaryLight} iconColor={C.primary}
            label="Trips" subtitle="Log trips and track mileage"
            onPress={() => router.push("/trips")} C={C} />
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
            onPress={() => router.push("/quick-add")} last C={C} />
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
            <View style={{ flex: 1 }}>
              <Text style={[s.prefLabel, { color: C.text }]}>Notifications</Text>
              <Text style={[{ fontSize: 12, color: C.textSecondary, marginTop: 1 }]}>
                {settings.notificationsEnabled ? "Push alerts enabled" : "Push alerts disabled"}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ true: C.primary, false: C.separator }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Security */}
        <Text style={s.sectionLabel}>Security</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <View style={s.prefRow}>
            <View style={[rowS.iconBox, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="finger-print" size={19} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.prefLabel, { color: C.text }]}>
                Require {biometricLabel}
              </Text>
              <Text style={[{ fontSize: 12, color: C.textSecondary, marginTop: 1 }]}>
                {biometricAvailable
                  ? "Lock app when returning from background"
                  : "Set up biometrics in device settings to enable"}
              </Text>
            </View>
            <Switch
              value={settings.biometricLock}
              onValueChange={handleBiometricToggle}
              trackColor={{ true: "#ef4444", false: C.separator }}
              thumbColor="#fff"
              disabled={!biometricAvailable && !settings.biometricLock}
            />
          </View>
        </View>

        {/* Data & Export */}
        <Text style={s.sectionLabel}>Data & Export</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <Row icon="download-outline" iconBg={C.primaryLight} iconColor={C.primary}
            label={exporting === "json" ? "Exporting…" : "Export All Data"}
            subtitle="Full backup as JSON — all records included"
            onPress={handleExportJSON} C={C} />
          <Row icon="document-text-outline" iconBg={C.tealLight} iconColor={C.teal}
            label={exporting === "csv" ? "Exporting…" : "Export as CSV"}
            subtitle="Expenses, income, fuel & trips as a spreadsheet"
            onPress={handleExportCSV} last C={C} />
        </View>

        {/* Legal */}
        <Text style={s.sectionLabel}>Legal</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
          <Row icon="document-text-outline" iconBg={C.primaryLight} iconColor={C.primary}
            label="Privacy Policy" subtitle="How we collect and use your data"
            onPress={() => router.push("/privacy-policy")} C={C} />
          <Row icon="shield-checkmark-outline" iconBg={C.tealLight} iconColor={C.teal}
            label="Terms of Service" subtitle="Rules for using HaulLedger"
            onPress={() => router.push("/terms-of-service")} last C={C} />
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0, marginBottom: 10 }]}>
          <Row
            icon="key-outline"
            iconBg={C.primaryLight}
            iconColor={C.primary}
            label="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push("/change-password")}
            last
            C={C}
          />
        </View>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, gap: 10 }]}>
          <TouchableOpacity
            style={[s.acctBtn, { backgroundColor: C.primary }]}
            onPress={() => setShowSignOutConfirm(true)}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <Text style={s.acctBtnTextWhite}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.acctBtnOutline, { borderColor: "#ef4444" }, deleting && { opacity: 0.5 }]}
            onPress={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            <Ionicons name="person-remove-outline" size={16} color="#ef4444" />
            <Text style={s.acctBtnTextRed}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[s.footer, { color: C.textMuted }]}>
          HaulLedger v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Account"
        message={`This will permanently delete your account and ALL associated data — expenses, income, trips, fuel logs, and everything else.\n\nThis action cannot be undone.`}
        confirmText={deleting ? "Deleting…" : "Delete My Account"}
        destructive
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          setDeleting(true);
          try {
            await deleteAccount();
          } catch (err: any) {
            setDeleting(false);
            Alert.alert("Deletion Failed", err.message || "Something went wrong. Please try again.");
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        destructive
        onConfirm={async () => { setShowSignOutConfirm(false); await logout(); }}
        onCancel={() => setShowSignOutConfirm(false)}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
            onPress={() => setEditProfileVisible(false)}
            activeOpacity={1}
          />
          <View style={[s.editSheet, { backgroundColor: C.card }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHdr}>
              <Text style={[s.sheetTitle, { color: C.text }]}>Edit Name</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[s.sheetSub, { color: C.textSecondary }]}>
              This is how your name appears on your account.
            </Text>
            <TextInput
              style={[s.sheetInput, { color: C.text, borderColor: C.separator, backgroundColor: C.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveProfile}
            />
            <TouchableOpacity
              style={[s.sheetSaveBtn, { backgroundColor: C.primary }, savingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.sheetSaveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    editProfileBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", alignSelf: "flex-start" },
    editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 4 },
    sheetHdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sheetTitle: { fontSize: 18, fontWeight: "700" },
    sheetSub: { fontSize: 13, lineHeight: 19 },
    sheetInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
    sheetSaveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
    sheetSaveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

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
