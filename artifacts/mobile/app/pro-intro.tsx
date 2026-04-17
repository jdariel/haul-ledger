import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";

type IntroSpec = {
  title: string;
  tagline: string;
  bullets: string[];
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const INTROS: Record<string, IntroSpec> = {
  ifta: {
    title: "IFTA in Minutes, Not Hours",
    tagline: "This benefit helps you file IFTA without the spreadsheet headaches.",
    icon: "map-outline",
    color: "#3b82f6",
    bullets: [
      "Auto-calculates miles and fuel by jurisdiction",
      "Quarter-ready summaries you can hand straight to your accountant",
      "Turn paperwork hours into pay-time hours",
    ],
  },
  "reports-export": {
    title: "Reports That Pay You Back",
    tagline: "This benefit helps you keep more at tax time — every deduction captured.",
    icon: "bar-chart-outline",
    color: "#10b981",
    bullets: [
      "Schedule C-ready exports for your CPA",
      "CSV downloads of every expense, load and trip",
      "No money left on the table",
    ],
  },
  "ifta-export": {
    title: "Reports That Pay You Back",
    tagline: "This benefit helps you keep more at tax time — every deduction captured.",
    icon: "bar-chart-outline",
    color: "#10b981",
    bullets: [
      "Schedule C-ready exports for your CPA",
      "CSV downloads of every expense, load and trip",
      "No money left on the table",
    ],
  },
  fleet: {
    title: "Know What Each Truck Earns",
    tagline: "This benefit helps you see the real profit each truck and driver brings in.",
    icon: "bus-outline",
    color: "#2563eb",
    bullets: [
      "Per-truck and per-driver profit at a glance",
      "Spot the lanes and assets that actually pay",
      "Scale what works — drop what doesn't",
    ],
  },
  "fuel-log": {
    title: "Cut Fuel Cost. Find Money.",
    tagline: "This benefit helps you track real fuel cost-per-mile and find waste.",
    icon: "flame-outline",
    color: "#f59e0b",
    bullets: [
      "See your true cost-per-mile for fuel",
      "Spot expensive fill-ups and bad MPG days",
      "Auto-feeds your IFTA filing",
    ],
  },
  "profit-per-mile": {
    title: "Know Your Real Profit Per Mile",
    tagline: "This benefit helps you track real profit per mile so you stop hauling cheap freight.",
    icon: "trending-up-outline",
    color: "#16a34a",
    bullets: [
      "Live cost-per-mile and profit-per-mile",
      "Know your floor — never run loads that lose money",
      "Negotiate harder with the numbers to back you up",
    ],
  },
  backup: {
    title: "Never Lose a Receipt",
    tagline: "This benefit helps you protect every dollar you've earned with secure cloud backup.",
    icon: "cloud-upload-outline",
    color: "#7c3aed",
    bullets: [
      "Automatic cloud backup of every record",
      "Restore on a new phone in seconds",
      "Your numbers are safe — even if your phone isn't",
    ],
  },
  "csv-export": {
    title: "Hand it to Your Accountant",
    tagline: "This benefit helps you export Schedule C-ready records for your CPA.",
    icon: "document-text-outline",
    color: "#14b8a6",
    bullets: [
      "Every expense, load and fuel entry as a clean spreadsheet",
      "Filter by date range to match your tax period",
      "No more end-of-year shoebox of receipts",
    ],
  },
};

const DEFAULT_INTRO: IntroSpec = {
  title: "Unlock With HaulIQ Pro",
  tagline: "This benefit helps you make more money and keep more of it.",
  icon: "star",
  color: "#f59e0b",
  bullets: [
    "Earn more on every mile",
    "Cut waste and find money you're missing",
    "Run your operation like a real business",
  ],
};

export default function ProIntroScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() !== "light";
  const C = Colors[isDark ? "dark" : "light"];
  const { feature } = useLocalSearchParams<{ feature?: string }>();

  const spec = (feature && INTROS[feature]) || DEFAULT_INTRO;

  const goToPaywall = () => {
    // Replace so back button skips this intro and returns to the previous screen.
    if (feature) {
      router.replace({ pathname: "/paywall", params: { feature } });
    } else {
      router.replace("/paywall");
    }
  };

  const close = () => router.back();

  return (
    <View style={[s.container, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ["#1e293b", "#0b1121"] : [spec.color + "26", C.background]}
        style={[s.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={close} style={s.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </TouchableOpacity>
          <View style={{ width: 26 }} />
        </View>

        <View style={s.iconWrap}>
          <View style={[s.iconCircle, { backgroundColor: spec.color }]}>
            <Ionicons name={spec.icon} size={36} color="#fff" />
          </View>
        </View>
        <Text style={[s.title, { color: C.text }]}>{spec.title}</Text>
        <Text style={[s.tagline, { color: C.textSecondary }]}>{spec.tagline}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 160 }]}
      >
        {spec.bullets.map((b, i) => (
          <View key={i} style={[s.bulletRow, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
            <View style={[s.bulletDot, { backgroundColor: spec.color }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[s.bulletText, { color: C.text }]}>{b}</Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          s.footer,
          {
            backgroundColor: C.card,
            borderColor: C.cardBorder,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.continueBtn, { backgroundColor: spec.color }]}
          onPress={goToPaywall}
          activeOpacity={0.85}
        >
          <Text style={s.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={close} style={s.maybeLater} hitSlop={8}>
          <Text style={[s.maybeLaterText, { color: C.textMuted }]}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  closeBtn: { padding: 4 },
  iconWrap: { alignItems: "center", marginTop: 8, marginBottom: 12 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 4 },
  tagline: { fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 16, lineHeight: 20 },
  body: { padding: 16, gap: 10 },
  bulletRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  bulletDot: {
    width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
  },
  bulletText: { flex: 1, fontSize: 15, fontWeight: "600" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, padding: 16, gap: 8,
  },
  continueBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 14,
  },
  continueText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  maybeLater: { alignSelf: "center", paddingVertical: 6 },
  maybeLaterText: { fontSize: 13, fontWeight: "600" },
});
