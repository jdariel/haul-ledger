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

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
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
            <Text style={[s.cardTitle, { color: C.text }]}>Welcome back</Text>
            <Text style={[s.cardSub, { color: C.textSecondary }]}>Sign in to your account</Text>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#ef4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

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
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              style={s.forgotBtn}
            >
              <Text style={[s.forgotText, { color: C.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: C.primary }, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={s.primaryBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch to Register */}
          <View style={s.switchRow}>
            <Text style={[s.switchText, { color: C.textSecondary }]}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[s.switchLink, { color: C.primary }]}>Sign Up</Text>
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

    brand: { alignItems: "center", gap: 10, marginBottom: 8 },
    logoBox: {
      width: 80, height: 80, borderRadius: 24,
      justifyContent: "center", alignItems: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 12,
    },
    logoText: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -1 },
    appName: { fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
    tagline: { fontSize: 14, textAlign: "center" },

    card: {
      borderRadius: 20, borderWidth: 1,
      padding: 24, gap: 16,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: "800" },
    cardSub: { fontSize: 14, marginTop: -8 },

    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#fee2e2", borderRadius: 10,
      padding: 12,
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

    primaryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, borderRadius: 14,
      marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    forgotBtn: { alignSelf: "flex-end", marginTop: -4 },
    forgotText: { fontSize: 13, fontWeight: "600" },

    switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center" },
    switchText: { fontSize: 14 },
    switchLink: { fontSize: 14, fontWeight: "700" },
  });
}
