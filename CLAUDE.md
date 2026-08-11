# CLAUDE.md

> **Auto-update rule:** Whenever you add or modify a feature in this project — a new Strapi API collection, a new frontend route, a schema field change, a new role/permission, or a migration — update this file before finishing. Keep the collections table, routes list, flow descriptions, and notes sections current.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ScaleX Finance MVP** is a fintech lead management platform with a **Strapi v5 backend** (CMS & REST API) and **Next.js 16 frontend** (React 19). The system enables advisors to manage financial leads and loan applications from potential customers. Staff and Bankers are secondary roles assigned to process loan applications.

- **Database**: PostgreSQL (pg 8.8.0)
- **Backend**: Strapi 5.36.1 + Node.js, email via Nodemailer
- **Frontend**: Next.js 16.1.6 + React 19.2.3 + TypeScript
- **Node Version**: >=20.0.0 <=24.x.x

## Directory Structure

```
├── src/                     # Strapi backend (API, CMS admin panel)
│   ├── api/                 # Content collections (see full list below)
│   │   └── bureau-data-extraction/  # Bureau PDF extraction + cibil-report-summary storage
│   ├── admin/               # Custom admin panel extensions
│   ├── email-templates/     # Email templates
│   ├── extensions/          # Plugin customizations
│   ├── middlewares/         # Request/response middlewares
│   └── index.ts             # Bootstrap logic (advisor role setup, admin user sync)
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router routes
│   │   │   ├── advisor-dashboard/        # Advisor dashboard (leads + loan apps)
│   │   │   ├── advisor-onboarding/       # Advisor registration
│   │   │   ├── advisor-login/            # Advisor auth
│   │   │   ├── lead-form/                # Lead capture form
│   │   │   ├── loan-application/         # Loan application flow
│   │   │   ├── loan-application-success/ # Post-submission success page
│   │   │   ├── lenders/                  # Lenders directory
│   │   │   ├── products/                 # Financial products
│   │   │   ├── about-us/                 # About Us page
│   │   │   ├── contact/                  # Contact Us page
│   │   │   └── components/               # Shared React components
│   │   ├── lib/             # Utility functions (strapi.ts, safeStorage.ts, logger.ts)
│   │   └── data/            # Static data/constants
│   ├── next.config.ts       # Next.js rewrites (proxies /strapi-api/* → http://127.0.0.1:1337/api/*)
│   └── tsconfig.json        # TypeScript config
├── config/                  # Strapi config files
├── database/
│   └── migrations/          # Knex migration files (run on Strapi startup)
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

### Bureau Data Extraction (Python)

Requires a project-root **`.venv`** — created automatically on first `npm run dev` if missing. See [docs/Python-Integration-Bureau-Data-Extraction.md](docs/Python-Integration-Bureau-Data-Extraction.md).

```bash
# Start Strapi — auto-creates .venv + installs Python deps on first run if needed
npm run dev

# Troubleshooting only — re-run extraction for a lead (Strapi must be running)
npm run extract:bureau -- <leadId> "<leadName>"
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

## Strapi API Collections

All collections live in `src/api/`. Each has `controllers/`, `services/`, `routes/`, `content-types/`.

### Core Business Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `advisor` | Advisor accounts (DSAs) | `advisorId`, `fullName`, `email`, `password`, `advisorStatus`, `state`, `district`, `pinCode`, `panNumber`, `specialization`, `earnings` |
| `lead` | Customer leads submitted via advisor referral | `fullName`, `email`, `mobileNumber`, `requiredAmount`, `selectedProduct`, `leadType`, `leadStatus`, `advisorReferralId`, `parentAdvisorId`, `employmentType`, `propertyType`, `pinCode`, `panCard`, `aadharCard` |
| `loan-application` | Full loan application tied to a lead | `leadId`, `applicantName`, `loanType`, `loanAmount`, `status`, `form_data`, `assignedStaffId`, `assignedBankerId`, docs fields (panCard, aadharCardFront/Back, salarySlips, etc.) |
| `lead-remark` | Conversation/remarks history on a lead | `leadId`, `advisor_admin_staff_remark`, `banker_admin_staff_remark` |
| `product` | Financial product definitions | — |
| `user-product-mapping` | Maps admin users (staff/bankers) to products | `adminUserId`, `user_role` (staff/banker), `product` |
| `loan-app-section-permission` | Controls which sections a role can see in loan forms | `roleId`, `roleName`, `permissions` |
| `activity-log` | System audit trail (global Activity Logs) | `action`, `description`, `severity`, `model`, `metadata`, `ipAddress`, `userId`, `leadId`, `leadName`, `category`, `correlationId` — see [docs/Activity-Log.md](docs/Activity-Log.md); admin UI domains: **Lead** \| **Users & Auth** \| **System** |

### Lender Master

| Collection / module | Purpose | Key fields / notes |
|---|---|---|
| `lender-master` | Strapi API module for master lender registry + serviceable pincodes | Module path `src/api/lender-master/`; see [docs/Lender-Master.md](docs/Lender-Master.md) |
| `lenders-catalog` | Content type inside `lender-master`; master registry of financial institutions (replaces deprecated `lender`/`lenders` table) | UID: `api::lender-master.lenders-catalog`; table `lenders_catalog`; REST `/api/lenders-catalogs`; fields `lenderName`, `lenderType`, `lenderCode`, `isActive` |
| `zip-code` | Content type inside `lender-master`; serviceable pincodes per lender | UID: `api::lender-master.zip-code`; table `zip_codes_to_lenders`; REST `/api/zip-codes`; soft-links via `lenderCode`; hidden from Content Manager |

### Personal Loan Eligibility

| Collection / module | Purpose | Key fields / notes |
|---|---|---|
| `personal-loan-eligibility` | Strapi API module for ON/OFF lender matching (19-step engine) | Module path `src/api/personal-loan-eligibility/`; see [docs/Personal-Loan-Eligibility.md](docs/Personal-Loan-Eligibility.md) |
| `lenders-criteria-pl` | Per-lender PL eligibility thresholds | UID: `api::personal-loan-eligibility.lenders-criteria-pl`; table `lenders_criteria_pl`; REST `/api/lenders-criteria-pls`; soft-links via `lenderCode`; hidden from Content Manager |
| Match APIs | Run eligibility + scoring for a lead | `GET/POST /api/personal-loan-eligibility/matched-lenders?leadId=`; `POST /api/personal-loan-eligibility/evaluate`; compact text audit under `logs/pl-eligibility/<leadId>-<Name>_YYYY-MM-DD.log`; pipeline `ELIGIBILITY → SCORING → RANK`; Admin **AI Match** → `/lenders?leadId=` shows lenders with `score >= 40` only |
| Step 4 (`A1-DPD-LATEST`) | Latest open-account DPD | `latestDpdDays <= max_dpd_days_allowed`; SKIP if threshold null or no history; activity `PL_ELIGIBILITY_RULE` / `_SKIP` + file `logStep` |
| Step 6 (`A1-03-INCOME`) | Minimum Monthly Income | Uses `netSalary + otherIncomeAmount` when `hasOtherIncome` is true; otherwise `netSalary` vs `min_monthly_income`; SKIP when threshold null |
| Step 9–10 (`A1-07` / `A1-08`) | DPD Last 3m / 12m | Per lender: count unique months where payment-history DPD days > `max_dpd_days_allowed`, then compare to `max_dpd_count_*months` |
| Step 15 (`A1-05-PF`) | PF Deducted rule | Compares `form_data.incomeDetails.pfDeducted` vs `lenders_criteria_pl.pf_required`; SKIP when PF not required, FAIL when required but not true |

### Personal Loan Scoring

| Collection / module | Purpose | Key fields / notes |
|---|---|---|
| `personal-loan-scoring-criteria` | A.3 weighted scoring + rank (≥40 display) | Module path `src/api/personal-loan-scoring-criteria/`; see [docs/personal-loan-scoring-criteria/](docs/personal-loan-scoring-criteria/) |
| `lender-scoring-criteria` | Platform criterion catalog (weights + JSON bands) | UID: `api::personal-loan-scoring-criteria.lender-scoring-criteria`; table `lender_scoring_criteria`; REST `/api/lender-scoring-criterias`; hidden from Content Manager |
| Seed data | Import 11 PL criteria rows | `database/seed-data/lender-scoring-criteria.sql` — run via `psql` after Strapi creates the table |
| Scoring APIs | Score / rank helpers | `POST /api/personal-loan-scoring-criteria/score`; `POST /api/personal-loan-scoring-criteria/rank`; orchestrated from `matched-lenders` after A.1 PASS |
| Pipeline | Locked order | `ELIGIBILITY → SCORING → RANK`; 11 criteria (weights sum 100); `minDisplayScore = 40` for AI Match UI |
| File audit | Per-lead scoring log | `logs/pl-scoring/<leadId>-<Name>_YYYY-MM-DD.log`; lender `summary.criterionScores` + `PL_SCORE_*` activity events |
| Rounding | Criterion + total | Round half-up to integer on each criterion `points`; `totalScore` = sum of rounded points before rank/display |

### Personal Loan / Lender Matching & Bureau Extraction

| Collection / module | Purpose | Key fields / notes |
|---|---|---|
| `bureau-data-extraction` | Strapi API module for bureau/salary PDF extraction and persistence | UID: `api::bureau-data-extraction.cibil-report-summary`; Python sub-project in `integrations/python/`; Strapi service `python-bridge.ts` + `POST /api/cibil-report-summaries/extract` |
| `cibil-report-summary` | Content type inside `bureau-data-extraction`; stores structured bureau + salary JSON per lead | `leadId`, `loanApplicationId` (optional), `cibilData`, `salarySlipData`, `dataSource` (`PDF_EXTRACTION` for AI/PDF pipeline); table `cibil_report_summary`; hidden from Content Manager |

See [docs/Lender-Master.md](docs/Lender-Master.md), [docs/Python-Integration-Bureau-Data-Extraction.md](docs/Python-Integration-Bureau-Data-Extraction.md), [docs/BRD-Personal-Loan.md](docs/BRD-Personal-Loan.md), [docs/HLD-Personal-Loan.md](docs/HLD-Personal-Loan.md), [docs/LLD-Personal-Loan.md](docs/LLD-Personal-Loan.md).

### CMS / Page-Content Collections

These are single-type or collection-type entries managed via Strapi admin for frontend content:

| Collection | Purpose |
|---|---|
| `homepage` | Home page content |
| `about-us-page` | About Us page content |
| `contact-us-page` | Contact Us page content |
| `header` | Global header content |
| `footer` | Global footer content |
| `global-setting` | Site-wide settings |
| `lead-form-page` | Lead capture form page content |
| `loan-application-page` | Loan application page content |
| `product-page` | Products page content |
| `advisor-registration-page` | Advisor onboarding page content |

## Architecture Patterns

### Strapi Backend

- **Bootstrap Logic** (`src/index.ts`):
  - Creates a `strapi-advisor` admin role on startup
  - Syncs approved advisors to Strapi admin users (enables dashboard login)
  - When an advisor is approved, an admin account is auto-created with their email/password
- **Email Templates** (`src/email-templates/`): Used by Strapi for notifications
- **Admin Extensions** (`src/admin/`): Custom admin panel UI overrides
- **Direct DB access**: Uses `strapi.db.query()` API (Strapi v5 pattern), not raw SQL

### Next.js Frontend

- **App Router**: Uses `src/app/` directory with file-based routing
- **API Proxy**: The `next.config.ts` rewrites:
  - `/strapi-api/upload` → `http://127.0.0.1:1337/api/upload`
  - `/strapi-api/:path*` → `http://127.0.0.1:1337/api/:path*`
  - This allows frontend to call Strapi without CORS issues
- **Components**: Shared UI in `src/app/components/` — `Header`, `Footer`, `MobileNav`, `MaintenanceShield`
- **Data Layer** (`src/lib/`):
  - `strapi.ts` — `strapiPublicApi()` helper for building API URLs
  - `safeStorage.ts` — `safeLocalStorage()` / `safeSessionStorage()` wrappers (SSR-safe)
  - `logger.ts` — client-side logging utility

### User Roles & Access

The platform has three distinct admin roles:

| Role | Description | Access |
|---|---|---|
| `Advisor` | Lead generator / DSA | Manages their own leads and loan applications |
| `Staff` | Internal processor | Assigned to loan applications via `assignedStaffId`; product-gated via `user-product-mapping` |
| `Banker` | Bank-side reviewer | Assigned via `assignedBankerId`; product-gated; has separate remark field |

- Approved advisors are synced to Strapi admin users on bootstrap (`advisorStatus: 'Approved'`)
- Staff and Bankers are admin users with `user-product-mapping` records determining which products they handle
- `loan-app-section-permission` controls form section visibility per role

### Lead & Loan Application Flow

1. Advisor shares referral link → customer submits **Lead** via `/lead-form`
2. Advisor reviews lead in `/advisor-dashboard` → initiates **Loan Application**
3. Customer completes loan application at `/loan-application` (multi-step form with document uploads)
   - Income step (`form_data.incomeDetails`) for Personal Loan, Home Loan (salaried), and LAP (salaried) includes: `companyName`, `designation`, `companyAddress`, `netSalary`, `salaryMode`, `jobStability` (months as numeric string), `pfDeducted` (boolean), `hasOtherIncome` (boolean), and when `hasOtherIncome` is true: `otherIncomeSource`, `otherIncomeAmount`
4. Staff is assigned (`assignedStaffId`) to process the application
5. Banker is assigned (`assignedBankerId`) for final review
6. Remarks/conversation history tracked in `lead-remark` (separate fields per role type)
7. On success, customer is redirected to `/loan-application-success`

### Bureau Data Extraction Flow (partial — implemented)

1. Documents uploaded during `/loan-application` → Strapi Media Library `API Uploads/{leadId}-{applicantNameNoSpaces}/` and moved on disk to `public/uploads/api_uploads/{leadId}-{applicantNameNoSpaces}/` (`cibilReport` saved as `cibil_report.pdf`)
2. **`syncLeadDocumentsToDisk`** creates the folder and, when `cibil_report.pdf` is present, **`queueBureauExtraction`** runs Python extraction in the background (no manual `npm run extract:bureau`)
3. **`python-bridge.ts`** spawns Python (`pdf_extractor/tests/test_field_extraction.py`); auto-resolves `<project-root>/.venv/bin/python3`
4. Python extracts bureau fields → `pdf_extractor/data/outputs/extracted_fields.json`, including:
   - PERSONAL DETAILS: `consumer_name`, `date_of_birth`, `gender`
   - CONTACT / EMAIL / EMPLOYMENT: `telephone_numbers` (top 2), `email_id` (top 1), `employment_account_type`, `employment_date_reported`, `occupation`
   - OPEN ACCOUNTS: structured `open_accounts[]` (ACCOUNT DETAILS + PAYMENT STATUS; payment history last 12 months)
   - ENQUIRY DETAILS: structured `enquiries[]` (member, date, purpose; last 3 months)
   - Also: `cibil_score`, `pan_number`, `permanent_address`, `active_unsecured_loan_count`
5. Service reads JSON outputs and upserts via **`strapi.db.query()`** into `cibil_report_summary` (`cibilData` JSON)
6. PDF input directory: `public/uploads/api_uploads/{leadId}-{applicantNameNoSpaces}/`
7. Troubleshooting re-run: `POST /api/cibil-report-summaries/extract` or `npm run extract:bureau`
8. **Not yet wired:** matching engine consumption; full salary-field pipeline

Config / parsers: [`configs/fields.yaml`](src/api/bureau-data-extraction/integrations/python/pdf_extractor/configs/fields.yaml), `extract_open_accounts.py`, `extract_enquiries.py`, `extract_telephone_numbers.py`. Backups: `pdf_extractor/_backup_20260713_155651/`, `backups/bureau-fields-remove-legacy_*`, `backups/docs-bureau-extract/`.

Setup: [docs/Python-Integration-Bureau-Data-Extraction.md](docs/Python-Integration-Bureau-Data-Extraction.md)

## Database & Migrations

Migrations are in `database/migrations/` and run automatically on Strapi startup (Knex-based).

Recent migrations:
- `2026.05.25` — Rename staff-product-mappings table
- `2026.05.26` — Add `user_role` column to user-product-mappings
- `2026.06.01` — Drop product columns from admin_users (moved to user-product-mapping)
- `2026.06.01` — Rename advisor_remark → `advisor_admin_staff_remark`, add `banker_admin_staff_remark`
- `2026.07.14` — Drop `advanced_lenders_criteria_pl`, `hdfc-bank-pages`, `axis-bank-pages`, `lender_business_exclusions` (removed modules)
- `2026.07.28` — Drop unused PL criteria columns (`max_dpd_count_6months`, `max_new_personal_loans_6months`, `typical_interest_rate`)
- `2026.08.07` — Activity log Lead Timeline columns (`lead_id`, `lead_name`, `category`, `correlation_id`) + enum/backfill

## Environment Setup

Copy `.env.example` to `.env` and update:
- `HOST`, `PORT` (Strapi server)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET` (Strapi security)
- `JWT_SECRET`, `ENCRYPTION_KEY` (API auth)
- Database connection details (if not using default localhost)
- **Python extraction:** bootstrap `ensurePythonEnvironment()` auto-creates `.venv` and installs deps on first `npm run dev`; optional `PYTHON_PATH` in `.env`

### Global Setting — logging toggles

Admin **Global Setting** single type:

| Field | UI meaning | Controls |
|-------|------------|----------|
| `activityLoggingIsEnabled` | Activity Logs | DB `activity_logs` (errors/critical still write when off) |
| `codeLevelLoggingIsEnabled` | Code-level logs | Disk files under `logs/<module>/` (per-lead when lead known) |
| `loggingRetentionDays` | Log retention (days) | Midnight cron deletes Activity Log rows **and** code-level files under `logs/` older than this (default 30) |

File log convention (lead runs): `logs/<module>/<leadId>-<NameNoSpaces>_YYYY-MM-DD.log`  
Example: `logs/pl-eligibility/125-TestDeveloper_2026-08-07.log`  
System / no-lead fallback: `logs/<module>/<module>_YYYY-MM-DD.log`

**Overwrite on rerun:** When a per-lead log file already exists for the same UTC day, each module **truncates it at the start of a new run** (via `resetModuleLeadLog` in [`code-file-logger.ts`](src/utils/code-file-logger.ts)) instead of appending. Applies to pl-eligibility, pl-scoring, bureau-extraction (re-extract), and pl-lead-submission on new lead submit (`LEAD_SUBMIT_*`); loan-app / validation lines append within the same submission journey.

| Module | Path |
|--------|------|
| PL eligibility | `logs/pl-eligibility/<leadId>-<Name>_YYYY-MM-DD.log` |
| Bureau extraction (Python) | `logs/bureau-extraction/<leadId>-<Name>_YYYY-MM-DD.log` |
| PL lead submission | `logs/pl-lead-submission/<leadId>-<Name>_YYYY-MM-DD.log` (Strapi lead create, loan-app create, client audit) |
| PL scoring | `logs/pl-scoring/<leadId>-<Name>_YYYY-MM-DD.log` |

Shared helper: [`src/utils/code-file-logger.ts`](src/utils/code-file-logger.ts).  
Submission audit helper: [`src/utils/pl-lead-submission-logger.ts`](src/utils/pl-lead-submission-logger.ts).

**Events** (one JSON line each): `LEAD_SUBMIT_SUCCESS`, `LEAD_SUBMIT_ERROR`, `LOAN_APP_SUBMIT_SUCCESS`, `LOAN_APP_SUBMIT_ERROR`, `VALIDATION_ERROR`, `CLIENT_ERROR`.

**Writers**

| Trigger | Source |
|---------|--------|
| `POST /api/leads` success/error | [`src/api/lead/controllers/lead.ts`](src/api/lead/controllers/lead.ts) |
| `POST /api/loan-applications` success/error | [`src/api/loan-application/controllers/loan-application.ts`](src/api/loan-application/controllers/loan-application.ts) |
| Client validation / upload errors | `POST /api/pl-submission-audit/log` ← [`frontend/src/lib/plSubmissionLogger.ts`](frontend/src/lib/plSubmissionLogger.ts) |
| Automation script | [`PL_LeadSubmittionScript/scripts/submitApplication.js`](PL_LeadSubmittionScript/scripts/submitApplication.js) |

PII in `fields` is masked server-side (PAN/Aadhaar); `pdfPasswords` values are omitted (keys only). Pre-lead-create client validation uses module daily fallback when `leadId` is absent.

## Key Files to Know

- **[src/index.ts](src/index.ts)** — Bootstrap logic for advisor role creation and syncing
- **[frontend/next.config.ts](frontend/next.config.ts)** — API rewrite rules and allowed origins
- **[frontend/src/lib/strapi.ts](frontend/src/lib/strapi.ts)** — `strapiPublicApi()` URL helper
- **[frontend/src/lib/safeStorage.ts](frontend/src/lib/safeStorage.ts)** — SSR-safe localStorage/sessionStorage wrappers
- **[src/api/](src/api/)** — All Strapi collections
- **[frontend/src/app/](frontend/src/app/)** — All frontend routes and pages
- **[src/api/activity-log/](src/api/activity-log/)** — Activity audit; `logEvent` promotes `leadId`/`leadName`/`category`/`correlationId`; admin **Activity Logs** (**Lead** \| **Users & Auth** \| **System**); shared `/admin` login → `LOGIN_*` with `roleKind`; coverage in [docs/Activity-Log.md](docs/Activity-Log.md) (most `PL_ELIGIBILITY_RULE*` file-only; `A1-DPD-LATEST` also writes DB `PL_ELIGIBILITY_RULE` / `_SKIP`)
- **[src/api/lead/](src/api/lead/)** — Lead API; on create logs `LEAD_SUBMIT_SUCCESS` / `LEAD_SUBMIT_ERROR` to `logs/pl-lead-submission/<leadId>-<Name>_YYYY-MM-DD.log`; exposes `POST /api/pl-submission-audit/log` for client validation errors
- **[src/api/loan-application/](src/api/loan-application/)** — Loan app API; on create logs `LOAN_APP_SUBMIT_*` to per-lead submission file, links uploads to Media Library `API Uploads/{leadId}-{name}/` and moves them to `public/uploads/api_uploads/{leadId}-{name}/`
- **[src/api/bureau-data-extraction/](src/api/bureau-data-extraction/)** — Bureau PDF extraction (`POST /api/cibil-report-summaries/extract`; reads `public/uploads/api_uploads/`)
- **[src/api/lender-master/](src/api/lender-master/)** — Lender master registry + zip coverage (`lenders-catalog`, `zip-code`)
- **[src/api/personal-loan-eligibility/](src/api/personal-loan-eligibility/)** — PL eligibility thresholds + 19-step matching engine (`matched-lenders` / `evaluate`; file audit in `logs/pl-eligibility/<leadId>-<Name>_YYYY-MM-DD.log`)
- **[src/api/personal-loan-scoring-criteria/](src/api/personal-loan-scoring-criteria/)** — PL scoring catalog + weighted scoring/ranking (`score` / `rank`; file audit in `logs/pl-scoring/<leadId>-<Name>_YYYY-MM-DD.log`)
- **[docs/personal-loan-scoring-criteria/](docs/personal-loan-scoring-criteria/)** — PL scoring criteria, formulas, seed data, API contracts
- **[docs/Personal-Loan-Eligibility.md](docs/Personal-Loan-Eligibility.md)** — PL eligibility rules, logging, AI Match → `/lenders`
- **[docs/Python-Integration-Bureau-Data-Extraction.md](docs/Python-Integration-Bureau-Data-Extraction.md)** — `.venv` setup and extraction runbook
- **[docs/Lender-Master.md](docs/Lender-Master.md)** — Lender Master module reference

## Notes

- Strapi admin panel requires advisor to have `advisorStatus: 'Approved'` before admin account is created
- The frontend and backend must be running simultaneously for full local development
- Strapi v5 uses the newer `db.query()` API for direct database access (used in bootstrap logic)
- Next.js `reactStrictMode` is intentionally disabled (`false`) — be aware when debugging React component lifecycle issues
- Server Actions are configured with `allowedOrigins: ['scalex.local', 'localhost:3000']`
- Staff/Banker assignment uses Strapi admin user IDs (not advisor collection IDs)
- `lead-remark` is a flat record per lead (not an array) — remarks are appended text blobs, not individual comment objects
- The deprecated `lender` collection (`lenders` table) has been removed; the public `/lenders` page and all lender data now read from `lenders-catalog` inside **`lender-master`** (UID `api::lender-master.lenders-catalog`). The `lenders` table is dropped via a migration — the old `name`/`interestRateOffer`/`matchPercentage`/`applyUrl`/`logo` display fields no longer exist, the page now shows `lenderName`/`lenderType`/`lenderCode`
- **[database/migrations/](database/migrations/)** — Schema migration history
- The `lenders-page` / `lenders-catalog-page` single type (CMS copy for the `/lenders` page header) has been removed entirely, table `lenders_catalog_page` dropped. The `/lenders` page header text is now hardcoded ("Matched Lenders" / "Based on your application...") in `frontend/src/app/lenders/page.tsx`
- The `lenders-catalog` and `zip-code` collections live under the **`lender-master`** API folder (UIDs `api::lender-master.lenders-catalog`, `api::lender-master.zip-code`), not top-level `src/api/lenders-catalog/` / `src/api/zip-code/` paths
- The `cibil-report-summary` collection lives under the **`bureau-data-extraction`** API folder (UID `api::bureau-data-extraction.cibil-report-summary`), not a top-level `src/api/cibil-report-summary/` path
- Bureau extraction auto-triggers when `cibil_report.pdf` lands in `public/uploads/api_uploads/` via `syncLeadDocumentsToDisk`; PL scoring runs after A.1 eligibility in `matched-lenders` pipeline

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
