import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, RefreshControl, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  useFleet, useFleetOverview, useCreateFleet, useJoinFleet,
  useLeaveFleet, useDeleteFleet, useRemoveFleetMember,
  useAssets, useDeleteAsset,
} from "@/hooks/useApi";

type Tab = "fleet" | "assets";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function StatCard({ label, value, icon, color, C }: any) {
  return (
    <View style={[sc.card, { backgroundColor: C.background, borderColor: C.separator }]}>
      <View style={[sc.iconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[sc.val, { color: C.text }]}>{value}</Text>
      <Text style={[sc.lbl, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 3, minWidth: 80 },
  iconBox: { width: 30, height: 30, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  val: { fontSize: 13, fontWeight: "700" },
  lbl: { fontSize: 10, textAlign: "center" },
});

export default function FleetScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const s = makeStyles(C);

  const [tab, setTab] = useState<Tab>("fleet");
  const [fleetName, setFleetName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [refreshing, setRefreshing] = useState(false);

  const { data: fleet, isLoading: fleetLoading, refetch: refetchFleet } = useFleet();
  const { data: overview, refetch: refetchOverview } = useFleetOverview();
  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = useAssets();
  const createFleet = useCreateFleet();
  const joinFleet = useJoinFleet();
  const leaveFleet = useLeaveFleet();
  const deleteFleet = useDeleteFleet();
  const removeMember = useRemoveFleetMember();
  const deleteAsset = useDeleteAsset();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFleet(), refetchOverview(), refetchAssets()]);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!fleetName.trim()) return Alert.alert("Validation", "Enter a fleet name.");
    try {
      await createFleet.mutateAsync(fleetName.trim());
      setFleetName("");
      setMode("none");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create fleet.");
    }
  };

  const handleJoin = async () => {
    if (!inviteInput.trim()) return Alert.alert("Validation", "Enter an invite code.");
    try {
      await joinFleet.mutateAsync(inviteInput.trim().toUpperCase());
      setInviteInput("");
      setMode("none");
      Alert.alert("Joined!", "You are now part of the fleet.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to join fleet.");
    }
  };

  const handleShare = async () => {
    if (!fleet?.inviteCode) return;
    await Share.share({ message: `Join my HaulLedger fleet with code: ${fleet.inviteCode}` });
  };

  const handleLeave = () => {
    Alert.alert("Leave Fleet", "Are you sure you want to leave this fleet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: async () => {
          try { await leaveFleet.mutateAsync(); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete Fleet", "This will remove all members and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteFleet.mutateAsync(); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const handleRemove = (userId: number, name: string) => {
    Alert.alert("Remove Driver", `Remove ${name} from the fleet?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await removeMember.mutateAsync(userId); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const handleDeleteAsset = (id: number, name: string) => {
    Alert.alert("Delete Asset", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteAsset.mutateAsync(id); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const isLoading = fleetLoading || assetsLoading;

  if (isLoading) {
    return (
      <View style={[s.root, { justifyContent: "center", alignItems: "center", backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.text }]}>Fleet & Assets</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab toggle */}
      <View style={[s.tabRow, { backgroundColor: C.card, borderColor: C.separator }]}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "fleet" && { backgroundColor: C.primary }]}
          onPress={() => setTab("fleet")}
        >
          <Ionicons name="bus-outline" size={15} color={tab === "fleet" ? "#fff" : C.textSecondary} />
          <Text style={[s.tabBtnText, { color: tab === "fleet" ? "#fff" : C.textSecondary }]}>Fleet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "assets" && { backgroundColor: C.primary }]}
          onPress={() => setTab("assets")}
        >
          <Ionicons name="car-outline" size={15} color={tab === "assets" ? "#fff" : C.textSecondary} />
          <Text style={[s.tabBtnText, { color: tab === "assets" ? "#fff" : C.textSecondary }]}>Assets</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* ───── FLEET TAB ───── */}
        {tab === "fleet" && (
          <>
            {!fleet ? (
              /* No fleet */
              <>
                <View style={s.heroBlock}>
                  <View style={[s.heroIcon, { backgroundColor: C.primary + "18", borderColor: C.primary + "30" }]}>
                    <Ionicons name="bus-outline" size={36} color={C.primary} />
                  </View>
                  <Text style={[s.heroTitle, { color: C.text }]}>Fleet Management</Text>
                  <Text style={[s.heroSub, { color: C.textSecondary }]}>
                    Create a fleet to manage multiple drivers, or join an existing fleet with an invite code.
                  </Text>
                </View>

                {mode === "none" && (
                  <View style={s.btnRow}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.primary }]} onPress={() => setMode("create")}>
                      <Ionicons name="add-circle-outline" size={20} color="#fff" />
                      <Text style={s.actionBtnText}>Create Fleet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.separator }]} onPress={() => setMode("join")}>
                      <Ionicons name="enter-outline" size={20} color={C.primary} />
                      <Text style={[s.actionBtnText, { color: C.primary }]}>Join Fleet</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {mode === "create" && (
                  <View style={[s.formCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                    <Text style={[s.formTitle, { color: C.text }]}>Create a Fleet</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: C.separator, color: C.text }]}
                      placeholder="Fleet name (e.g. Martinez Trucking)"
                      placeholderTextColor={C.textMuted}
                      value={fleetName}
                      onChangeText={setFleetName}
                      autoFocus
                    />
                    <View style={s.formBtns}>
                      <TouchableOpacity style={[s.formBtn, { borderColor: C.separator, borderWidth: 1 }]} onPress={() => setMode("none")}>
                        <Text style={[s.formBtnText, { color: C.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.formBtn, { backgroundColor: C.primary }]} onPress={handleCreate} disabled={createFleet.isPending}>
                        {createFleet.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.formBtnText, { color: "#fff" }]}>Create</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {mode === "join" && (
                  <View style={[s.formCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                    <Text style={[s.formTitle, { color: C.text }]}>Join a Fleet</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: C.separator, color: C.text }]}
                      placeholder="Enter invite code (e.g. A1B2C3D4)"
                      placeholderTextColor={C.textMuted}
                      value={inviteInput}
                      onChangeText={setInviteInput}
                      autoCapitalize="characters"
                      autoFocus
                    />
                    <View style={s.formBtns}>
                      <TouchableOpacity style={[s.formBtn, { borderColor: C.separator, borderWidth: 1 }]} onPress={() => setMode("none")}>
                        <Text style={[s.formBtnText, { color: C.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.formBtn, { backgroundColor: C.primary }]} onPress={handleJoin} disabled={joinFleet.isPending}>
                        {joinFleet.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.formBtnText, { color: "#fff" }]}>Join</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : fleet.role === "driver" ? (
              /* Driver view */
              <>
                <View style={[s.fleetCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <View style={s.fleetIconRow}>
                    <View style={[s.fleetBadge, { backgroundColor: C.primary + "18" }]}>
                      <Ionicons name="bus" size={22} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fleetName, { color: C.text }]}>{fleet.name}</Text>
                      <Text style={[s.fleetRole, { color: C.textSecondary }]}>Your role: Driver</Text>
                    </View>
                  </View>
                </View>

                <View style={[s.codeCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <Text style={[s.codeLabel, { color: C.textSecondary }]}>Fleet Invite Code</Text>
                  <Text style={[s.codeValue, { color: C.primary }]}>{fleet.inviteCode}</Text>
                  <TouchableOpacity style={[s.shareBtn, { backgroundColor: C.primary + "18" }]} onPress={handleShare}>
                    <Ionicons name="share-outline" size={16} color={C.primary} />
                    <Text style={[s.shareBtnText, { color: C.primary }]}>Share Code</Text>
                  </TouchableOpacity>
                </View>

                <View style={[s.section, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <Text style={[s.sectionTitle, { color: C.text }]}>Drivers in Fleet</Text>
                  {fleet.members?.map((m: any, i: number) => (
                    <View key={m.userId} style={[s.memberRow, i < fleet.members.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.separator }]}>
                      <View style={[s.avatar, { backgroundColor: C.primary + "20" }]}>
                        <Text style={[s.avatarText, { color: C.primary }]}>{m.name?.[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.memberName, { color: C.text }]}>{m.name}</Text>
                        <Text style={[s.memberRole, { color: C.textSecondary }]}>{m.role === "owner" ? "Fleet Owner" : "Driver"}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={[s.dangerBtn, { borderColor: "#ef4444" }]} onPress={handleLeave}>
                  <Ionicons name="exit-outline" size={18} color="#ef4444" />
                  <Text style={[s.dangerBtnText, { color: "#ef4444" }]}>Leave Fleet</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Owner view */
              <>
                <View style={[s.fleetCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <View style={s.fleetIconRow}>
                    <View style={[s.fleetBadge, { backgroundColor: C.primary + "18" }]}>
                      <Ionicons name="bus" size={22} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fleetName, { color: C.text }]}>{fleet.name}</Text>
                      <Text style={[s.fleetRole, { color: C.textSecondary }]}>Fleet Owner · {fleet.members?.length ?? 0} members</Text>
                    </View>
                  </View>
                </View>

                <View style={[s.codeCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <Text style={[s.codeLabel, { color: C.textSecondary }]}>Invite Code</Text>
                  <Text style={[s.codeValue, { color: C.primary }]}>{fleet.inviteCode}</Text>
                  <TouchableOpacity style={[s.shareBtn, { backgroundColor: C.primary + "18" }]} onPress={handleShare}>
                    <Ionicons name="share-outline" size={16} color={C.primary} />
                    <Text style={[s.shareBtnText, { color: C.primary }]}>Share with Drivers</Text>
                  </TouchableOpacity>
                </View>

                {overview && (
                  <>
                    <Text style={[s.overviewHeading, { color: C.text }]}>Drivers</Text>
                    {overview.members?.map((driver: any) => (
                      <View key={driver.userId} style={[s.driverCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                        {/* Driver header */}
                        <View style={s.driverHeader}>
                          <View style={[s.avatar, { backgroundColor: C.primary + "20" }]}>
                            <Text style={[s.avatarText, { color: C.primary }]}>{driver.name?.[0]?.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.memberName, { color: C.text }]}>{driver.name}</Text>
                            <Text style={[s.memberRole, { color: C.textSecondary }]}>{driver.role === "owner" ? "You (Owner)" : "Driver"}</Text>
                          </View>
                          {driver.role === "driver" && (
                            <TouchableOpacity onPress={() => handleRemove(driver.userId, driver.name)} style={s.removeBtn}>
                              <Ionicons name="person-remove-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Stats */}
                        <View style={s.statsRow}>
                          <StatCard label="Income" value={fmt(driver.income.total)} icon="trending-up" color="#22c55e" C={C} />
                          <StatCard label="Expenses" value={fmt(driver.expenses.total)} icon="receipt-outline" color="#ef4444" C={C} />
                          <StatCard label="Trips" value={String(driver.trips)} icon="navigate-outline" color={C.primary} C={C} />
                        </View>

                        {/* Owner action buttons */}
                        <View style={[s.addActionsRow, { borderTopColor: C.separator }]}>
                          <TouchableOpacity
                            style={[s.addActionBtn, { backgroundColor: "#ef444418", borderColor: "#ef444430" }]}
                            onPress={() => router.push({ pathname: "/add-expense", params: { forUserId: String(driver.userId), driverName: driver.name } })}
                          >
                            <Ionicons name="receipt-outline" size={14} color="#ef4444" />
                            <Text style={[s.addActionText, { color: "#ef4444" }]}>Add Expense</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.addActionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e30" }]}
                            onPress={() => router.push({ pathname: "/add-income", params: { forUserId: String(driver.userId), driverName: driver.name } })}
                          >
                            <Ionicons name="trending-up-outline" size={14} color="#22c55e" />
                            <Text style={[s.addActionText, { color: "#22c55e" }]}>Add Income</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.addActionBtn, { backgroundColor: C.primary + "18", borderColor: C.primary + "30" }]}
                            onPress={() => router.push({ pathname: "/add-trip", params: { forUserId: String(driver.userId), driverName: driver.name } })}
                          >
                            <Ionicons name="navigate-outline" size={14} color={C.primary} />
                            <Text style={[s.addActionText, { color: C.primary }]}>Add Trip</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Recent expenses */}
                        {driver.recentExpenses?.length > 0 && (
                          <View style={[s.recentBox, { borderTopColor: C.separator }]}>
                            <Text style={[s.recentLabel, { color: C.textSecondary }]}>Recent expenses</Text>
                            {driver.recentExpenses.map((e: any) => (
                              <View key={e.id} style={s.recentRow}>
                                <Text style={[s.recentMerchant, { color: C.text }]} numberOfLines={1}>{e.merchant}</Text>
                                <Text style={[s.recentAmount, { color: "#ef4444" }]}>{fmt(e.amount)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}

                <TouchableOpacity style={[s.dangerBtn, { borderColor: "#ef4444" }]} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[s.dangerBtnText, { color: "#ef4444" }]}>Delete Fleet</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ───── ASSETS TAB ───── */}
        {tab === "assets" && (
          <>
            <View style={s.assetHeader}>
              <Text style={[s.overviewHeading, { color: C.text, marginBottom: 0 }]}>Trucks & Trailers</Text>
              <TouchableOpacity
                style={[s.addAssetBtn, { backgroundColor: C.primary }]}
                onPress={() => router.push("/add-asset")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.addAssetBtnText}>Add Asset</Text>
              </TouchableOpacity>
            </View>

            {!assets || assets.length === 0 ? (
              <View style={[s.emptyBox, { backgroundColor: C.card, borderColor: C.separator }]}>
                <Ionicons name="car-outline" size={32} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textSecondary }]}>No assets yet</Text>
                <Text style={[s.emptySub, { color: C.textMuted }]}>Add your trucks and trailers to track them here.</Text>
              </View>
            ) : (
              assets.map((asset: any) => (
                <View key={asset.id} style={[s.assetCard, { backgroundColor: C.card, borderColor: C.separator }]}>
                  <View style={[s.assetIcon, { backgroundColor: C.primary + "18" }]}>
                    <Ionicons
                      name={asset.type === "trailer" ? "train-outline" : "car-sport-outline"}
                      size={22}
                      color={C.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.assetName, { color: C.text }]}>{asset.name}</Text>
                    <Text style={[s.assetMeta, { color: C.textSecondary }]}>
                      {asset.type ?? "Truck"}{asset.year ? ` · ${asset.year}` : ""}{asset.licensePlate ? ` · ${asset.licensePlate}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteAsset(asset.id, asset.name)} style={s.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 },
    back: { width: 36, height: 36, justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700" },
    tabRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
    tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 9 },
    tabBtnText: { fontSize: 14, fontWeight: "600" },
    scroll: { paddingHorizontal: 16, gap: 12 },
    heroBlock: { alignItems: "center", gap: 12, paddingVertical: 16 },
    heroIcon: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: "center", alignItems: "center" },
    heroTitle: { fontSize: 22, fontWeight: "700" },
    heroSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    btnRow: { flexDirection: "row", gap: 12 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
    actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    formCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
    formTitle: { fontSize: 16, fontWeight: "700" },
    input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    formBtns: { flexDirection: "row", gap: 10 },
    formBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
    formBtnText: { fontSize: 15, fontWeight: "700" },
    fleetCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
    fleetIconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    fleetBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    fleetName: { fontSize: 17, fontWeight: "700" },
    fleetRole: { fontSize: 13, marginTop: 2 },
    codeCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
    codeLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
    codeValue: { fontSize: 28, fontWeight: "800", letterSpacing: 4 },
    shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    shareBtnText: { fontSize: 14, fontWeight: "600" },
    section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    sectionTitle: { fontSize: 14, fontWeight: "700", padding: 16, paddingBottom: 8 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
    avatarText: { fontSize: 15, fontWeight: "700" },
    memberName: { fontSize: 15, fontWeight: "600" },
    memberRole: { fontSize: 12, marginTop: 1 },
    overviewHeading: { fontSize: 16, fontWeight: "700" },
    driverCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    driverHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    removeBtn: { padding: 6 },
    statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
    addActionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
    addActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
    addActionText: { fontSize: 11, fontWeight: "700" },
    recentBox: { borderTopWidth: 1, padding: 12, gap: 6 },
    recentLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    recentRow: { flexDirection: "row", justifyContent: "space-between" },
    recentMerchant: { fontSize: 13, flex: 1, marginRight: 8 },
    recentAmount: { fontSize: 13, fontWeight: "600" },
    dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
    dangerBtnText: { fontSize: 15, fontWeight: "700" },
    assetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addAssetBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
    addAssetBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 15, fontWeight: "600" },
    emptySub: { fontSize: 13, textAlign: "center" },
    assetCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
    assetIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    assetName: { fontSize: 15, fontWeight: "600" },
    assetMeta: { fontSize: 12, marginTop: 2 },
  });
}
