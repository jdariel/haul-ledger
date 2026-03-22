import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const APP_STORE_URL = "https://apps.apple.com/app/haul-ledger/id0000000000";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.haul.ledger";

interface Props {
  currentVersion: string;
  minVersion: string;
}

export function ForceUpdateScreen({ currentVersion, minVersion }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleUpdate = () => {
    const url = Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim, backgroundColor: C.background }]}>
      <View style={s.inner}>
        <View style={[s.iconRing, { backgroundColor: C.primary + "18", borderColor: C.primary + "40" }]}>
          <Ionicons name="arrow-up-circle" size={48} color={C.primary} />
        </View>

        <Text style={[s.title, { color: C.text }]}>Update Required</Text>

        <Text style={[s.body, { color: C.textSecondary }]}>
          This version of HaulLedger ({currentVersion}) is no longer supported.
          Please update to version {minVersion} or later to continue.
        </Text>

        <View style={[s.versionBadge, { backgroundColor: C.card, borderColor: C.separator }]}>
          <View style={s.versionRow}>
            <Text style={[s.versionLabel, { color: C.textMuted }]}>Your version</Text>
            <Text style={[s.versionValue, { color: "#ef4444" }]}>{currentVersion}</Text>
          </View>
          <View style={[s.versionDivider, { backgroundColor: C.separator }]} />
          <View style={s.versionRow}>
            <Text style={[s.versionLabel, { color: C.textMuted }]}>Required version</Text>
            <Text style={[s.versionValue, { color: C.green }]}>{minVersion}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: C.primary }]}
          onPress={handleUpdate}
          activeOpacity={0.85}
        >
          <Ionicons name="storefront-outline" size={18} color="#fff" />
          <Text style={s.btnText}>
            {Platform.OS === "ios" ? "Open App Store" : "Open Play Store"}
          </Text>
        </TouchableOpacity>

        <Text style={[s.note, { color: C.textMuted }]}>
          You can continue using the app after updating.
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  inner: {
    alignItems: "center",
    gap: 20,
    width: "100%",
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
  },
  versionBadge: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  versionDivider: { height: 1 },
  versionLabel: { fontSize: 13 },
  versionValue: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  note: { fontSize: 12, textAlign: "center" },
});
