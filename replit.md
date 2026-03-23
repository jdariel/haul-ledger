# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a full-stack trucking expense and earnings tracker called **HaulLedger**, built for owner-operators and small fleet owners.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo + Expo Router (file-based routing)
- **Email**: Resend (transactional email via RESEND_API_KEY)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all REST endpoints)
│   │   └── src/middleware/ # auth.ts (JWT), rateLimits.ts (rate limiting)
│   └── mobile/             # Expo React Native mobile app (HaulLedger)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## HaulLedger Mobile App

### Features
- **Dashboard**: Financial summary (income/expenses/profit), weekly mileage progress, quick expense logging, IFTA deadline countdown
- **Expenses**: Full list with category filter, week/all toggle, merchant search, swipe-to-delete
- **Income**: Income entries with swipe-to-delete
- **Reports**: IFTA report (miles/fuel by jurisdiction), Schedule C (income/expense by category) with CSV export
- **More Tab**: Fleet assets, fuel log, trip log, saved routes, and settings
- **Modal Forms**: Add expense, income, fuel entry, trip, fleet asset, and saved route
- **Auth**: Register, Login, Forgot Password (email OTP 3-step flow via Resend)

### Design
- Deep blue/slate dark theme (#0b1121 background)
- Light mode fully supported
- Bottom tab bar with NativeTabs (liquid glass on iOS 26+)
- Card-based layout with Inter font

### Security Architecture
- **Token storage**: `expo-secure-store` (iOS Keychain / Android Keystore) — NOT AsyncStorage
- **Auth token**: JWT (30d expiry), stored securely on device
- **API authentication**: All data routes require `Authorization: Bearer <token>` header
- **Auto-logout**: 401 responses automatically clear token and redirect to login
- **Password minimum**: 8 characters (enforced client + server)
- **OTP**: Cryptographically secure 6-digit codes (`crypto.randomInt`), 15-min expiry, 5-attempt lockout
- **Email enumeration**: Forgot-password always returns success regardless of whether email exists
- **Timing attacks**: Constant-time OTP comparison (`crypto.timingSafeEqual`), dummy bcrypt on unknown users
- **Rate limiting**: Global 100 req/15min; auth endpoints 15 req/15min per IP
- **HTTP headers**: Helmet (CSP, HSTS, X-Frame-Options, etc.)
- **Trust proxy**: Express trust proxy enabled for Replit's reverse proxy

### API Routes (all except /auth and /health require JWT)
- GET/POST/DELETE `/api/expenses`
- GET/POST/DELETE `/api/income`
- GET/POST/DELETE `/api/fuel-entries`
- GET/POST/DELETE `/api/trips`
- GET/POST/DELETE `/api/assets`
- GET/POST/DELETE `/api/saved-routes`
- GET/POST/DELETE `/api/quick-expenses`
- GET `/api/summary`
- POST `/api/receipts/process`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/forgot-password`
- POST `/api/auth/verify-otp`
- POST `/api/auth/reset-password`
- GET `/api/auth/me`

### Database Tables
- `expenses`, `income`, `fuel_entries`, `trips`, `assets`, `saved_routes`, `quick_expenses`, `users`

### App Store Config (app.json)
- iOS bundle ID: `com.haulledger.app`
- Android package: `com.haulledger.app`
- Scheme: `haulledger`
- Camera/photo permissions with usage descriptions
- Privacy manifest for iOS
- `ITSAppUsesNonExemptEncryption: false` (no exempt encryption)
- **App icon** (`assets/images/icon.png`): AI-generated HaulLedger brand — white truck + green growth chart on `#3b82f6` blue background. 1:1. Used as app icon, Android adaptive foreground, notification icon, and web favicon.
- **Splash screen** (`assets/images/splash-icon.png`): Full-bleed 9:16 portrait — white truck + chart centered on solid blue matching brand color. `resizeMode: "cover"` with `backgroundColor: "#3b82f6"`.

## Critical Notes

- **useColorScheme**: Always import from `@/hooks/useColorScheme` (NOT `react-native`) — `Appearance.setColorScheme` doesn't work on Expo web
- **API URL**: `constants/api.ts` → always `https://${EXPO_PUBLIC_DOMAIN}/api` (EXPO_PUBLIC_DOMAIN has no https:// prefix)
- **KeyboardAwareScrollView**: Never use `react-native-keyboard-controller` directly — use `KeyboardAwareScrollViewCompat` from `@/components/KeyboardAwareScrollViewCompat`
- **Auth token**: `setAuthToken()` from `useApi.ts` must be called on login/logout/restore — injects token into all API requests
- **Ionicons**: Has no "truck" icon — use "HL" text logo
- **Colors**: primary `#3b82f6`, green `#10b981`, orange `#f59e0b`, red `#ef4444`, light bg `#f2f2f7`
- **OpenAI model**: `gpt-4o-mini` with vision (base64 image_url) for receipt scanning
- **Receipt images**: `receiptUrl` stored as `/objects/uploads/<uuid>`, served via `GET /api/storage/objects/uploads/<uuid>`
- **File system**: Use `expo-file-system/legacy` (not `expo-file-system`) for `readAsStringAsync`
- **JWT**: Secret in `JWT_SECRET` env var (shared); expires 30d
- **DB TS errors**: `@workspace/db` export errors in tsconfig are a pre-existing project references issue — don't affect runtime (tsx resolves directly)

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server
- `pnpm --filter @workspace/db run push` — push database schema
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client
- `pnpm run typecheck` — full TypeScript check

## Push Notifications

Expo Push Notification Service — no external account or credentials needed (Expo handles APNS/FCM routing).

### Architecture

```
Mobile app (on login/restore)
  → requests OS permission
  → gets ExponentPushToken[...]
  → PATCH /api/auth/push-token   (saves to users.expo_push_token)

Server (from any route or scheduler)
  → sendPushToUser(user.expoPushToken, { title, body })
  → POST https://exp.host/--/api/v2/push/send
  → Expo → APNS (iOS) / FCM (Android) → device
```

### Key files

- `artifacts/mobile/lib/pushNotifications.ts` — `registerPushToken(jwt)` / `unregisterPushToken(jwt)`; sets notification handler, requests OS permission, gets token, calls server
- `artifacts/mobile/context/AuthContext.tsx` — calls `registerPushToken` on login, register, and session restore; calls `unregisterPushToken` on logout
- `artifacts/api-server/src/lib/notifications.ts` — `sendPushNotifications(tokens[], msg)` / `sendPushToUser(token, msg)`; calls Expo push API

### DB column

`users.expo_push_token` (nullable text) — stores the device's Expo push token; updated on each login; cleared on logout.

### Usage (server-side)

```typescript
import { sendPushToUser } from "../lib/notifications";

// Example: notify a user after their IFTA report is ready
await sendPushToUser(user.expoPushToken, {
  title: "IFTA Report Ready",
  body: "Your Q1 2026 IFTA report has been generated.",
  data: { screen: "ifta" },
});
```

### Notes

- Push notifications only work on **physical devices** — simulators and web are silently skipped
- Requires a **development build** (EAS Build) for production token generation; Expo Go uses a shared token in dev
- Token registration is fire-and-forget — it never blocks login or app startup

## Database Backups

Automated daily `pg_dump` backups with **two-tier storage**:

| Tier | Where | Retention | Purpose |
|------|-------|-----------|---------|
| Local | `artifacts/api-server/backups/` | 7 days (rolling) | Fast restore |
| Remote | Replit Object Storage (GCS) | Indefinite | Durable long-term archive |

- **Schedule**: every day at 02:00 UTC (`node-cron`)
- **Format**: gzip-compressed plain SQL — `backup_<ISO-timestamp>Z.sql.gz`
- **GCS path**: `backups/<filename>` inside the default Replit Object Storage bucket
- **Local retention**: configurable via `BACKUP_RETENTION_DAYS` env var (default: 7)
- **Restore**: `gunzip -c backup_<ts>.sql.gz | psql $DATABASE_URL`

### Admin Endpoints (protected by `ADMIN_SECRET` bearer token)

```
POST /api/admin/backup                           — trigger a backup now
GET  /api/admin/backups                          — list all local backups + GCS names
GET  /api/admin/backups/:filename/download       — get 1-hour signed GCS download URL
```

### Key Files

- `artifacts/api-server/src/lib/backup.ts` — `runBackup()` (pg_dump + GCS upload), `listBackups()`, `pruneOldBackups()`, `getBackupDownloadUrl()`
- `artifacts/api-server/src/scheduler.ts` — `startScheduler()` wires cron job; called from `index.ts` after `app.listen()`
- `artifacts/api-server/src/routes/admin.ts` — admin-only HTTP endpoints

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 128-char hex secret for JWT signing (shared env)
- `RESEND_API_KEY` — Resend API key for OTP emails
- `SENTRY_DSN` — Sentry DSN for API server error tracking (optional in dev)
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry DSN for mobile app (must have EXPO_PUBLIC_ prefix)
- `ADMIN_SECRET` — Bearer token protecting `/api/admin/*` endpoints
- `BACKUP_DIR` — Override backup directory (default: `artifacts/api-server/backups/`)
- `BACKUP_RETENTION_DAYS` — Days to keep backups (default: 7)
- `EXPO_PUBLIC_DOMAIN` — Replit dev domain (no https:// prefix)
- `REPLIT_DEV_DOMAIN` — Replit dev domain
- `REPLIT_EXPO_DEV_DOMAIN` — Expo-specific dev domain
