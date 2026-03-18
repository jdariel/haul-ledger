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

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all REST endpoints)
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

### Design
- Deep blue/slate dark theme (#0b1121 background)
- Light mode fully supported
- Bottom tab bar with NativeTabs (liquid glass on iOS 26+)
- Card-based layout with Inter font

### API Routes
- GET/POST/DELETE `/api/expenses`
- GET/POST/DELETE `/api/income`
- GET/POST/DELETE `/api/fuel-entries`
- GET/POST/DELETE `/api/trips`
- GET/POST/DELETE `/api/assets`
- GET/POST/DELETE `/api/saved-routes`
- GET/POST/DELETE `/api/quick-expenses`
- GET `/api/summary`
- POST `/api/receipts/process`

### Database Tables
- `expenses`, `income`, `fuel_entries`, `trips`, `assets`, `saved_routes`, `quick_expenses`

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server
- `pnpm --filter @workspace/db run push` — push database schema
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client
- `pnpm run typecheck` — full TypeScript check
