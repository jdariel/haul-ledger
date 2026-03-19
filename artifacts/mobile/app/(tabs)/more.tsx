import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

type MoreView = "main" | "settings";

interface MenuItemProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  C: typeof Colors.light;
}

function MenuItem({ icon, iconBg, iconColor, title, subtitle, onPress, C }: MenuItemProps) {
  const s = itemStyles(C);
  return (
    <TouchableOpacity style={s.item} onPress={onPress}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={s.itemText}>
        <Text style={s.itemTitle}>{title}</Text>
        <Text style={s.itemSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  );
}

function itemStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
    },
    iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    itemText: { flex: 1 },
    itemTitle: { fontSize: 15, fontWeight: "600", color: C.text },
    itemSubtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [view, setView] = useState<MoreView>("main");
  const [mileTarget, setMileTarget] = useState("");
  const [lightMode, setLightMode] = useState(colorScheme !== "dark");

  const s = makeStyles(C);

  const handleDeleteAll = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently delete all your records. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete All", style: "destructive", onPress: () => {} },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => {} },
    ]);
  };

  if (view === "settings") {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => setView("main")}>
            <Ionicons name="chevron-back" size={18} color={C.primary} />
            <Text style={[s.backText, { color: C.primary }]}>More</Text>
          </TouchableOpacity>

          <Text style={s.pageTitle}>Settings</Text>
          <Text style={s.pageSubtitle}>Manage your account and preferences.</Text>

          {/* Profile */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Profile</Text>
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              {/* Avatar */}
              <View style={s.avatarRow}>
                <View style={[s.avatar, { backgroundColor: C.primary }]}>
                  <Text style={s.avatarText}>DA</Text>
                </View>
                <View style={s.avatarInfo}>
                  <Text style={[s.avatarName, { color: C.text }]}>Dariel Jimenez</Text>
                  <Text style={[s.avatarEmail, { color: C.textSecondary }]}>jimenezdariel16@gmail.com</Text>
                </View>
              </View>
              <View style={[s.divider, { backgroundColor: C.separator }]} />
              <View style={s.profileRow}>
                <View style={s.profileLabel}>
                  <Ionicons name="person-outline" size={15} color={C.textMuted} />
                  <Text style={[s.profileKey, { color: C.textSecondary }]}>Name</Text>
                </View>
                <Text style={[s.profileVal, { color: C.text }]}>Dariel Jimenez</Text>
              </View>
              <View style={s.profileRow}>
                <View style={s.profileLabel}>
                  <Ionicons name="mail-outline" size={15} color={C.textMuted} />
                  <Text style={[s.profileKey, { color: C.textSecondary }]}>Email</Text>
                </View>
                <Text style={[s.profileVal, { color: C.text }]}>jimenezdariel16@gmail.com</Text>
              </View>
              <View style={s.profileRow}>
                <View style={s.profileLabel}>
                  <Ionicons name="shield-outline" size={15} color={C.textMuted} />
                  <Text style={[s.profileKey, { color: C.textSecondary }]}>Auth</Text>
                </View>
                <Text style={[s.profileVal, { color: C.text }]}>Replit</Text>
              </View>
              <View style={[s.profileRow, { borderBottomWidth: 0 }]}>
                <View style={s.profileLabel}>
                  <Ionicons name="sunny-outline" size={15} color={C.textMuted} />
                  <Text style={[s.profileKey, { color: C.textSecondary }]}>Appearance</Text>
                </View>
                <View style={s.profileValRow}>
                  <Text style={[s.profileVal, { color: C.text }]}>Light</Text>
                  <Switch
                    value={lightMode}
                    onValueChange={setLightMode}
                    trackColor={{ true: C.primary, false: C.separator }}
                    thumbColor="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Goals */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Goals</Text>
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <View style={s.goalRow}>
                <View style={[s.goalIcon, { backgroundColor: C.tealLight }]}>
                  <Ionicons name="navigate" size={18} color={C.teal} />
                </View>
                <View style={s.goalInfo}>
                  <Text style={[s.goalTitle, { color: C.text }]}>Weekly Miles Target</Text>
                  <Text style={[s.goalSubtitle, { color: C.textSecondary }]}>Track progress on your dashboard</Text>
                </View>
                <TextInput
                  style={[s.goalInput, { borderColor: C.separator, color: C.text }]}
                  placeholder="e.g. 2500"
                  placeholderTextColor={C.textMuted}
                  value={mileTarget}
                  onChangeText={setMileTarget}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={[s.saveBtn, { borderColor: C.separator }]}>
                  <Text style={[s.saveBtnText, { color: C.text }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tools */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Tools</Text>
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0 }]}>
              <MenuItem
                icon="car-outline"
                iconBg={C.tealLight}
                iconColor={C.teal}
                title="Fleet"
                subtitle="Manage your trucks and trailers"
                onPress={() => router.push("/add-asset")}
                C={C}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 }]}>More</Text>

        {/* Menu Items */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator, padding: 0, marginHorizontal: 16 }]}>
          <MenuItem
            icon="map-outline"
            iconBg={C.primaryLight}
            iconColor={C.primary}
            title="Trips"
            subtitle="Log trips and track mileage"
            onPress={() => router.push("/add-trip")}
            C={C}
          />
          <MenuItem
            icon="flame-outline"
            iconBg={C.orangeLight}
            iconColor={C.orange}
            title="Fuel Log"
            subtitle="Track fuel purchases for IFTA"
            onPress={() => router.push("/fuel-log")}
            C={C}
          />
          <MenuItem
            icon="git-merge-outline"
            iconBg={C.tealLight}
            iconColor={C.teal}
            title="Saved Routes"
            subtitle="Manage your route templates for quick income logging"
            onPress={() => router.push("/add-route")}
            C={C}
          />
          <MenuItem
            icon="bar-chart-outline"
            iconBg={C.greenLight}
            iconColor={C.green}
            title="Reports"
            subtitle="View financial reports and export data"
            onPress={() => router.push("/(tabs)/reports")}
            C={C}
          />
          <MenuItem
            icon="flash-outline"
            iconBg="#fef9c3"
            iconColor="#ca8a04"
            title="Quick Add"
            subtitle="Save common expenses to log in one tap"
            onPress={() => {}}
            C={C}
          />
        </View>

        {/* Account Section */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
            <TouchableOpacity style={[s.acctBtn, { borderColor: C.separator }]}>
              <Ionicons name="download-outline" size={16} color={C.text} />
              <Text style={[s.acctBtnText, { color: C.text }]}>Export All Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.acctBtn, { borderColor: C.separator }]}>
              <Ionicons name="document-text-outline" size={16} color={C.text} />
              <Text style={[s.acctBtnText, { color: C.text }]}>Export as CSV</Text>
            </TouchableOpacity>
            <View style={[s.infoBox, { backgroundColor: C.background, borderColor: C.separator }]}>
              <Ionicons name="information-circle-outline" size={14} color={C.textSecondary} style={{ marginTop: 1 }} />
              <Text style={[s.infoText, { color: C.textSecondary }]}>
                We recommend exporting your data monthly. Your records are stored securely, but a local backup is always a good idea.
              </Text>
            </View>
            <TouchableOpacity style={[s.signOutBtn]} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={s.signOutText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.deleteBtn, { borderColor: "#ef4444" }]} onPress={handleDeleteAll}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={s.deleteBtnText}>Delete All Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Link */}
        <TouchableOpacity
          style={[s.settingsLink, { backgroundColor: C.card, borderColor: C.separator }]}
          onPress={() => setView("settings")}
        >
          <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          <Text style={[s.settingsLinkText, { color: C.text }]}>Settings</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    pageTitle: { fontSize: 26, fontWeight: "800", color: C.text },
    pageSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 2, paddingHorizontal: 20, marginBottom: 20 },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    backText: { fontSize: 16, fontWeight: "500" },
    sectionBlock: { paddingHorizontal: 16, marginTop: 20 },
    sectionLabel: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 10 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
    },
    divider: { height: 1, marginVertical: 8 },
    avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
    avatar: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
    avatarInfo: { flex: 1 },
    avatarName: { fontSize: 17, fontWeight: "700" },
    avatarEmail: { fontSize: 13, marginTop: 2 },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.separator,
    },
    profileLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
    profileKey: { fontSize: 14 },
    profileVal: { fontSize: 14, fontWeight: "500" },
    profileValRow: { flexDirection: "row", alignItems: "center" },
    goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    goalIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    goalInfo: { flex: 1 },
    goalTitle: { fontSize: 14, fontWeight: "600" },
    goalSubtitle: { fontSize: 12, marginTop: 2 },
    goalInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 13,
      width: 70,
    },
    saveBtn: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    saveBtnText: { fontSize: 13, fontWeight: "600" },
    acctBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
    },
    acctBtnText: { fontSize: 14, fontWeight: "600" },
    infoBox: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "flex-start",
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
    signOutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#ef4444",
      borderRadius: 10,
      paddingVertical: 12,
    },
    signOutText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
    },
    deleteBtnText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
    settingsLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    settingsLinkText: { fontSize: 15, fontWeight: "600" },
  });
}
