import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { SwipeableRow } from "@/components/SwipeableRow";
import {
  useAssets, useDeleteAsset,
  useSavedRoutes, useDeleteSavedRoute,
  useFuelEntries, useDeleteFuelEntry,
  useTrips, useDeleteTrip,
  useQuickExpenses, useDeleteQuickExpense,
} from "@/hooks/useApi";
import { useAppContext } from "@/context/AppContext";
import { FormInput } from "@/components/FormInput";

type Section = "fleet" | "fuel" | "trips" | "routes" | "settings";

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useAppContext();

  const [activeSection, setActiveSection] = useState<Section>("fleet");
  const [mileageGoalInput, setMileageGoalInput] = useState(settings.mileageGoal.toString());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: assets, isLoading: loadingAssets } = useAssets();
  const deleteAsset = useDeleteAsset();
  const { data: savedRoutes, isLoading: loadingRoutes } = useSavedRoutes();
  const deleteSavedRoute = useDeleteSavedRoute();
  const { data: fuel, isLoading: loadingFuel } = useFuelEntries();
  const deleteFuel = useDeleteFuelEntry();
  const { data: trips, isLoading: loadingTrips } = useTrips();
  const deleteTrip = useDeleteTrip();
  const { data: quickExpenses, isLoading: loadingQuick } = useQuickExpenses();
  const deleteQuickExp = useDeleteQuickExpense();

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "fleet", label: "Fleet", icon: "truck" },
    { key: "fuel", label: "Fuel Log", icon: "droplet" },
    { key: "trips", label: "Trips", icon: "map" },
    { key: "routes", label: "Routes", icon: "navigation" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  const confirmDelete = (label: string, onConfirm: () => void) => {
    Alert.alert(`Delete ${label}`, `Remove this ${label.toLowerCase()}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <ThemedText weight="bold" style={styles.title}>
          More
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScroll}
        >
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navBtn,
                {
                  backgroundColor: activeSection === item.key ? theme.primary : theme.card,
                  borderColor: activeSection === item.key ? theme.primary : theme.cardBorder,
                },
              ]}
              onPress={() => setActiveSection(item.key)}
            >
              <Feather
                name={item.icon as any}
                size={16}
                color={activeSection === item.key ? "#fff" : theme.textSecondary}
              />
              <ThemedText
                weight="medium"
                style={[
                  styles.navLabel,
                  { color: activeSection === item.key ? "#fff" : theme.textSecondary },
                ]}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPad + 100,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeSection === "fleet" ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText weight="semibold" style={styles.sectionTitle}>
                Fleet Assets
              </ThemedText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/add-asset")}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {loadingAssets ? (
              <ActivityIndicator color={theme.primary} />
            ) : assets?.length === 0 ? (
              <ThemedText variant="muted" style={styles.emptyText}>
                No assets yet. Add your first truck or trailer.
              </ThemedText>
            ) : (
              assets?.map((asset: any) => (
                <SwipeableRow key={asset.id} onDelete={() => confirmDelete("Asset", () => deleteAsset.mutate(asset.id))}>
                  <Card style={styles.assetCard}>
                    <View style={styles.assetRow}>
                      <View style={[styles.assetIcon, { backgroundColor: theme.primary + "22" }]}>
                        <Feather
                          name={asset.type === "Truck" ? "truck" : "box"}
                          size={18}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.assetInfo}>
                        <ThemedText weight="semibold" style={styles.assetName}>
                          {asset.year} {asset.make} {asset.model}
                        </ThemedText>
                        <ThemedText variant="muted" style={styles.assetMeta}>
                          {asset.type} · {asset.plate} · {asset.vin}
                        </ThemedText>
                        {asset.type === "Truck" ? (
                          <ThemedText variant="secondary" style={styles.assetMiles}>
                            {asset.totalMiles?.toLocaleString() ?? 0} total miles
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </SwipeableRow>
              ))
            )}
          </>
        ) : activeSection === "fuel" ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText weight="semibold" style={styles.sectionTitle}>
                Fuel Log
              </ThemedText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/add-fuel")}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {loadingFuel ? (
              <ActivityIndicator color={theme.primary} />
            ) : fuel?.length === 0 ? (
              <ThemedText variant="muted" style={styles.emptyText}>
                No fuel entries yet
              </ThemedText>
            ) : (
              fuel?.map((entry: any) => (
                <SwipeableRow key={entry.id} onDelete={() => confirmDelete("Fuel Entry", () => deleteFuel.mutate(entry.id))}>
                  <Card style={styles.fuelCard}>
                    <View style={styles.fuelRow}>
                      <View style={[styles.fuelIcon, { backgroundColor: theme.primary + "22" }]}>
                        <Feather name="droplet" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.fuelInfo}>
                        <ThemedText weight="semibold">{entry.vendor}</ThemedText>
                        <ThemedText variant="muted" style={styles.fuelMeta}>
                          {entry.gallons.toFixed(1)} gal · ${entry.pricePerGallon?.toFixed(3)}/gal · {entry.jurisdiction}
                        </ThemedText>
                        <ThemedText variant="muted" style={styles.fuelDate}>{entry.date}</ThemedText>
                      </View>
                      <ThemedText variant="red" weight="bold" style={styles.fuelAmount}>
                        -{formatCurrency(entry.totalAmount)}
                      </ThemedText>
                    </View>
                  </Card>
                </SwipeableRow>
              ))
            )}
          </>
        ) : activeSection === "trips" ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText weight="semibold" style={styles.sectionTitle}>
                Trip Log
              </ThemedText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/add-trip")}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {loadingTrips ? (
              <ActivityIndicator color={theme.primary} />
            ) : trips?.length === 0 ? (
              <ThemedText variant="muted" style={styles.emptyText}>
                No trips yet
              </ThemedText>
            ) : (
              trips?.map((trip: any) => (
                <SwipeableRow key={trip.id} onDelete={() => confirmDelete("Trip", () => deleteTrip.mutate(trip.id))}>
                  <Card style={styles.tripCard}>
                    <View style={styles.tripRow}>
                      <View style={[styles.tripIcon, { backgroundColor: theme.green + "22" }]}>
                        <Feather name="map" size={18} color={theme.green} />
                      </View>
                      <View style={styles.tripInfo}>
                        <ThemedText weight="semibold" style={styles.tripDate}>{trip.date}</ThemedText>
                        <ThemedText variant="muted" style={styles.tripMeta}>
                          {trip.jurisdiction} · Loaded: {trip.loadedMiles} mi · Empty: {trip.emptyMiles} mi
                        </ThemedText>
                        <ThemedText variant="secondary" style={styles.tripOdo}>
                          {trip.startOdometer?.toLocaleString()} → {trip.endOdometer?.toLocaleString()} mi
                        </ThemedText>
                      </View>
                    </View>
                  </Card>
                </SwipeableRow>
              ))
            )}
          </>
        ) : activeSection === "routes" ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText weight="semibold" style={styles.sectionTitle}>
                Saved Routes
              </ThemedText>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push("/add-route")}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {loadingRoutes ? (
              <ActivityIndicator color={theme.primary} />
            ) : savedRoutes?.length === 0 ? (
              <ThemedText variant="muted" style={styles.emptyText}>
                No saved routes yet
              </ThemedText>
            ) : (
              savedRoutes?.map((route: any) => (
                <SwipeableRow key={route.id} onDelete={() => confirmDelete("Route", () => deleteSavedRoute.mutate(route.id))}>
                  <Card style={styles.routeCard}>
                    <View style={styles.routeRow}>
                      <View style={[styles.routeIcon, { backgroundColor: theme.primary + "22" }]}>
                        <Feather name="navigation" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.routeInfo}>
                        <ThemedText weight="semibold">{route.name}</ThemedText>
                        <ThemedText variant="muted" style={styles.routeStops}>
                          {route.origin} → {route.destination}
                        </ThemedText>
                      </View>
                      <ThemedText variant="green" weight="bold" style={styles.routeRate}>
                        {formatCurrency(route.standardRate)}
                      </ThemedText>
                    </View>
                  </Card>
                </SwipeableRow>
              ))
            )}
          </>
        ) : (
          <>
            <ThemedText weight="semibold" style={styles.sectionTitle}>
              Settings
            </ThemedText>

            <Card style={styles.settingsCard}>
              <ThemedText weight="semibold" style={styles.settingsSection}>
                Weekly Mileage Goal
              </ThemedText>
              <FormInput
                label="Target Miles Per Week"
                value={mileageGoalInput}
                onChangeText={setMileageGoalInput}
                keyboardType="numeric"
                onBlur={() => {
                  const val = parseInt(mileageGoalInput);
                  if (!isNaN(val) && val > 0) {
                    updateSettings({ mileageGoal: val });
                  }
                }}
              />
            </Card>

            <Card style={styles.settingsCard}>
              <ThemedText weight="semibold" style={styles.settingsSection}>
                Quick Expense Shortcuts
              </ThemedText>
              <TouchableOpacity
                style={[styles.settingsBtn, { borderColor: theme.cardBorder }]}
                onPress={() => router.push("/add-route")}
              >
                <Feather name="plus" size={16} color={theme.primary} />
                <ThemedText variant="primary" weight="medium">
                  Manage Quick Expenses
                </ThemedText>
              </TouchableOpacity>
              {loadingQuick ? null : quickExpenses?.map((item: any) => (
                <SwipeableRow key={item.id} onDelete={() => deleteQuickExp.mutate(item.id)}>
                  <View style={[styles.quickItem, { borderColor: theme.separator }]}>
                    <ThemedText weight="medium">{item.label}</ThemedText>
                    <ThemedText variant="muted" style={styles.quickMeta}>
                      {item.category} · ${item.defaultAmount}
                    </ThemedText>
                  </View>
                </SwipeableRow>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, marginBottom: 12 },
  navScroll: { gap: 8, paddingBottom: 12 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  navLabel: { fontSize: 13 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 14, marginBottom: 16 },
  assetCard: { padding: 14, marginBottom: 8 },
  assetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  assetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 15 },
  assetMeta: { fontSize: 12, marginTop: 2 },
  assetMiles: { fontSize: 12, marginTop: 2 },
  fuelCard: { padding: 14, marginBottom: 8 },
  fuelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fuelIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  fuelInfo: { flex: 1 },
  fuelMeta: { fontSize: 12, marginTop: 2 },
  fuelDate: { fontSize: 12, marginTop: 2 },
  fuelAmount: { fontSize: 16 },
  tripCard: { padding: 14, marginBottom: 8 },
  tripRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  tripInfo: { flex: 1 },
  tripDate: { fontSize: 15 },
  tripMeta: { fontSize: 12, marginTop: 2 },
  tripOdo: { fontSize: 12, marginTop: 2 },
  routeCard: { padding: 14, marginBottom: 8 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  routeInfo: { flex: 1 },
  routeStops: { fontSize: 13, marginTop: 2 },
  routeRate: { fontSize: 16 },
  settingsCard: { marginBottom: 16 },
  settingsSection: { fontSize: 15, marginBottom: 16 },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  quickItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  quickMeta: { fontSize: 12, marginTop: 2 },
});
