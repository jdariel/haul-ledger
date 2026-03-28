import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat as KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors } from "@/constants/colors";
import { FormInput } from "@/components/FormInput";
import { useColorScheme } from "@/hooks/useColorScheme";
import { apiFetch } from "@/hooks/useApi";

export default function ChangePasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    setErrorMessage(null);

    if (!currentPassword.trim()) {
      return setErrorMessage("Please enter your current password.");
    }
    if (newPassword.length < 8) {
      return setErrorMessage("New password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setErrorMessage("New passwords do not match.");
    }
    if (currentPassword === newPassword) {
      return setErrorMessage("New password must be different from your current one.");
    }

    setLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      setTimeout(() => router.back(), 2000);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: C.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: C.text }]}>Change Password</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Icon block */}
        <View style={s.iconBlock}>
          <View style={[s.iconRing, { backgroundColor: C.primary + "18", borderColor: C.primary + "30" }]}>
            <Ionicons name="lock-closed-outline" size={32} color={C.primary} />
          </View>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Choose a strong password with at least 8 characters.
          </Text>
        </View>

        {/* Success banner */}
        {success && (
          <View style={[s.banner, s.bannerSuccess, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={[s.bannerText, { color: "#15803d" }]}>
              Password updated successfully! Taking you back…
            </Text>
          </View>
        )}

        {/* Error banner */}
        {errorMessage && !success && (
          <View style={[s.banner, s.bannerError, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={[s.bannerText, { color: "#dc2626" }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Form */}
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
          <FormInput
            label="Current Password"
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); setErrorMessage(null); }}
            placeholder="Enter your current password"
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            }
          />
          <View style={[s.divider, { backgroundColor: C.separator }]} />
          <FormInput
            label="New Password"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setErrorMessage(null); }}
            placeholder="At least 8 characters"
            secureTextEntry={!showNew}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            }
          />
          <View style={[s.divider, { backgroundColor: C.separator }]} />
          <FormInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setErrorMessage(null); }}
            placeholder="Repeat new password"
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            }
          />
        </View>

        {/* Strength hint */}
        {newPassword.length > 0 && (
          <View style={[s.hint, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Ionicons
              name={newPassword.length >= 8 ? "checkmark-circle" : "alert-circle-outline"}
              size={15}
              color={newPassword.length >= 8 ? C.green : C.orange}
            />
            <Text style={[s.hintText, { color: newPassword.length >= 8 ? C.green : C.orange }]}>
              {newPassword.length >= 8 ? "Length OK" : `${8 - newPassword.length} more character${8 - newPassword.length !== 1 ? "s" : ""} needed`}
            </Text>
            {confirmPassword.length > 0 && (
              <>
                <View style={s.hintSep} />
                <Ionicons
                  name={newPassword === confirmPassword ? "checkmark-circle" : "close-circle-outline"}
                  size={15}
                  color={newPassword === confirmPassword ? C.green : "#ef4444"}
                />
                <Text style={[s.hintText, { color: newPassword === confirmPassword ? C.green : "#ef4444" }]}>
                  {newPassword === confirmPassword ? "Passwords match" : "Passwords don't match"}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: success ? "#16a34a" : C.primary }, (loading || success) && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={loading || success}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : success ? (
            <>
              <Ionicons name="checkmark-circle" size={17} color="#fff" />
              <Text style={s.saveBtnText}>Password Updated</Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={17} color="#fff" />
              <Text style={s.saveBtnText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  iconBlock: { alignItems: "center", gap: 10, paddingVertical: 8 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerSuccess: {},
  bannerError: {},
  bannerText: { fontSize: 14, fontWeight: "500", flex: 1, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
  },
  divider: { height: 1, marginLeft: 0 },
  eyeBtn: { paddingLeft: 8 },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexWrap: "wrap",
  },
  hintText: { fontSize: 13, fontWeight: "500" },
  hintSep: { width: 12 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
