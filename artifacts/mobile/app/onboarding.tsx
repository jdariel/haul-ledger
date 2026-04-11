import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export const ONBOARDING_KEY = "haul_ledger_onboarding_done";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Step {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  bullets: string[];
  cta?: string;
}

function getSteps(C: typeof Colors.light): Step[] {
  return [
    {
      icon: "receipt-outline",
      iconBg: C.blue2Light,
      iconColor: C.blue2,
      title: "Log Every Dollar",
      subtitle: "Capture income, expenses, and fuel — right from the road.",
      bullets: [
        "Tap + on the home screen to log a load payment in seconds",
        "Photograph receipts to auto-fill fuel, maintenance, and more",
        "Fixed costs like insurance and truck payments log themselves automatically",
      ],
    },
    {
      icon: "calculator-outline",
      iconBg: C.purpleLight,
      iconColor: C.purple,
      title: "Know Your Cost Per Mile",
      subtitle: "Cost Setup breaks down exactly what you spend to keep the wheels turning.",
      bullets: [
        "Enter your fixed costs — insurance, truck payment, permits, and more",
        "See your fixed cost per mile based on how many miles you run",
        "Costs sync to your expense log automatically — no double entry",
      ],
    },
    {
      icon: "trending-up-outline",
      iconBg: C.grassLight,
      iconColor: C.grass,
      title: "Evaluate Every Load",
      subtitle: "Know your clean profit before you say yes to a load.",
      bullets: [
        "Enter the rate, miles, and today's fuel price",
        "Load Evaluator shows fuel cost, fixed cost allocation, and net profit",
        "See your margin % and whether the load is worth taking",
      ],
    },
    {
      icon: "bar-chart-outline",
      iconBg: C.greenLight,
      iconColor: C.green,
      title: "Reports & Fleet Tools",
      subtitle: "Everything you need to run your operation like a business.",
      bullets: [
        "Dashboard shows weekly income, expenses, and net profit at a glance",
        "IFTA report tracks fuel and miles by state — export-ready each quarter",
        "Fleet tab lets you manage drivers and log expenses on their behalf",
      ],
      cta: "Set Up Cost Setup",
    },
  ];
}

async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Non-fatal — app still works without this flag
  }
}

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const s = makeStyles(C);
  const STEPS = getSteps(C);

  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const goToStep = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentStep(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentStep(page);
  };

  const handleSkip = async () => {
    await markOnboardingDone();
    router.replace("/(tabs)");
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    } else {
      await markOnboardingDone();
      router.replace("/(tabs)");
    }
  };

  const handleCta = async () => {
    await markOnboardingDone();
    router.replace("/(tabs)");
    setTimeout(() => router.push("/cost-setup"), 100);
  };

  const isLast = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={["top", "bottom"]}>
      {/* Skip button */}
      <View style={s.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSkip} style={s.skipBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.skipText, { color: C.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={s.slider}
      >
        {STEPS.map((step, i) => (
          <View key={i} style={[s.slide, { width: SCREEN_WIDTH }]}>
            {/* Icon */}
            <View style={[s.iconCircle, { backgroundColor: step.iconBg }]}>
              <Ionicons name={step.icon as any} size={52} color={step.iconColor} />
            </View>

            {/* Step badge */}
            <View style={[s.badge, { backgroundColor: step.iconBg }]}>
              <Text style={[s.badgeText, { color: step.iconColor }]}>Step {i + 1} of {STEPS.length}</Text>
            </View>

            <Text style={[s.title, { color: C.text }]}>{step.title}</Text>
            <Text style={[s.subtitle, { color: C.textSecondary }]}>{step.subtitle}</Text>

            {/* Bullet points */}
            <View style={s.bullets}>
              {step.bullets.map((bullet, bi) => (
                <View key={bi} style={s.bulletRow}>
                  <View style={[s.bulletDot, { backgroundColor: step.iconColor }]} />
                  <Text style={[s.bulletText, { color: C.textSecondary }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToStep(i)}>
            <View
              style={[
                s.dot,
                {
                  backgroundColor: i === currentStep ? C.primary : C.separator,
                  width: i === currentStep ? 24 : 8,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={s.footer}>
        {currentStep > 0 ? (
          <TouchableOpacity style={[s.backBtn, { borderColor: C.separator }]} onPress={() => goToStep(currentStep - 1)}>
            <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
            <Text style={[s.backBtnText, { color: C.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}

        <View style={s.rightBtns}>
          {isLast && STEPS[currentStep].cta ? (
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: C.primary + "18", borderColor: C.primary }]}
              onPress={handleCta}
            >
              <Text style={[s.ctaBtnText, { color: C.primary }]}>{STEPS[currentStep].cta}</Text>
              <Ionicons name="calculator-outline" size={15} color={C.primary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={[s.nextBtn, { backgroundColor: C.primary }]} onPress={handleNext}>
            {isLast ? (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.nextBtnText}>Get Started</Text>
              </>
            ) : (
              <>
                <Text style={s.nextBtnText}>Next</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    safe: { flex: 1 },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    skipBtn: { paddingVertical: 6, paddingHorizontal: 4 },
    skipText: { fontSize: 15, fontWeight: "500" },

    slider: { flex: 1 },
    slide: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 32,
      paddingTop: 32,
      gap: 0,
    },

    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },

    badge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      marginBottom: 14,
    },
    badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

    title: {
      fontSize: 28,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 10,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
    },

    bullets: { width: "100%", gap: 14 },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 21 },

    dots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingVertical: 20,
    },
    dot: { height: 8, borderRadius: 4 },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 10,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 8,
      minWidth: 72,
    },
    backBtnText: { fontSize: 15, fontWeight: "500" },

    rightBtns: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end" },

    ctaBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    ctaBtnText: { fontSize: 14, fontWeight: "700" },

    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 22,
    },
    nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
}
