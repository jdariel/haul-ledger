import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BiometricLockScreen } from "@/components/BiometricLockScreen";
import { ForceUpdateScreen } from "@/components/ForceUpdateScreen";
import { checkAppVersion } from "@/lib/versionCheck";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/colors";
import { ONBOARDING_KEY } from "./onboarding";
import { initSentry } from "../lib/sentry";
import * as Sentry from "@sentry/react-native";

// Initialize Sentry as early as possible — before any component renders
initSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
    },
  },
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const C = Colors[isDark ? "dark" : "light"];
  const { user, isLoading } = useAuth();
  const { settings } = useAppContext();
  // Only perform initial routing once — login/register/logout handle their own navigation
  const didInitNav = useRef(false);

  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const wentToBackground = useRef(false);

  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateVersions, setUpdateVersions] = useState({ current: "1.0.0", min: "1.0.0" });

  useEffect(() => {
    checkAppVersion()
      .then((result) => {
        if (result.updateRequired) {
          setUpdateVersions({ current: result.currentVersion, min: result.minVersion });
          setUpdateRequired(true);
        }
      })
      .catch(() => {
        // Network failure — don't block the user
      });
  }, []);

  // Biometric lock: watch AppState changes
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appState.current === "active" && nextState !== "active") {
        // App is going to background/inactive
        if (settings.biometricLock && user) {
          wentToBackground.current = true;
        }
      }
      if (nextState === "active" && wentToBackground.current) {
        // App is returning to foreground
        wentToBackground.current = false;
        if (settings.biometricLock && user) {
          setIsLocked(true);
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [settings.biometricLock, user]);

  useEffect(() => {
    if (isLoading || didInitNav.current) return;
    didInitNav.current = true;

    (async () => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        // Returning user — check if they've seen onboarding
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null);
        if (!onboardingDone) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      }
    })();
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? "#0b1121" : "#f0f4ff",
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="add-income" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="fuel-log" options={{ headerShown: false }} />
        <Stack.Screen name="expense-detail" options={{ headerShown: false }} />
        <Stack.Screen name="add-fuel" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="add-trip" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="add-asset" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="add-route" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="scan-receipt" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="ifta" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="quick-add" options={{ headerShown: false }} />
      </Stack>
      {isLocked && (
        <BiometricLockScreen onUnlock={() => setIsLocked(false)} />
      )}
      {updateRequired && (
        <ForceUpdateScreen
          currentVersion={updateVersions.current}
          minVersion={updateVersions.min}
        />
      )}
    </View>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </AuthProvider>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Wrapping with Sentry ensures unhandled JS errors bubble up to Sentry
// with a full component stack trace attached
export default Sentry.wrap(RootLayout);
