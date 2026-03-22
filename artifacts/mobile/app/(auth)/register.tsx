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
import { Link, router } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(C);

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
          {/* Brand */}
          <View style={s.brand}>
            <View style={[s.logoBox, { backgroundColor: C.primary }]}>
              <Text style={s.logoText}>HL</Text>
            </View>
            <Text style={[s.appName, { color: C.text }]}>HaulLedger</Text>
            <Text style={[s.tagline, { color: C.textSecondary }]}>Track every mile. Own every dollar.</Text>
          </View>

          {/* Card */}
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>Create account</Text>
            <Text style={[s.cardSub, { color: C.textSecondary }]}>Start tracking your hauls for free</Text>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#ef4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Full Name</Text>
              <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                <Ionicons name="person-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="John Doe"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email */}
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
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Password</Text>
              <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: C.textSecondary }]}>Confirm Password</Text>
              <View style={[s.inputWrap, {
                borderColor: confirmPassword && confirmPassword !== password ? "#ef4444" : C.separator,
                backgroundColor: C.background,
              }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: C.text }]}
                  placeholder="Repeat password"
                  placeholderTextColor={C.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              {confirmPassword && confirmPassword !== password ? (
                <Text style={s.matchError}>Passwords do not match</Text>
              ) : null}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: C.primary }, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={s.primaryBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <Text style={[s.terms, { color: C.textMuted }]}>
              By signing up, you agree to our{" "}
              <Text style={[s.termsLink, { color: C.primary }]} onPress={() => router.push("/terms-of-service")}>
                Terms of Service
              </Text>
              {" "}and{" "}
              <Text style={[s.termsLink, { color: C.primary }]} onPress={() => router.push("/privacy-policy")}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {/* Switch to Login */}
          <View style={s.switchRow}>
            <Text style={[s.switchText, { color: C.textSecondary }]}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[s.switchLink, { color: C.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 20 },

    brand: { alignItems: "center", gap: 10, marginBottom: 4 },
    logoBox: {
      width: 70, height: 70, borderRadius: 20,
      justifyContent: "center", alignItems: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 12,
    },
    logoText: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -1 },
    appName: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
    tagline: { fontSize: 13, textAlign: "center" },

    card: {
      borderRadius: 20, borderWidth: 1,
      padding: 24, gap: 14,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: "800" },
    cardSub: { fontSize: 14, marginTop: -6 },

    errorBox: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: "#fee2e2", borderRadius: 10,
      padding: 12,
    },
    errorText: { color: "#b91c1c", fontSize: 13, flex: 1, lineHeight: 18 },

    fieldGroup: { gap: 5 },
    fieldLabel: { fontSize: 13, fontWeight: "600" },
    inputWrap: {
      flexDirection: "row", alignItems: "center",
      borderWidth: 1.5, borderRadius: 12,
      paddingHorizontal: 12, height: 50, gap: 8,
    },
    inputIcon: { flexShrink: 0 },
    input: { flex: 1, fontSize: 15 },
    eyeBtn: { padding: 4 },
    matchError: { fontSize: 12, color: "#ef4444", marginLeft: 2 },

    primaryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, borderRadius: 14,
      marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    terms: { fontSize: 11, textAlign: "center", lineHeight: 16 },
    termsLink: { fontWeight: "600", textDecorationLine: "underline" },

    switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center" },
    switchText: { fontSize: 14 },
    switchLink: { fontSize: 14, fontWeight: "700" },
  });
}
