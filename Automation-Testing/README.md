# ScaleX Automation Testing Suite

Dashboard for Personal Loan and Business Loan testing: **Rules & Scoring Reference** (pipeline field/rule docs), offline **Journey Demo** (disk logs), and gated **Live Run**.

## Quick start

```bash
cd Automation-Testing
npm install
npm run dashboard
```

Open:

- **Preferred:** [http://127.0.0.1:4100/suite/](http://127.0.0.1:4100/suite/)
- **Via Next.js:** [http://localhost:3000/suite/](http://localhost:3000/suite/) (dashboard + `cd frontend && npm run dev`)

Hard-refresh (`Ctrl+Shift+R`) after updates so `/suite/app.js` reloads.

## Configuration (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4100` | Express listen port |
| `BASE_PATH` | `/suite` | Mount path |
| `STRAPI_URL` | `http://127.0.0.1:1337` | Strapi base URL |
| `SUITE_ADVISOR_REFERRAL_ID` | _(empty)_ | Optional advisor referral on Live Run lead create |
| `BUREAU_POLL_MS` | `3000` | Poll interval while waiting for CIBIL extract |
| `BUREAU_TIMEOUT_MS` | `300000` | Max wait for bureau (5 minutes) |

**Strapi is optional** for Rules & Scoring Reference / Journey Demo.  
**Required** for Live Run (`npm run dev` at repo root).

## Dashboard sections

| Section | Mode | What it does |
|---------|------|----------------|
| **Rules & Scoring Reference** | Offline | Product dropdown + Lead / Bureau / Eligibility / Scoring docs (formulas & field sources) |
| **Journey Demo** | Offline | Filter by loan type + stage; load latest or specific lead logs from `logs/` (Legacy-style lender tables) |
| **Live Run** | **Writes DB** | Create lead → upload docs → bureau → matched-lenders → detailed report |

### Rules & Scoring Reference (offline)

1. Choose **Product type** (Personal / Business Loan).
2. Click **Lead Submission**, **Bureau extraction**, **Eligibility**, or **Scoring**.
3. Results list rules/fields like `eligibility_rule` / `PL-PRE-ACTIVE` with condition, formula, and data sources.

Rebuild the docs fixture after rule/catalog changes:

```bash
npm run build:pipeline-docs
```

### Journey Demo (offline)

1. Pick **Loan Type** and **Stages**.
2. Leave **Lead ID** empty for the latest lead, or enter an ID (wrong product type returns an error naming the correct product).
3. **Load** — Lead Submission shows Lead then Loan-app funnel tables; Eligibility/Scoring use a lender dropdown and Legacy-style step tables.

### Live Run (important)

1. Start Strapi (`npm run dev`).
2. Open `/suite` → **Live Run** → pick product → confirm → **Start Live Run** (`202` async).
3. Open the detailed HTML report when ready.

Documents come from `documents/personal-loan/` or `documents/business-loan/` (`config/products.json`).

## CLI

```bash
npm run dashboard
npm run build:pipeline-docs
npm run build:registry
npm run test:fixtures
npm run journey -- personal-loan --fail-lab
```

## Outputs

| Output | Path |
|--------|------|
| Pipeline docs | `fixtures/pipeline-docs.json` |
| Run report | `reports/runs/<runId>/report-<runId>.html` |
| Fixture matrix | `reports/fixtures/latest.html` (CLI) |

## API (under `/suite`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | `{ strapiReachable }` |
| GET | `/api/pipeline-docs` | `product` + `section` (lead-submission \| bureau \| eligibility \| scoring) |
| GET | `/api/journey-demo` | Offline lead log viewer (errors if leadId belongs to the other product type) |
| POST | `/api/live-run` | `{ product, confirm: true }` → **202** |
| GET | `/api/live-run/:runId` | Async Live Run status |
| POST | `/api/journey` | CLI companion only (not used by UI); optional `{ failLab: true }` |

## Dual-layer testing strategy

- **Rules & Scoring Reference** — reference every field/rule offline.
- **Journey Demo** — inspect real disk logs for any lead.
- **Fixtures** — PASS/FAIL matrix via CLI (`npm run test:fixtures`).
- **Live Run** — full integration with real bureau and match.
