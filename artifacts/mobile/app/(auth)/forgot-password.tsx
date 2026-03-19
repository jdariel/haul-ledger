import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";

type Step = "verify" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const s = makeStyles(C);

  const [step, setStep] = useState<Step>("verify");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter both your full name and email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The name and email you entered don't match our records.");
        return;
      }
      setStep("reset");
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed.");
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={C.primary} />
            <Text style={[s.backText, { color: C.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={s.iconWrap}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="shield-checkmark-outline" size={36} color={C.primary} />
            </View>
          </View>

          {step === "done" ? (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={56} color="#10b981" />
              </View>
              <Text style={[s.cardTitle, { color: C.text, textAlign: "center" }]}>Password Reset!</Text>
              <Text style={[s.cardSub, { color: C.textSecondary, textAlign: "center" }]}>
                Your password has been updated. You can now sign in with your new password.
              </Text>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.primary }]}
                onPress={() => router.replace("/(auth)/login")}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>Go to Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : step === "verify" ? (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>Verify your identity</Text>
              <Text style={[s.cardSub, { color: C.textSecondary }]}>
                Enter the full name and email address you used when creating your account.
              </Text>

              <View style={[s.infoBanner, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="information-circle-outline" size={16} color={C.primary} />
                <Text style={[s.infoBannerText, { color: C.primary }]}>
                  Both fields must match exactly what's on your account.
                </Text>
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={15} color="#ef4444" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Full Name</Text>
                <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                  <Ionicons name="person-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: C.text }]}
                    placeholder="As registered on your account"
                    placeholderTextColor={C.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Email</Text>
                <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                  <Ionicons name="mail-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: C.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.primary }, loading && s.btnDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Verify Identity</Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>Set new password</Text>
              <Text style={[s.cardSub, { color: C.textSecondary }]}>
                Identity verified for{" "}
                <Text style={{ fontWeight: "700", color: C.text }}>{email}</Text>
              </Text>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={15} color="#ef4444" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: C.textSecondary }]}>New Password</Text>
                <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: C.text }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={C.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNew}
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}>
                    <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Confirm Password</Text>
                <View style={[
                  s.inputWrap,
                  {
                    borderColor: confirmPassword && confirmPassword !== newPassword ? "#ef4444" : C.separator,
                    backgroundColor: C.background,
                  },
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: C.text }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={C.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                  <Text style={s.mismatch}>Passwords don't match</Text>
                )}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.primary }, loading && s.btnDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Reset Password</Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep("verify"); setError(""); }}
                style={s.changeBtn}
              >
                <Text style={[s.changeBtnText, { color: C.textSecondary }]}>Use different details</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flexGrow: 1, padding: 24, gap: 20, paddingTop: 16 },

    backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    backText: { fontSize: 15, fontWeight: "600" },

    iconWrap: { alignItems: "center", marginBottom: 4 },
    iconBox: {
      width: 80, height: 80, borderRadius: 24,
      justifyContent: "center", alignItems: "center",
    },

    card: {
      borderRadius: 20, borderWidth: 1,
      padding: 24, gap: 16,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: "800" },
    cardSub: { fontSize: 14, marginTop: -8, lineHeight: 20 },

    infoBanner: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      padding: 12, borderRadius: 10,
    },
    infoBannerText: { fontSize: 13, flex: 1, lineHeight: 18 },

    successIcon: { alignItems: "center", paddingVertical: 8 },

    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#fee2e2", borderRadius: 10, padding: 12,
    },
    errorText: { color: "#b91c1c", fontSize: 13, flex: 1, lineHeight: 18 },

    fieldGroup: { gap: 6 },
    fieldLabel: { fontSize: 13, fontWeight: "600" },
    inputWrap: {
      flexDirection: "row", alignItems: "center",
      borderWidth: 1.5, borderRadius: 12,
      paddingHorizontal: 12, height: 50, gap: 8,
    },
    inputIcon: { flexShrink: 0 },
    input: { flex: 1, fontSize: 15 },
    eyeBtn: { padding: 4 },
    mismatch: { fontSize: 12, color: "#ef4444", marginTop: -2 },

    primaryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, borderRadius: 14, marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    changeBtn: { alignItems: "center", paddingVertical: 4 },
    changeBtnText: { fontSize: 13, fontWeight: "600" },
  });
}
