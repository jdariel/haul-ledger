import * as Sentry from "@sentry/react-native";

/**
 * The DSN must be provided via EXPO_PUBLIC_SENTRY_DSN so that the Expo
 * bundler inlines it into the app bundle at build time.
 *
 * In your deployment environment set:
 *   EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@oxxxx.ingest.sentry.io/xxxxxx
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    if (__DEV__) {
      console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — error monitoring is disabled.");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    // Capture 20% of transactions in production to stay within free-tier limits
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Enable automatic performance tracing for React Navigation
    enableNativeFramesTracking: !__DEV__,
  });
}

export { Sentry };
