import React, { useState, useRef, useEffect } from "react";
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

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const s = makeStyles(C);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async (isResend = false) => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      setCountdown(60);
      if (!isResend) setStep("otp");
      else {
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    } catch (e: any) {
      setError(e.message || "Could not send code. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code.");
      setResetToken(data.resetToken);
      setStep("password");
    } catch (e: any) {
      setError(e.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
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
        body: JSON.stringify({ resetToken, newPassword }),
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

  const StepIndicator = () => (
    <View style={s.steps}>
      {(["email", "otp", "password"] as Step[]).map((st, i) => {
        const stepOrder = { email: 0, otp: 1, password: 2, done: 3 };
        const current = stepOrder[step];
        const isDone = current > i;
        const isActive = current === i;
        return (
          <React.Fragment key={st}>
            <View style={[s.stepDot, isDone && { backgroundColor: C.primary }, isActive && { backgroundColor: C.primary, borderWidth: 2, borderColor: C.primaryLight }]}>
              {isDone ? (
                <Ionicons name="checkmark" size={10} color="#fff" />
              ) : (
                <Text style={[s.stepNum, isActive && { color: "#fff" }]}>{i + 1}</Text>
              )}
            </View>
            {i < 2 && <View style={[s.stepLine, (isDone || (isActive && i === 0)) && { backgroundColor: C.primary }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={C.primary} />
            <Text style={[s.backText, { color: C.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={s.iconWrap}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="mail-outline" size={36} color={C.primary} />
            </View>
          </View>

          {step !== "done" && <StepIndicator />}

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={15} color="#ef4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === "done" ? (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
              </View>
              <Text style={[s.cardTitle, { color: C.text, textAlign: "center" }]}>Password Updated!</Text>
              <Text style={[s.cardSub, { color: C.textSecondary, textAlign: "center" }]}>
                Your password has been reset successfully. Sign in with your new password.
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
          ) : step === "email" ? (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>Reset your password</Text>
              <Text style={[s.cardSub, { color: C.textSecondary }]}>
                Enter your account email and we'll send you a verification code.
              </Text>

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
                    onSubmitEditing={() => handleSendCode()}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.primary }, loading && s.btnDisabled]}
                onPress={() => handleSendCode()}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Send Code</Text>
                    <Ionicons name="send-outline" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : step === "otp" ? (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>Enter the code</Text>
              <Text style={[s.cardSub, { color: C.textSecondary }]}>
                We sent a 6-digit code to{" "}
                <Text style={{ fontWeight: "700", color: C.text }}>{email}</Text>. It expires in 15 minutes.
              </Text>

              <View style={s.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => { otpRefs.current[i] = r; }}
                    style={[
                      s.otpInput,
                      {
                        backgroundColor: C.background,
                        borderColor: digit ? C.primary : C.separator,
                        color: C.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={v => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: C.primary }, (loading || otp.join("").length < 6) && s.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.join("").length < 6}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Verify Code</Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={s.resendRow}>
                <Text style={[s.resendLabel, { color: C.textSecondary }]}>Didn't get it?</Text>
                {countdown > 0 ? (
                  <Text style={[s.resendTimer, { color: C.textMuted }]}>Resend in {countdown}s</Text>
                ) : (
                  <TouchableOpacity onPress={() => handleSendCode(true)} disabled={loading}>
                    <Text style={[s.resendLink, { color: C.primary }]}>Resend code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: C.card, borderColor: C.separator }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>Set new password</Text>
              <Text style={[s.cardSub, { color: C.textSecondary }]}>
                Choose a strong password for your account.
              </Text>

              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: C.textSecondary }]}>New Password</Text>
                <View style={[s.inputWrap, { borderColor: C.separator, backgroundColor: C.background }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: C.text }]}
                    placeholder="Min. 8 characters"
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
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  </>
                )}
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
    scroll: { flexGrow: 1, padding: 24, gap: 16, paddingTop: 16 },

    backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { fontSize: 15, fontWeight: "600" },

    iconWrap: { alignItems: "center" },
    iconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center" },

    steps: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 },
    stepDot: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: C.separator,
      justifyContent: "center", alignItems: "center",
    },
    stepNum: { fontSize: 12, fontWeight: "700", color: C.textMuted },
    stepLine: { width: 40, height: 2, backgroundColor: C.separator },

    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#fee2e2", borderRadius: 10, padding: 12,
    },
    errorText: { color: "#b91c1c", fontSize: 13, flex: 1, lineHeight: 18 },

    card: {
      borderRadius: 20, borderWidth: 1, padding: 24, gap: 16,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: "800" },
    cardSub: { fontSize: 14, marginTop: -8, lineHeight: 20 },
    successIcon: { alignItems: "center", paddingVertical: 8 },

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

    otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
    otpInput: {
      width: 46, height: 56, borderRadius: 12, borderWidth: 2,
      fontSize: 24, fontWeight: "800",
    },

    resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
    resendLabel: { fontSize: 13 },
    resendTimer: { fontSize: 13, fontWeight: "600" },
    resendLink: { fontSize: 13, fontWeight: "700" },

    primaryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, height: 52, borderRadius: 14, marginTop: 4,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}
