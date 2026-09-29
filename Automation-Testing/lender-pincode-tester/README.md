# Lender Pincode Tester

Browser form to check whether a pincode is covered for a selected product (PL/BL) and lender in `zip_codes_to_lenders`.

## URL

Path-only (host = current domain): **`/lender-pincode-tester`**

Examples:

- Via Next (same proxy host as `/suite`): `http://localhost:3000/lender-pincode-tester`
- Direct suite Express: `http://127.0.0.1:4100/lender-pincode-tester`

Uses the **same port as `/suite`** (`SUITE_PORT` / default `4100`). No separate port.

## Setup

Uses project-root `pg` and `.env` `DATABASE_*` (same as Strapi). No extra install in this folder.

Restart Strapi (`npm run dev` / `npm run start`) so the suite process on `:4100` reloads with this mount. Restart Next if rewrites were just added.

## Form

1. **Product Type** — active rows from `products`
2. **Lenders** — PL → `lenders_criteria_pl` ⋈ `lenders_catalog`; BL → `lenders_criteria_bl` ⋈ `lenders_catalog`
3. **ZipCodes** — integer pincode check against `zip_codes_to_lenders` (`loan_type` + `lender_code`, including `covers_all_pincodes`)
