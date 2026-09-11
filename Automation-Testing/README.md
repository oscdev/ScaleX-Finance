# ScaleX Automation Testing Suite

Dashboard for Personal Loan and Business Loan testing: **Rules & Scoring Reference** (pipeline field/rule docs), offline **Journey Demo** (disk logs), and gated **Live Run**.

## Quick start

Strapi starts the dashboard. From the repo root:

```bash
npm run dev
```

Open:

- [http://127.0.0.1:4100/suite/](http://127.0.0.1:4100/suite/)
- **Via Next.js:** [http://localhost:3000/suite/](http://localhost:3000/suite/) (`cd frontend && npm run dev`)

You do **not** need `cd Automation-Testing && npm run dashboard`. That CLI is optional if Strapi is not running. If `:4100` is already in use, Strapi leaves it alone.

Hard-refresh (`Ctrl+Shift+R`) after updates so `/suite/app.js` reloads.

Suite npm deps: Strapi bootstrap installs `Automation-Testing` packages on first start if `node_modules` is missing. Manual fallback:

```bash
cd Automation-Testing && npm install --omit=dev
```

### Server deploy

`/suite` is **not** started by Next.js (`scalex-frontend`). After `git pull`:

1. Restart **Strapi** (so bootstrap binds `127.0.0.1:4100`). Check logs for `[suite] dashboard started`.
2. Restart **Next.js**.
3. Confirm `ss -lntp | grep 4100`. Repo-root `.env` must not set `SUITE_DASHBOARD=false`.

If Next logs `ECONNREFUSED 127.0.0.1:4100`, Strapi did not start the dashboard (or it crashed). The frontend rewrite only proxies to that port.

If you change `SUITE_PORT`, set the same value for Strapi and for Next (`SUITE_PORT` or `SUITE_PROXY_ORIGIN` in the frontend env), then rebuild/restart Next.

## Configuration (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SUITE_PORT` / `PORT` | `4100` | Express listen port (`PORT` only when running `npm run dashboard` so it does not steal Strapi's `PORT=1337`). Next rewrite uses the same `SUITE_PORT` (or `SUITE_PROXY_ORIGIN`) |
| `BASE_PATH` | `/suite` | Mount path |
| `STRAPI_URL` | `http://127.0.0.1:1337` | Strapi base URL |
| `SUITE_DASHBOARD` | _(on)_ | Set `false` in the **repo root** `.env` to skip starting `/suite` from Strapi |
| `SUITE_PROXY_ORIGIN` | `http://127.0.0.1:$SUITE_PORT` | Optional Next.js rewrite origin (frontend env). Default matches Strapi's suite bind |
| `SUITE_ADVISOR_REFERRAL_ID` | _(empty)_ | Optional advisor referral on Live Run lead create |
| `BUREAU_POLL_MS` | `3000` | Poll interval while waiting for CIBIL extract |
| `BUREAU_TIMEOUT_MS` | `300000` | Max wait for bureau (5 minutes) |

**Strapi is optional** for Rules & Scoring Reference / Journey Demo.  
**Required** for Live Run (`npm run dev` at repo root). Live Run writes under `reports/` do **not** restart Strapi Admin (`watchIgnoreFiles` includes `Automation-Testing/**`).

## How to use this page (`/suite`)

1. **Live Run** (needs Strapi) — pick product → confirm → **Start** with no files (one lead from the default 25) **or** attach CSV and Documents together then Start (max 5).
2. **Rules & Scoring Reference** (offline) — pick product → open Lead / Bureau / Eligibility / Scoring docs.
3. **Journey Demo** (offline) — pick loan type + stage → optional Lead ID → Load. On Eligibility, use **Show** (`All lenders` / `Eligible only` / `Failed only`) then pick a lender — same grouping as `report.html`.

## Dashboard sections

| Section | Mode | What it does |
|---------|------|----------------|
| **Rules & Scoring Reference** | Offline | Product dropdown + Lead / Bureau / Eligibility / Scoring docs (formulas & field sources) |
| **Journey Demo** | Offline | Filter by loan type + stage; load latest or specific lead logs from `logs/`. Eligibility uses the same **Show** filter as the Live Run report (`All lenders` / `Eligible only` / `Failed only`, PASS/FAIL groups) |
| **Live Run** | **Writes DB** | No files: one `[SUITE-TEST]` lead from `documents/default/{product}/`. CSV + Documents together: up to 5 rows; filename columns match attached PDFs. Files persist in Strapi `public/uploads/api_uploads/{leadId}-{name}/`. Then bureau → matched-lenders → report |

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
3. **Load** — Lead Submission shows Lead then Loan-app funnel tables. Eligibility uses the same **Show** filter as `reports/runs/{product}/report.html` (`All lenders` / `Eligible only` / `Failed only`) with Eligible (PASS) and Not eligible (FAIL) groups, then a lender step table. Scoring uses a lender dropdown and criterion table.

### Live Run (important)

1. Start Strapi (`npm run dev`) — `/suite` comes up on `:4100` with the backend. Do not stop/restart Admin after a Live Run.
2. Open `/suite` → **Live Run** → pick product → confirm → **Start Live Run** (`202` async). Leave CSV and Documents empty for the default pool, or attach **both** together (neither alone).
3. Required lead and loan-application fields, plus required document files, are checked **before** any POST. If a check fails, nothing is written.
4. **No files** — one unique `[SUITE-TEST]` lead for the selected product, taken from `documents/default/{product}/sample-default-{product}.csv` (25-row pool; each Start uses the next row). Required and optional dummy values are filled, including Other-step `runningLoans` (JSON array) and, for Personal Loan, other-income source/amount. PDFs from the same folder (Personal Loan uses `salary_slip.pdf`). Identity is re-stamped each Start. The shared default PDFs may be reused.
5. **CSV + Documents** — attach both on the same Start (400 if only one is present). Header + 1–5 data rows (see `documents/default/{product}/live-run.example.csv`). Document columns are filenames (`aadhaar_front`, `cibil`, `salary_slip`, …) matched to the PDFs attached on Start. The CSV is overwritten at `documents/upload/{product}/live-run.csv`; PDFs are not stored there. More than 5 rows → **400**, no POST. Required fields only. Identity (email, mobile, PAN, Aadhaar) must be unique in the file. Names missing `[SUITE-TEST]` are prefixed. For **Business Loan**, CSV column `turnover` is **full ₹** (e.g. `5000000`); Live Run converts to Lakh before writing `form_data.businessDetails.turnover` (loan form contract). The suite report and Journey Demo show the **full rupee** amount, not Lakh.
6. Runs are sequential. A lead without a saved loan application is a failed row. Uploaded CSV is stored at `reports/runs/{product}/input.csv` and `documents/upload/{product}/live-run.csv` (not reused as the next run’s input unless you upload again). Each Start **overwrites** that product’s report folder. PDFs persist on the lead under `public/uploads/api_uploads/{leadId}-{name}/`.

## Tips

- **Strapi** is required only for Live Run. Rules & Scoring Reference and Journey Demo work offline.
- Journey Demo **Lead ID** must match the selected Loan Type; otherwise the error names the correct product.
- Journey Demo **Eligibility** uses the same **Show** filter as the Live Run HTML report: All lenders, Eligible only, or Failed only.
- Hard-refresh (`Ctrl+Shift+R`) after suite UI updates so `/suite/app.js` reloads.
- Live Run HTML reports overwrite `Automation-Testing/reports/runs/{product}/` (one folder per product).
- CSV Upload is overwritten at `documents/upload/{product}/live-run.csv`. PDFs persist on the lead under `public/uploads/api_uploads/{leadId}-{name}/`.
- Business Loan Live Run `turnover` CSV values are absolute rupees (not Lakh). Suite report / Journey Demo display Annual Turnover in full ₹ even though `form_data` stores Lakh.
- Set `SUITE_ADVISOR_REFERRAL_ID` in `Automation-Testing/.env` if lead create requires an advisor referral.

## CLI

Optional. Prefer `npm run dev` at the repo root.

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
| Run report | `reports/runs/{product}/report.html` (CSV batch: `report-row-N.html`; overwritten on the next Start) |
| Fixture matrix | `reports/fixtures/latest.html` (CLI) |

## API (under `/suite`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | `{ strapiReachable }` |
| GET | `/api/pipeline-docs` | `product` + `section` (lead-submission \| bureau \| eligibility \| scoring) |
| GET | `/api/journey-demo` | Offline lead log viewer (errors if leadId belongs to the other product type) |
| POST | `/api/live-run` | JSON `{ product, confirm: true }` for one lead from the default 25-row pool, or `multipart/form-data` (`product`, `confirm`, `csv`, `documents` PDFs) for 1–5 rows. CSV and Documents must both be present or both omitted. **400** before any POST if the pair is incomplete, fields/docs fail, or CSV has more than 5 rows |
| GET | `/api/live-run/example.csv` | Sample CSV for `?product=personal-loan` or `business-loan` |
| GET | `/api/live-run/:runId` | Async status; `result.entries[]` (`leadId`, `loanAppId`, `reportUrl`, `cibilFile`, `ok`) |
| POST | `/api/journey` | CLI companion only (not used by UI); optional `{ failLab: true }` |

## Dual-layer testing strategy

- **Rules & Scoring Reference** — reference every field/rule offline.
- **Journey Demo** — inspect real disk logs for any lead.
- **Fixtures** — PASS/FAIL matrix via CLI (`npm run test:fixtures`).
- **Live Run** — full integration with real bureau and match.
