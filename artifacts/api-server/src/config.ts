/**
 * Centralized environment variable validation.
 * Imported first in index.ts — if anything required is missing the process
 * exits immediately with a clear, actionable message instead of a cryptic
 * runtime crash later.
 */

interface Config {
  port: number;
  nodeEnv: string;
  isProd: boolean;
  jwtSecret: string;
  databaseUrl: string;
  resendApiKey: string | null;
  sentryDsn: string | null;
  minAppVersion: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n❌  Missing required environment variable: ${name}`);
    console.error(`    Set ${name} in your environment before starting the server.\n`);
    process.exit(1);
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : null;
}

function validate(): Config {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProd = nodeEnv === "production";

  // PORT — always required
  const rawPort = process.env.PORT;
  if (!rawPort) {
    console.error("\n❌  Missing required environment variable: PORT\n");
    process.exit(1);
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    console.error(`\n❌  Invalid PORT value: "${rawPort}"\n`);
    process.exit(1);
  }

  // DATABASE_URL — always required
  const databaseUrl = requireEnv("DATABASE_URL");

  // JWT_SECRET — always required
  const jwtSecret = requireEnv("JWT_SECRET");
  if (jwtSecret.length < 32) {
    console.warn(
      `\n⚠️   JWT_SECRET is shorter than 32 characters. Use a longer, randomly-generated secret in production.\n`
    );
    if (isProd) {
      console.error("❌  JWT_SECRET is too short for production. Aborting.\n");
      process.exit(1);
    }
  }

  // RESEND_API_KEY — required in production (password reset won't work without it)
  let resendApiKey: string | null = optionalEnv("RESEND_API_KEY");
  if (!resendApiKey && isProd) {
    console.error(
      "\n❌  Missing required environment variable: RESEND_API_KEY\n" +
      "    Password reset emails cannot be sent without it.\n"
    );
    process.exit(1);
  }
  if (!resendApiKey) {
    console.warn(
      "\n⚠️   RESEND_API_KEY is not set. Password reset emails will fail.\n"
    );
  }

  // SENTRY_DSN — optional but recommended in production
  const sentryDsn = optionalEnv("SENTRY_DSN");
  if (!sentryDsn && isProd) {
    console.warn("⚠️   SENTRY_DSN is not set — production error monitoring is disabled.");
  }

  // MIN_APP_VERSION — optional, defaults to "1.0.0"
  // Bump this when deploying a breaking API change to force old clients to update.
  const minAppVersion = optionalEnv("MIN_APP_VERSION") ?? "1.0.0";

  if (isProd) {
    console.log("✅  Environment validated — all required variables present.");
  }

  return { port, nodeEnv, isProd, jwtSecret, databaseUrl, resendApiKey, sentryDsn, minAppVersion };
}

export const config = validate();
