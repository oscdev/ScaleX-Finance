# CSV Upload working files

The last CSV Upload is stored here (overwrite). PDFs are **not** kept in this tree — they are staged in a temp directory for the run, then posted to Strapi (`public/uploads/api_uploads/{leadId}-{name}/`).

```text
documents/upload/personal-loan/live-run.csv
documents/upload/business-loan/live-run.csv
```

CSV document columns are **filenames only** (no paths). They must match an attached PDF’s basename.

Default-pool row cursor stays at `upload/.last-doc-hashes.json` (shared).
