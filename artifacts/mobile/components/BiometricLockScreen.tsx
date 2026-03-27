import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Props {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    triggerAuth();
  }, []);

  const triggerAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        onUnlock();
        return;
      }

      // Explicitly request Face ID / biometric permission on iOS
      const { granted } = await LocalAuthentication.requestPermissionsAsync();
      if (!granted) {
        // Permission denied — fall back to passcode unlock via device fallback
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock HaulLedger",
          disableDeviceFallback: false,
          fallbackLabel: "Use Passcode",
        });
        if (result.success) onUnlock();
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        onUnlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock HaulLedger",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      });
      if (result.success) {
        onUnlock();
      }
    } catch {
      // If the API is unavailable (simulator, web), unlock immediately
      onUnlock();
    }
  };

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim, backgroundColor: C.background }]}>
      <View style={s.inner}>
        <View style={[s.iconRing, { backgroundColor: C.primary + "18", borderColor: C.primary + "40" }]}>
          <Ionicons name="lock-closed" size={40} color={C.primary} />
        </View>
        <Text style={[s.title, { color: C.text }]}>HaulLedger Locked</Text>
        <Text style={[s.sub, { color: C.textSecondary }]}>
          Authenticate to access your financial data
        </Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: C.primary }]}
          onPress={triggerAuth}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print" size={20} color="#fff" />
          <Text style={s.btnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
