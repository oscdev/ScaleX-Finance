# Data-Import-Manager

CSV bulk import for ScaleX master data.

- **Browser (preferred):** open **`/data-import-manager`** on the Next.js site (same domain/port — no extra server).
- **CLI (optional):** `npm run import:zipcodes` from the repo root.

Uses PostgreSQL credentials from the project-root `.env` (`DATABASE_*`). Does **not** need a separate `node_modules` under this folder.

## Layout

```
Data-Import-Manager/
  table/zipcodes/{upload,processed,logs,templates}/
  lib/          # db, csv, logger, runner, importers-registry
  importers/zipcodes.js
  cli.js
  run-job.js    # used by the Next.js API
```

Future tables: add `table/<name>/` + `importers/<name>.js` + registry entry.

## Zip codes → `zip_codes_to_lenders`

| Path | Purpose |
|------|---------|
| `table/zipcodes/upload/` | Drop / UI-upload CSVs |
| `table/zipcodes/processed/` | `{name}_{YYYYMMDD-HHMMSS}.csv` after success |
| `table/zipcodes/logs/` | Human-readable `.log` + optional `*_errors.csv` |
| `table/zipcodes/templates/zip_codes_to_lenders.sample.csv` | Column example |

### Browser

With Next running (`cd frontend && npm run dev`):

1. Open `/data-import-manager`
2. Choose CSV, optional dry run, Import
3. Read the log pane (plain English lines)

### CLI

```bash
npm run import:zipcodes
npm run import:zipcodes -- --dry-run
```

### CSV columns

| Column | Required | Notes |
|--------|----------|-------|
| `lenderCode` | yes | Must exist in `lenders_catalog` |
| `loanType` | yes | `PL` \| `BL` \| `HL` \| `LAP` (labels like `Personal Loan` OK) |
| `zipCode` | conditional | 6-digit PIN when `coversAllPincodes=false`; empty when nationwide |
| `coversAllPincodes` | yes | `true`/`false` (also `1`/`0`, `yes`/`no`) |
| `isActive` | no | Default `true` |

### Upsert

- Specific pin: `(lender_code, zip_code, loan_type)`
- Nationwide: `(lender_code, loan_type)` where covers-all and `zip_code` is null
- Rows missing from the CSV are **not** deleted

### Log format

```text
2026-09-14 18:45:02  INFO   Import started — zipcodes → zip_codes_to_lenders (dry run: no)
2026-09-14 18:45:03  WARN   Row 14 rejected — lenderCode "FOO" not found in lenders_catalog
2026-09-14 18:45:04  INFO   Import finished — 1 file(s), OK (1.2s)
```
