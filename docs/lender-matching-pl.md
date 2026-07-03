# Lender Matching — Personal Loan
## Database Schema: Table Definitions

> **Database**: PostgreSQL
> **Backend**: Strapi v5
> **Product**: Personal Loan (`_pl` suffix)
> **Draft & Publish**: Disabled on all collections

---

## Table Index

| # | Table Name | Purpose |
|---|---|---|
| 1 | `lenders_catalog` | Master lender registry |
| 2 | `zip_codes` | Serviceable pincodes per lender |
| 3 | `lender_business_exclusions` | Business types excluded per lender |
| 4 | `cibil_report_summary` | CIBIL & Salary Slip data per loan application |
| 5 | `lenders_criteria_pl` | All lender eligibility thresholds |
| 6 | `advanced_lenders_criteria_pl` | Per-period DPD & enquiry thresholds per lender |

---
 
## Execution Order

> Run in this exact order to satisfy FK dependencies.

```
1. ENUM Types
2. lenders_catalog
3. zip_codes
4. lender_business_exclusions
5. lenders_criteria_pl
6. advanced_lenders_criteria_pl
7. cibil_report_summary  ← depends on loan_applications (must exist first)
```

---

## ENUM Types

> Create ENUMs before running any table DDL. Safe to re-run.

```sql
DROP TYPE IF EXISTS lender_type_enum CASCADE;
CREATE TYPE lender_type_enum AS ENUM (
  'Private Bank',
  'Public Bank',
  'NBFC',
  'Fintech / Digital'
);

DROP TYPE IF EXISTS product_type_enum CASCADE;
CREATE TYPE product_type_enum AS ENUM (
  'Personal_Loan',
  'Business_Loan',
  'Home_Loan',
  'LAP'
);

DROP TYPE IF EXISTS data_source_enum CASCADE;
CREATE TYPE data_source_enum AS ENUM (
  'MANUAL',
  'CIBIL_API',
  'EXPERIAN',
  'EQUIFAX',
  'CRIF'
);
```

---

## Table 1 — `lenders_catalog`

**Description**: Master registry of all financial institutions. Single source of truth for lender identity. All other tables reference this via `lenders_catalog.id`.

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS lenders_catalog (
  id                SERIAL            PRIMARY KEY,
  document_id       VARCHAR(255)      NOT NULL UNIQUE,
  lender_name       VARCHAR(255)      NOT NULL UNIQUE,
  lender_type       lender_type_enum  NOT NULL,
  short_name        VARCHAR(50)       NOT NULL UNIQUE,
  is_active         BOOLEAN           NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ       DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       DEFAULT NOW(),
  created_by_id     INTEGER           REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id     INTEGER           REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lenders_catalog_lender_type ON lenders_catalog(lender_type);
CREATE INDEX IF NOT EXISTS idx_lenders_catalog_is_active   ON lenders_catalog(is_active);
```


---

## Table 2 — `zip_codes`

**Description**: Serviceable pincode list per lender.
- Lenders that serve **all pincodes** (all Banks + non-restricted NBFCs) → single row with `covers_all_pincodes = true` and `zip_code = NULL`.
- Lenders with **pincode restrictions** (Piramal, L&T) → individual rows per pincode with `covers_all_pincodes = false`.

**Matching Logic**:
```
covers_all_pincodes = true  → Eligible regardless of applicant pincode
covers_all_pincodes = false → Lookup: applicant pincode must exist in lender's zip_codes rows
```

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS zip_codes (
  id                    SERIAL        PRIMARY KEY,
  document_id           VARCHAR(255)  NOT NULL UNIQUE,
  lender_id             INTEGER       NOT NULL REFERENCES lenders_catalog(id) ON DELETE CASCADE,
  zip_code              VARCHAR(6)    DEFAULT NULL,
  covers_all_pincodes   BOOLEAN       NOT NULL DEFAULT false,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),
  created_by_id         INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id         INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Prevent duplicate specific pincode per lender
  CONSTRAINT uq_zip_codes_lender_zip UNIQUE (lender_id, zip_code)
);

-- Prevent more than one wildcard row per lender
CREATE UNIQUE INDEX IF NOT EXISTS uq_zip_codes_lender_wildcard
  ON zip_codes (lender_id)
  WHERE covers_all_pincodes = true;

CREATE INDEX IF NOT EXISTS idx_zip_codes_lender_id      ON zip_codes(lender_id);
CREATE INDEX IF NOT EXISTS idx_zip_codes_lender_zip     ON zip_codes(lender_id, zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_codes_covers_all     ON zip_codes(covers_all_pincodes);
```

---

## Table 3 — `lender_business_exclusions`

**Description**: Lenders refuse loans to applicants working in specific business types. Stores exclusion rules per lender per product type.

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS lender_business_exclusions (
  id              SERIAL              PRIMARY KEY,
  document_id     VARCHAR(255)        NOT NULL UNIQUE,
  lender_id       INTEGER             NOT NULL REFERENCES lenders_catalog(id) ON DELETE CASCADE,
  product_type    product_type_enum   NOT NULL,
  business_type   VARCHAR(255)        NOT NULL,
  reason          TEXT                DEFAULT NULL,
  is_active       BOOLEAN             NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ         DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         DEFAULT NOW(),
  created_by_id   INTEGER             REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id   INTEGER             REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Prevent duplicate exclusion per lender + product + business combination
  CONSTRAINT uq_lender_exclusion UNIQUE (lender_id, product_type, business_type)
);

CREATE INDEX IF NOT EXISTS idx_lbe_lender_id    ON lender_business_exclusions(lender_id);
CREATE INDEX IF NOT EXISTS idx_lbe_product_type ON lender_business_exclusions(product_type);
CREATE INDEX IF NOT EXISTS idx_lbe_is_active    ON lender_business_exclusions(is_active);
```

---

## Table 4 — `cibil_report_summary`

**Description**: Stores structured data extracted from two documents per loan application — the CIBIL bureau report and the salary slip. Used as the primary data source for all matching engine criteria checks.

> **Dependency**: `loan_applications` table must exist before creating this table.

### `cibil_data` JSON Structure

| JSON Field | Type | Used By Criteria |
|---|---|---|
| `cibil_score` | INTEGER | 1.1 CIBIL Score |
| `max_dpd_days` | INTEGER | 1.9 Max DPD Days |
| `dpd_count_3months` | INTEGER | 1.7 DPD Count 3M |
| `dpd_count_6months` | INTEGER | Future use |
| `dpd_count_12months` | INTEGER | 1.8 DPD Count 12M |
| `new_personal_loans_6months` | INTEGER | 1.10 New PL 6M |
| `enquiries_last_1month` | INTEGER | 1.11 Enquiries 1M |
| `enquiries_last_3months` | INTEGER | 1.12 Enquiries 3M |
| `total_cc_outstanding` | DECIMAL | 2.2 CCU |
| `total_cc_limit` | DECIMAL | 2.2 CCU |
| `existing_emi_total` | DECIMAL | 2.1 FOIR |
| `raw_response` | JSON | Audit / future use |

### `salary_slip_data` JSON Structure

| JSON Field | Type | Used By Criteria |
|---|---|---|
| `gross_salary` | DECIMAL | Reference only |
| `net_salary` | DECIMAL | 1.3 Min Monthly Income |
| `is_pf_deducted` | BOOLEAN | 1.5 PF Deducted |
| `pf_amount` | DECIMAL | Reference only |
| `employer_name` | STRING | Reference only |
| `salary_mode` | ENUM (`IN_ACCOUNT` / `CASH` / `CHEQUE`) | 1.4 Salary Type |
| `job_stability_months` | INTEGER | 1.6 Employment Stability |
| `date_of_birth` | DATE (`YYYY-MM-DD`) | 1.2 Age Eligibility |

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS cibil_report_summary (
  id                    SERIAL            PRIMARY KEY,
  document_id           VARCHAR(255)      NOT NULL UNIQUE,
  -- One CIBIL record per loan application (1:1)
  loan_application_id   INTEGER           NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
  lead_id               INTEGER           DEFAULT NULL,   -- Soft FK → leads.id (no hard constraint)
  cibil_data            JSONB             DEFAULT NULL,
  salary_slip_data      JSONB             DEFAULT NULL,
  data_source           data_source_enum  NOT NULL DEFAULT 'MANUAL',
  fetched_at            TIMESTAMPTZ       DEFAULT NULL,
  created_at            TIMESTAMPTZ       DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       DEFAULT NOW(),
  created_by_id         INTEGER           REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id         INTEGER           REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cibil_loan_application_id ON cibil_report_summary(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_cibil_lead_id             ON cibil_report_summary(lead_id);
CREATE INDEX IF NOT EXISTS idx_cibil_data_source         ON cibil_report_summary(data_source);

-- GIN indexes for fast JSONB field queries
CREATE INDEX IF NOT EXISTS idx_cibil_data_gin        ON cibil_report_summary USING GIN (cibil_data);
CREATE INDEX IF NOT EXISTS idx_salary_slip_data_gin  ON cibil_report_summary USING GIN (salary_slip_data);
```

---

## Table 5 — `lenders_criteria_pl`

**Description**: Stores all lender eligibility criteria — single-value thresholds, ratio limits, and count-based checks. One record per lender (1:1 with `lenders`).

> **FOIR** = Fixed Obligation to Income Ratio (Indian equivalent of DTI).
> Formula: `FOIR = (existing_emi_total + proposed_emi) / net_salary`
> `proposed_emi` is estimated using `typical_interest_rate` when not entered directly.

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS lenders_criteria_pl (
  id                              SERIAL        PRIMARY KEY,
  document_id                     VARCHAR(255)  NOT NULL UNIQUE,
  -- One criteria row per lender
  lender_id                       INTEGER       NOT NULL UNIQUE REFERENCES lenders_catalog(id) ON DELETE CASCADE,
  is_active                       BOOLEAN       NOT NULL DEFAULT true,

  -- Credit Score
  min_cibil                       INTEGER       DEFAULT NULL,
  first_time_borrower_allowed     BOOLEAN       NOT NULL DEFAULT false,

  -- Interest Rate (annual %)
  min_interest_rate               DECIMAL(5,2)  DEFAULT NULL,
  max_interest_rate               DECIMAL(5,2)  DEFAULT NULL,
  typical_interest_rate           DECIMAL(5,2)  DEFAULT NULL,  -- Used to estimate proposed EMI for FOIR

  -- Pincode
  pincode_check_required          BOOLEAN       NOT NULL DEFAULT false,

  -- Age (years)
  min_age                         INTEGER       DEFAULT NULL,
  max_age                         INTEGER       DEFAULT NULL,

  -- Income (₹/month)
  min_monthly_income              DECIMAL(12,2) DEFAULT NULL,

  -- Ratios (0.00 to 1.00)
  foir                            DECIMAL(3,2)  DEFAULT NULL,  -- e.g. 0.40 means 40% max
  max_cc_utilization_ratio        DECIMAL(3,2)  DEFAULT NULL,  -- e.g. 0.70 means 70% max

  -- Accounts
  max_active_unsecured_account    INTEGER       DEFAULT NULL,

  -- Salary
  accepted_salary_types           JSONB         DEFAULT NULL,  -- e.g. ["IN_ACCOUNT","CASH"]
  pf_required                     BOOLEAN       NOT NULL DEFAULT false,

  -- Employment
  min_employment_months           INTEGER       DEFAULT NULL,

  -- DPD Thresholds
  max_dpd_days_allowed            INTEGER       DEFAULT NULL,
  max_dpd_count_3months           INTEGER       DEFAULT NULL,
  max_dpd_count_12months          INTEGER       DEFAULT NULL,

  -- New Loans
  max_new_personal_loans_6months  INTEGER       DEFAULT NULL,

  -- Enquiries
  max_enquiries_1month            INTEGER       DEFAULT NULL,
  max_enquiries_3months           INTEGER       DEFAULT NULL,

  -- Loan Amount (₹)
  min_loan_amount                 DECIMAL(12,2) DEFAULT NULL,
  max_loan_amount                 DECIMAL(12,2) DEFAULT NULL,

  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW(),
  created_by_id   INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id   INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lcp_lender_id  ON lenders_criteria_pl(lender_id);
CREATE INDEX IF NOT EXISTS idx_lcp_is_active  ON lenders_criteria_pl(is_active);
```

---

## Table 6 — `advanced_lenders_criteria_pl`

**Description**: Stores per-period DPD and enquiry thresholds per lender. Flexible extension to `lenders_criteria_pl` — allows configuring criteria across multiple time periods (1M, 3M, 6M, 12M) without schema changes.
One row per lender per time period.

### CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS advanced_lenders_criteria_pl (
  id                  SERIAL        PRIMARY KEY,
  document_id         VARCHAR(255)  NOT NULL UNIQUE,
  lender_id           INTEGER       NOT NULL REFERENCES lenders_catalog(id) ON DELETE CASCADE,
  period_months       VARCHAR(3)    NOT NULL CHECK (period_months IN ('M1', 'M3', 'M6', 'M12')),
  max_dpd_count       INTEGER       DEFAULT NULL,   -- NULL = no restriction for this period
  max_enquiry_count   INTEGER       DEFAULT NULL,   -- NULL = no restriction for this period
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW(),
  created_by_id       INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by_id       INTEGER       REFERENCES admin_users(id) ON DELETE SET NULL,

  -- One row per lender per period
  CONSTRAINT uq_advanced_lender_period UNIQUE (lender_id, period_months)
);

CREATE INDEX IF NOT EXISTS idx_alcp_lender_id     ON advanced_lenders_criteria_pl(lender_id);
CREATE INDEX IF NOT EXISTS idx_alcp_period_months ON advanced_lenders_criteria_pl(period_months);
```

---

## Relationships Summary

```
lenders_catalog (id)
  ├── lenders_criteria_pl.lender_id          [1:1]
  ├── zip_codes.lender_id                    [1:Many]
  ├── lender_business_exclusions.lender_id   [1:Many]
  └── advanced_lenders_criteria_pl.lender_id [1:Many]

loan_applications (id)
  └── cibil_report_summary.loan_application_id [1:1]

leads (id)
  └── cibil_report_summary.lead_id [1:Many, Soft FK — no hard constraint]
```

---

## Matching Engine — Data Source Map

| Criteria | Validation Check | Applicant Source | Lender Source |
|---|---|---|---|
| 1.1 CIBIL Score | `cibil_score >= min_cibil` | `cibil_report_summary.cibil_data.cibil_score` | `lenders_criteria_pl.min_cibil` |
| 1.2 Age | `age >= min_age AND age <= max_age` | `cibil_report_summary.salary_slip_data.date_of_birth` | `lenders_criteria_pl.min_age`, `max_age` |
| 1.3 Monthly Income | `net_salary >= min_monthly_income` | `cibil_report_summary.salary_slip_data.net_salary` | `lenders_criteria_pl.min_monthly_income` |
| 1.4 Salary Type | `salary_mode IN accepted_salary_types` | `cibil_report_summary.salary_slip_data.salary_mode` | `lenders_criteria_pl.accepted_salary_types` |
| 1.5 PF Deducted | `is_pf_deducted = true` | `cibil_report_summary.salary_slip_data.is_pf_deducted` | `lenders_criteria_pl.pf_required` |
| 1.6 Employment Stability | `job_stability_months >= min_employment_months` | `cibil_report_summary.salary_slip_data.job_stability_months` | `lenders_criteria_pl.min_employment_months` |
| 1.7 DPD Count 3M | `dpd_count_3months <= max_dpd_count_3months` | `cibil_report_summary.cibil_data.dpd_count_3months` | `lenders_criteria_pl.max_dpd_count_3months` |
| 1.8 DPD Count 12M | `dpd_count_12months <= max_dpd_count_12months` | `cibil_report_summary.cibil_data.dpd_count_12months` | `lenders_criteria_pl.max_dpd_count_12months` |
| 1.9 Max DPD Days | `max_dpd_days <= max_dpd_days_allowed` | `cibil_report_summary.cibil_data.max_dpd_days` | `lenders_criteria_pl.max_dpd_days_allowed` |
| 1.10 New PL 6M | `new_personal_loans_6months <= max_new_personal_loans_6months` | `cibil_report_summary.cibil_data.new_personal_loans_6months` | `lenders_criteria_pl.max_new_personal_loans_6months` |
| 1.11 Enquiries 1M | `enquiries_last_1month <= max_enquiries_1month` | `cibil_report_summary.cibil_data.enquiries_last_1month` | `lenders_criteria_pl.max_enquiries_1month` |
| 1.12 Enquiries 3M | `enquiries_last_3months <= max_enquiries_3months` | `cibil_report_summary.cibil_data.enquiries_last_3months` | `lenders_criteria_pl.max_enquiries_3months` |
| 1.13 Min Loan Amount | `requested_loan_amount >= min_loan_amount` | `loan_applications.loan_amount` | `lenders_criteria_pl.min_loan_amount` |
| 1.14 Pincode | `pincode IN lender zip_codes` | `loan_applications.pincode` | `zip_codes` table — only when `pincode_check_required = true` |
| 2.1 FOIR | `(existing_emi + proposed_emi) / net_salary <= foir` | `cibil_data.existing_emi_total` + `salary_slip_data.net_salary` | `lenders_criteria_pl.foir` + `typical_interest_rate` |
| 2.2 CCU | `total_cc_outstanding / total_cc_limit <= max_cc_utilization_ratio` | `cibil_data.total_cc_outstanding` + `cibil_data.total_cc_limit` | `lenders_criteria_pl.max_cc_utilization_ratio` |
