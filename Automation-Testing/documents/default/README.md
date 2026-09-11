# Default Live Run files (no CSV in the UI)

CSV and PDFs for a product live in **one directory**. Start Live Run with **no CSV** reads that folder for the selected product:

```text
documents/default/personal-loan/
  sample-default-personal-loan.csv   # 25-row pool (each Start uses one row)
  live-run.example.csv               # 1-row upload template (Download example CSV)
  aadhaar_front.pdf, salary_slip.pdf, …

documents/default/business-loan/
  sample-default-business-loan.csv
  live-run.example.csv
  aadhaar_front.pdf, proprietorship.pdf, …
```

CSV document columns are filenames in the **same folder**. Personal Loan uses a single `salary_slip.pdf`.

Identity fields are re-stamped on each Start so repeat runs do not collide in Strapi. Required **and optional** dummy values are filled, including Other-step `runningLoans` and Personal Loan other-income fields. Spouse stays empty on Single rows. These fixture PDFs may be reused on every no-CSV Start.

**Business Loan `turnover`:** CSV values are **full ₹** (e.g. `4200000`). Live Run converts to Lakh when writing `form_data.businessDetails.turnover`. Suite report / Journey Demo show the full rupee amount.
