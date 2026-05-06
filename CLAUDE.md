# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ScaleX Finance MVP** is a fintech lead management platform with a **Strapi v5 backend** (CMS & REST API) and **Next.js 16 frontend** (React 19). The system enables advisors to manage financial leads and loan applications from potential customers.

- **Database**: PostgreSQL (pg 8.8.0)
- **Backend**: Strapi 5.36.1 + Node.js, email via Nodemailer
- **Frontend**: Next.js 16.1.6 + React 19.2.3 + TypeScript
- **Node Version**: >=20.0.0 <=24.x.x

## Directory Structure

```
├── src/                     # Strapi backend (API, CMS admin panel)
│   ├── api/                 # Content collections (advisor, lead, loan-application, etc.)
│   ├── admin/               # Custom admin panel extensions
│   ├── components/          # Strapi components shared across collections
│   ├── email-templates/     # Email templates
│   ├── extensions/          # Plugin customizations
│   ├── middlewares/         # Request/response middlewares
│   └── index.ts             # Bootstrap logic (advisor role setup, admin user sync)
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router routes
│   │   │   ├── advisor-dashboard/        # Advisor dashboard page
│   │   │   ├── advisor-onboarding/       # Advisor registration
│   │   │   ├── advisor-login/            # Advisor auth
│   │   │   ├── lead-form/                # Lead capture form
│   │   │   ├── loan-application/         # Loan application flow
│   │   │   ├── lenders/                  # Lenders directory
│   │   │   ├── products/                 # Financial products
│   │   │   ├── components/               # Shared React components
│   │   │   └── dummy-pages/              # Bank-specific pages (HDFC, Axis)
│   │   ├── lib/             # Utility functions (API calls, etc.)
│   │   └── data/            # Static data/constants
│   ├── next.config.ts       # Next.js rewrites (proxies /strapi-api/* → http://127.0.0.1:1337/api/*)
│   └── tsconfig.json        # TypeScript config
├── config/                  # Strapi config files
├── database/                # Database migrations and seeders
├── package.json             # Root package (Strapi only)
└── frontend/package.json    # Frontend package
```

## Common Commands

### Backend (Strapi)

```bash
# Development with hot reload
npm run dev                  # Starts Strapi on http://localhost:1337

# Build admin panel
npm run build

# Production start (no reload)
npm run start

# Strapi console
npm run console

# Upgrade Strapi
npm run upgrade

# Dry-run upgrade
npm run upgrade:dry
```

### Frontend (Next.js)

```bash
cd frontend

# Development with hot reload
npm run dev                  # Starts on http://localhost:3000

# Build for production
npm run build

# Production start
npm run start

# Lint code
npm run lint
```

### Running Both Locally

To develop locally, you typically need both running:
1. **Terminal 1**: `npm run dev` (from root) → Strapi on :1337
2. **Terminal 2**: `cd frontend && npm run dev` → Next.js on :3000

The frontend's `next.config.ts` rewrites `/strapi-api/*` requests to the Strapi backend.

## Architecture Patterns

### Strapi Backend

- **Collections**: Located in `src/api/` as separate folders (e.g., `advisor/`, `lead/`, `loan-application/`)
  - Each collection has: `controllers/`, `services/`, `routes/`, `models/`, `content-types/`
- **Bootstrap Logic** (`src/index.ts`):
  - Creates a `strapi-advisor` admin role on startup
  - Syncs approved advisors to Strapi admin users (enables dashboard login)
  - When an advisor is approved, an admin account is auto-created with their email/password
- **Email Templates** (`src/email-templates/`): Used by Strapi for notifications
- **Admin Extensions** (`src/admin/`): Custom admin panel UI overrides

### Next.js Frontend

- **App Router**: Uses `src/app/` directory with file-based routing
  - Route folders: `advisor-dashboard/`, `lead-form/`, `loan-application/`, `lenders/`, `products/`, etc.
  - Each route can have `page.tsx`, `layout.tsx`, or other special files
- **API Proxy**: The `next.config.ts` rewrites:
  - `/strapi-api/upload` → `http://127.0.0.1:1337/api/upload`
  - `/strapi-api/:path*` → `http://127.0.0.1:1337/api/:path*`
  - This allows frontend to call Strapi without CORS issues
- **Components**: Shared UI components in `src/app/components/`
- **Data Layer**: `src/lib/` contains API call utilities and helpers

### Advisor Isolation

- Each advisor is a record in the `api::advisor` collection
- Approved advisors are synced to Strapi admin users on bootstrap
- Frontend `advisor-dashboard` displays leads and loan applications assigned to the logged-in advisor
- The system maintains advisor-specific views and permissions

## Database & Migrations

- Migrations stored in `database/` folder
- Strapi auto-migrates on startup (check `src/index.ts` for any custom migration logic)
- PostgreSQL connection via `.env` variables

## Environment Setup

Copy `.env.example` to `.env` and update:
- `HOST`, `PORT` (Strapi server)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET` (Strapi security)
- `JWT_SECRET`, `ENCRYPTION_KEY` (API auth)
- Database connection details (if not using default localhost)

## Key Files to Know

- **[src/index.ts](src/index.ts)** — Bootstrap logic for advisor role creation and syncing
- **[frontend/next.config.ts](frontend/next.config.ts)** — API rewrite rules and allowed origins
- **[frontend/tsconfig.json](frontend/tsconfig.json)** — Frontend TypeScript config
- **[tsconfig.json](tsconfig.json)** — Backend TypeScript config
- **[src/api/](src/api/)** — All Strapi collections (advisor, lead, loan-application, etc.)
- **[frontend/src/app/](frontend/src/app/)** — All frontend routes and pages

## Notes

- Strapi admin panel requires advisor to have `advisorStatus: 'Approved'` before admin account is created
- The frontend and backend must be running simultaneously for full local development
- Strapi v5 uses the newer `db.query()` API for direct database access (used in bootstrap logic)
- Next.js `reactStrictMode` is intentionally disabled (`false`) — be aware when debugging React component lifecycle issues
- Server Actions are configured with `allowedOrigins: ['scalex.local', 'localhost:3000']`
