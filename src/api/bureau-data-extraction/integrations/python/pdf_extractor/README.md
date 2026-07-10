# PDF Extractor — Bureau Data Extraction (Python)

Python sub-project for the ScaleX Finance **`bureau-data-extraction`** Strapi module. Parses a CIBIL/bureau PDF, extracts structured credit (and optional salary) fields via hybrid retrieval, and returns JSON consumed by Node/Strapi.

**Parent module:** `src/api/bureau-data-extraction/`  
**Full integration guide:** [docs/Python-Integration-Bureau-Data-Extraction.md](../../../../../../docs/Python-Integration-Bureau-Data-Extraction.md) (repo root)

---

## What this does today (V1)

1. Reads **`cibil_report.pdf`** from `public/uploads/api_uploads/{leadId}-{applicantNameNoSpaces}/`
2. Loads and parses PDF pages (PyMuPDF / `fitz`)
3. Cleans text, chunks by section
4. Builds embeddings (`LocalEmbedder` + `sentence-transformers`)
5. Hybrid retrieval (BM25 + vector search) per field defined in YAML configs
6. Validates and normalizes values (field-specific validators)
7. Writes `data/outputs/extracted_fields.json` (and optionally `salary_fields.json`)
8. Prints JSON to **stdout** (parsed by Strapi `python-bridge.ts`)

**Not in V1:** LLM Q&A, FastAPI server, session memory, reranker — see [Future / planned](#future--planned) below.

---

## How Strapi invokes this

Strapi does **not** import Python directly. On loan-application submit (or manual `POST /extract`):

```
queueBureauExtraction → cibil-report-summary.runExtraction()
  → python-bridge.runPython()
  → tests/test_field_extraction.py <leadId> "<leadName>"
```

Logs in Strapi terminal:

```
[Bureau Auto] START extraction for {leadId}-{name}/cibil_report.pdf
[Bureau Auto] END extraction for {leadId}-{name}/cibil_report.pdf
```

Python log file: `logs/app.txt` (gitignored).

---

## Requirements

| Requirement | Notes |
|---|---|
| Python | 3.10 or 3.11 recommended |
| Virtual env | Project root `.venv` (auto-created by Strapi bootstrap) |
| Disk | ~2 GB for deps + first-run model download |
| Input PDF | Must be named **`cibil_report.pdf`** in the lead upload folder |

### Install dependencies

From **repository root** (preferred — Strapi bootstrap does this automatically):

```bash
python3 -m venv .venv
.venv/bin/pip install -r src/api/bureau-data-extraction/integrations/python/pdf_extractor/requirements.txt
```

Or from this directory:

```bash
../../../../../../.venv/bin/pip install -r requirements.txt
```

Verify:

```bash
.venv/bin/python3 -c "import yaml, fitz, faiss; print('OK')"
```

---

## Run manually (troubleshooting)

### Field extraction only (writes JSON, no DB)

From **repository root**:

```bash
.venv/bin/python3 \
  src/api/bureau-data-extraction/integrations/python/pdf_extractor/tests/test_field_extraction.py \
  <leadId> "<Applicant Name>"
```

Example:

```bash
.venv/bin/python3 \
  src/api/bureau-data-extraction/integrations/python/pdf_extractor/tests/test_field_extraction.py \
  71 "Test Developer"
```

**Prerequisite:** PDF must exist at:

```
public/uploads/api_uploads/71-TestDeveloper/cibil_report.pdf
```

**Outputs:**

| File | Purpose |
|---|---|
| `data/outputs/extracted_fields.json` | Bureau/CIBIL fields → Strapi `cibilData` |
| `data/outputs/salary_fields.json` | Salary fields → Strapi `salarySlipData` (optional) |

### Full pipeline via Strapi REST

```bash
curl -X POST http://127.0.0.1:1337/api/cibil-report-summaries/extract \
  -H 'Content-Type: application/json' \
  -d '{"leadId": 71, "leadName": "Test Developer"}'
```

Or from repo root: `npm run extract:bureau -- 71 "Test Developer"`

---

## Extracted fields

Configured in YAML — edit configs to add fields without code changes.

| Config | Fields |
|---|---|
| [`configs/fields.yaml`](configs/fields.yaml) | `cibil_score`, `pan_number`, `permanent_address`, `emi_amount`, `current_balance`, `credit_limit`, `payment_history`, `enquiries_date`, `active_unsecured_loan_count` |
| [`configs/salary_fields.yaml`](configs/salary_fields.yaml) | `net_salary`, `is_pf_deducted` |

Each field supports: aliases, regex patterns, validation type, normalization, and retrieval mode (`one`, `many`, `many_one`, `count`).

---

## Pipeline flow

```
cibil_report.pdf (api_uploads/{leadId}-{name}/)
        ↓
DocumentIngestor.ingest()     ← only cibil_report.pdf; errors if missing
        ↓
PDFLoader → PDFParser → TextCleaner
        ↓
SectionChunker
        ↓
LocalEmbedder → VectorSearch + BM25Search → HybridSearch
        ↓
extract_single / extract_many / extract_many_one / extract_count
        ↓
Field validators (src/validator/)
        ↓
extracted_fields.json + JSON stdout
```

---

## Folder structure (actual)

```
pdf_extractor/
├── configs/
│   ├── fields.yaml              # Bureau field extraction map
│   └── salary_fields.yaml       # Salary field map
├── data/
│   └── outputs/                 # extracted_fields.json, salary_fields.json (gitignored)
├── logs/
│   └── app.txt                  # Python log (gitignored)
├── requirements.txt
├── requirements-lock.txt        # optional pinned install
├── src/
│   ├── ingestion/               # pdf_loader, parser, cleaner, document_ingestor
│   ├── chunking/                # section_chunker
│   ├── embeddings/              # local_embedder, base_embedder
│   ├── retrieval/               # bm25, vector_search, hybrid, extract_*
│   ├── validator/               # address, payment_history, enquiry, etc.
│   ├── schemas/
│   └── utils/                   # logger, normalizer, recency
└── tests/
    └── test_field_extraction.py # CLI entry point used by Strapi
```

---

## Key implementation notes

### `cibil_report.pdf` is mandatory

[`src/ingestion/document_ingestor.py`](src/ingestion/document_ingestor.py) only processes `cibil_report.pdf`. Other PDFs in the lead folder are ignored for bureau extraction. Strapi renames the loan form `cibilReport` upload to this filename on disk.

### Folder name must match lead + applicant

`test_field_extraction.py` resolves:

```
public/uploads/api_uploads/{leadId}-{applicantNameNoSpaces}/
```

Spaces are removed from the applicant name; special characters are stripped (same rules as Strapi `buildLeadUploadFolderName`).

### Working directory

Strapi spawns the script with `cwd = pdf_extractor/`. `PYTHONPATH` is set to this directory. Manual runs should use the same cwd or run via the path shown above.

### First run is slow

`sentence-transformers` downloads embedding model weights on first execution. Allow several minutes on a fresh server.

---

## Tests

```bash
cd src/api/bureau-data-extraction/integrations/python/pdf_extractor
../../../../../../.venv/bin/python3 -m pytest tests/ -v
```

---

## Server deployment

See **[§18 Server deployment](../../../../../../docs/Python-Integration-Bureau-Data-Extraction.md#18-server-deployment-local--production)** in the main integration doc:

- `git pull` → `npm install` → `npm run build` → `npm run start`
- `.venv` auto-created on first Strapi start, or pre-install pip deps
- Verify `[Bureau Auto] START/END extraction for {leadId}-{name}/cibil_report.pdf` in Strapi logs

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Required PDF not found: cibil_report.pdf` | Upload via loan form `cibilReport` field; check `api_uploads/{leadId}-{name}/` |
| `Directory does not exist` | Lead folder not created — submit loan application first |
| `ModuleNotFoundError: yaml` / `fitz` | Install requirements into `.venv` |
| `ModuleNotFoundError: src` | Run from `pdf_extractor/` cwd or set `PYTHONPATH=.` |
| Empty or wrong fields | Check `logs/app.txt`; adjust patterns in `configs/fields.yaml` |
| Slow extraction | Normal on first run (model download) |

---

## Future / planned

The original design notes below targeted an LLM Q&A pipeline. The **shipped V1** uses rule + hybrid retrieval only (no LLM adapter in production path).

Planned / not implemented:

- LLM-backed extraction adapters (`src/llms/` — not present)
- FastAPI standalone service (`src/api/main.py` — not present)
- Salary PDF auto-pipeline on loan submit
- OCR fallback for scanned PDFs
- Reranker after hybrid retrieval

For business rules, API contracts, and gaps see [docs/Python-Integration-Bureau-Data-Extraction.md](../../../../../../docs/Python-Integration-Bureau-Data-Extraction.md) and [docs/BRD-Personal-Loan.md](../../../../../../docs/BRD-Personal-Loan.md).

---

## Tech stack (implemented)

| Layer | Library |
|---|---|
| PDF parsing | PyMuPDF (`fitz`) |
| Embeddings | `sentence-transformers` (local) |
| Vector search | `faiss-cpu` |
| Keyword search | `rank_bm25` |
| Config | PyYAML (`configs/*.yaml`) |
| Logging | Custom logger → `logs/app.txt` |
| Tests | `pytest` |
