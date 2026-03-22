import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const LAST_UPDATED = "March 2026";

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[s.backText, { color: C.primary }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: C.text }]}>Privacy Policy</Text>
        <Text style={[s.meta, { color: C.textSecondary }]}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Introduction" C={C}>
          HaulLedger ("we," "our," or "us") is committed to protecting your personal information. This Privacy
          Policy explains what data we collect, how we use it, and your rights as a user of the HaulLedger
          mobile application.
        </Section>

        <Section title="2. Information We Collect" C={C}>
          {"We collect the following types of information:\n\n"}
          {"• Account Information: Your name, email address, and encrypted password when you register.\n\n"}
          {"• Financial Records: Income entries, expense records, fuel logs, and any details you enter such as amounts, dates, vendors, and categories.\n\n"}
          {"• Trip & Mileage Data: Trip logs including pickup and delivery locations, odometer readings, miles driven, and jurisdictions.\n\n"}
          {"• Receipt Images: Photos of receipts you upload through the app.\n\n"}
          {"• Device Information: Basic device and operating system information used for app performance and troubleshooting."}
        </Section>

        <Section title="3. How We Use Your Information" C={C}>
          {"We use your information solely to:\n\n"}
          {"• Provide and operate the HaulLedger service, including storing and displaying your financial records.\n\n"}
          {"• Generate reports and summaries (IFTA, profit/loss, mileage) from your own data.\n\n"}
          {"• Send password reset emails when requested.\n\n"}
          {"• Improve app performance and fix technical issues.\n\n"}
          {"We do not use your data for advertising or sell it to any third party."}
        </Section>

        <Section title="4. Data Storage & Security" C={C}>
          Your data is stored on secure servers. Passwords are hashed using industry-standard encryption (bcrypt)
          and are never stored in plain text. Authentication uses JSON Web Tokens (JWT) with expiration limits.
          All communication between the app and our servers uses encrypted connections (HTTPS).
        </Section>

        <Section title="5. Data Sharing" C={C}>
          {"We do not sell, rent, or share your personal information with third parties, except:\n\n"}
          {"• Service Providers: We use Resend for transactional email delivery (password resets only). They process your email address solely for this purpose.\n\n"}
          {"• Legal Requirements: We may disclose information if required by law or to protect the safety and rights of our users."}
        </Section>

        <Section title="6. Your Rights" C={C}>
          {"You have the right to:\n\n"}
          {"• Access your data at any time through the app.\n\n"}
          {"• Export your data using the Export feature in Reports.\n\n"}
          {"• Delete your account and all associated data permanently from Settings > Account > Delete Account. Deletion is immediate and irreversible.\n\n"}
          {"• Request a copy of your data by contacting us at support@haulledger.com."}
        </Section>

        <Section title="7. Data Retention" C={C}>
          We retain your data for as long as your account is active. When you delete your account, all
          associated records — expenses, income, trips, fuel logs, receipts, and account credentials — are
          permanently and irreversibly deleted from our systems within 30 days.
        </Section>

        <Section title="8. Children's Privacy" C={C}>
          HaulLedger is not intended for use by anyone under the age of 13. We do not knowingly collect
          personal information from children. If you believe a child has provided us with personal information,
          please contact us and we will delete it promptly.
        </Section>

        <Section title="9. Changes to This Policy" C={C}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by
          updating the "Last updated" date at the top of this page. Continued use of the app after changes
          constitutes acceptance of the updated policy.
        </Section>

        <Section title="10. Contact Us" C={C}>
          {"If you have questions about this Privacy Policy or how your data is handled, contact us at:\n\nEmail: support@haulledger.com"}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, C }: { title: string; children: string; C: typeof Colors.light }) {
  const s = makeStyles(C);
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: C.text }]}>{title}</Text>
      <Text style={[s.sectionBody, { color: C.textSecondary }]}>{children}</Text>
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { fontSize: 16, fontWeight: "500" },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
    meta: { fontSize: 13, marginBottom: 24 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
    sectionBody: { fontSize: 14, lineHeight: 22 },
  });
}
