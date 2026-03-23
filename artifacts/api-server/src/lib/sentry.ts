import * as Sentry from "@sentry/node";
import { config } from "../config";

/**
 * Initializes Sentry. Must be called once, as early as possible before any
 * other imports so that Sentry can instrument all modules automatically.
 *
 * Sentry is silently skipped when SENTRY_DSN is not set (dev / staging),
 * and fully active in production when the DSN is configured.
 */
export function initSentry() {
  if (!config.sentryDsn) {
    if (config.isProd) {
      console.warn("⚠️   SENTRY_DSN is not set — error monitoring is disabled in production.");
    }
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.isProd ? 0.2 : 1.0,
    // Attach request data (URL, method, headers) to each error report
    includeLocalVariables: true,
  });

  console.log(`✅  Sentry initialized (environment: ${config.nodeEnv})`);
}

export { Sentry };
