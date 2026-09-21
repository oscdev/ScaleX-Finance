# Default Live Run files (no CSV in the UI)

Product CSV + non-CIBIL PDFs live under each product folder. **CIBIL PDFs are shared** under `CIBIL/`.

```text
documents/default/
  CIBIL/
    normal_cibil1.pdf, normal_cibil2.pdf      # Vendor1 Normal CIBIL
    policy_bazar1.pdf, policy_bazar2.pdf      # Vendor2 Policy Bazaar
  personal-loan/
    sample-default-personal-loan.csv   # 25-row named scenarios (PL-01..PL-25)
    live-run.example.csv
    aadhaar_front.pdf, salary_slip.pdf, …
  business-loan/
    sample-default-business-loan.csv   # 25-row named scenarios (BL-01..BL-25)
    live-run.example.csv
    aadhaar_front.pdf, proprietorship.pdf, gst_certificate.pdf, tin.pdf, …
```

## CIBIL column

The CSV `cibil` cell is a **filename only** (e.g. `normal_cibil1.pdf`). Live Run resolves it from:

1. The product / staged docs folder (if present)
2. Else shared `documents/default/CIBIL/`

Python `detect_vendor()` picks Normal vs Policy Bazaar from PDF text after upload. No vendor column is required.

## Form options (allow-list)

Rows use only PL/BL funnel dropdown values (`field-schema.ts`). Occupation is **not** on PL/BL lead forms — `employmentType` is locked (`Salaried` / `Self Employed`). PF (`pfDeducted`) is **PL-only**. BL `regProofs` use form labels (`GST`, not `GST Certificate`).

## Amount / turnover bands

- **PL** typical `requiredAmount` ~2L–8L (consumer); edges include 40k and 25L.
- **BL** typical `requiredAmount` ~20L–50L and `turnover` ~1 Cr+ (full ₹ in CSV); edges include fail-low turnover 8L and fail-high amount 2 Cr. Sized from `lenders_criteria_bl` / scoring, not PL-like tickets.

**Business Loan `turnover`:** CSV values are **full ₹**. Live Run converts to Lakh in `form_data.businessDetails.turnover`. Suite report / Journey Demo show full ₹.

Identity fields are re-stamped on each Start. Spouse stays empty on Single / Divorced / Widowed rows when not Married. Dummy non-CIBIL PDFs may be reused across rows.
