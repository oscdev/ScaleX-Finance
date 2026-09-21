import json
import re
from pathlib import Path
import sys

import yaml

from src.ingestion.document_ingestor import DocumentIngestor
from src.embeddings.local_embedder import LocalEmbedder
from src.retrieval.vector_search import VectorSearch
from src.retrieval.bm25 import BM25Search
from src.retrieval.hybrid import HybridSearch
from src.retrieval.extract_single import extract_single
from src.retrieval.extract_many import extract_many
from src.retrieval.extract_many_one import extract_many_one
from src.retrieval.extract_count import extract_count
from src.retrieval.extract_telephone_numbers import extract_telephone_numbers
from src.retrieval.extract_telephone_numbers_policybazaar import (
    extract_telephone_numbers_policybazaar,
)
from src.retrieval.extract_open_accounts import extract_open_accounts
from src.retrieval.extract_open_accounts_policybazaar import (
    extract_open_accounts_policybazaar,
)
from src.retrieval.extract_enquiries import extract_enquiries
from src.retrieval.extract_enquiries_policybazaar import (
    extract_enquiries_policybazaar,
)
from src.retrieval.detect_vendor import (
    VENDOR1_NORMAL,
    VENDOR2_POLICYBAZAAR,
    detect_vendor,
)
from src.utils.logger import logger


VENDOR_FIELDS = {
    VENDOR1_NORMAL: "configs/fields_normal.yaml",
    VENDOR2_POLICYBAZAAR: "configs/fields_policybazaar.yaml",
}


def load_fields(config_path="configs/fields_normal.yaml"):

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["extract"]


def build_pipeline(pdf_directory):

    ingestor = DocumentIngestor(pdf_directory)
    corpus = ingestor.ingest()

    pages = corpus["pages"]
    chunks = corpus["chunks"]

    embedder = LocalEmbedder()

    chunk_texts = [
        f"{chunk.section_title}\n{chunk.clean_content}"
        for chunk in chunks
    ]

    embeddings = embedder.embed(chunk_texts)

    vector_db = VectorSearch(
        embedding_dimension=len(embeddings[0])
    )

    vector_db.add(
        embeddings=embeddings,
        chunks=chunks,
    )

    bm25 = BM25Search()
    bm25.build(chunks)

    hybrid = HybridSearch(
        vector_search=vector_db,
        bm25_search=bm25,
    )

    all_text = "\n".join(
        page["text"]
        for page in pages
    )

    return (
        hybrid,
        embedder,
        chunks,
        all_text,
    )


def extract_field(
    field_cfg,
    hybrid,
    embedder,
    chunks,
    all_text,
    vendor_id=VENDOR1_NORMAL,
):

    value_type = field_cfg.get("value", "one")
    is_pb = vendor_id == VENDOR2_POLICYBAZAAR

    # ------------------------------
    # Structured telephone pairs
    # ------------------------------
    if value_type == "telephones":

        if is_pb:
            return extract_telephone_numbers_policybazaar(
                field_cfg=field_cfg,
                all_text=all_text,
            )

        return extract_telephone_numbers(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Structured open accounts
    # ------------------------------
    if value_type == "accounts":

        if is_pb:
            return extract_open_accounts_policybazaar(
                field_cfg=field_cfg,
                all_text=all_text,
            )

        return extract_open_accounts(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Structured enquiries
    # ------------------------------
    if value_type == "enquiries":

        if is_pb:
            return extract_enquiries_policybazaar(
                field_cfg=field_cfg,
                all_text=all_text,
            )

        return extract_enquiries(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Single value
    # ------------------------------
    if value_type == "one":

        return extract_single(
            field_cfg=field_cfg,
            hybrid=hybrid,
            embedder=embedder,
            chunks=chunks,
            all_text=all_text,
        )

    # ------------------------------
    # Multiple scattered values
    # ------------------------------
    elif value_type == "many":

        return extract_many(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Multiple values from one section
    # ------------------------------
    elif value_type == "many_one":

        return extract_many_one(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Count of blocks matching a
    # status + classification
    # ------------------------------
    elif value_type == "count":

        return extract_count(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    raise ValueError(
        f"Unknown value type: {value_type}"
    )


def build_lead_upload_folder_name(lead_id: str, applicant_name: str) -> str:
    cleaned = applicant_name.strip().replace(" ", "")
    cleaned = re.sub(r"[^a-zA-Z0-9.\- ]", "", cleaned).strip()
    return f"{lead_id}-{cleaned}"


def resolve_fields_config(vendor_id: str) -> str:
    match vendor_id:
        case "Vendor1_NormalCIBIL":
            return VENDOR_FIELDS[VENDOR1_NORMAL]
        case "Vendor2_PolicyBazaar":
            return VENDOR_FIELDS[VENDOR2_POLICYBAZAAR]
        case _:
            return VENDOR_FIELDS[VENDOR1_NORMAL]


def main():

    if len(sys.argv) < 3:
        print(
            json.dumps(
                {
                    "error": "Usage: python test_field_extraction.py <lead_id> <lead_name>"
                }
            )
        )
        sys.exit(1)

    lead_id = sys.argv[1]
    lead_name = sys.argv[2]

    # Project root:
    # /var/www/vhosts/honey/NodeJS/ScaleX-Finance-MVP
    PROJECT_ROOT = Path(__file__).resolve().parents[7]

    raw_pdf = str(
        PROJECT_ROOT
        / "public"
        / "uploads"
        / "api_uploads"
        / build_lead_upload_folder_name(lead_id, lead_name)
    )

    logger.info(f"Using PDF directory: {raw_pdf}")

    # Ingest once for vendor detect + extraction text.
    corpus = DocumentIngestor(raw_pdf).ingest()
    all_text = "\n".join(page["text"] for page in corpus["pages"])

    vendor_id = detect_vendor(all_text)
    fields_path = resolve_fields_config(vendor_id)
    logger.info(f"Vendor {vendor_id} → loading {fields_path}")
    fields = load_fields(fields_path)

    # Build hybrid retrieval only when at least one field
    # needs value:one (alias/chunk search). Structured extractors use all_text only.
    needs_hybrid = any(
        (field_cfg.get("value", "one") == "one")
        for field_cfg in fields.values()
    )

    if needs_hybrid:
        hybrid, embedder, chunks, _ = build_pipeline(raw_pdf)
    else:
        hybrid = embedder = chunks = None

    extracted = {}

    for field_name, field_cfg in fields.items():

        extracted[field_name] = extract_field(
            field_cfg=field_cfg,
            hybrid=hybrid,
            embedder=embedder,
            chunks=chunks,
            all_text=all_text,
            vendor_id=vendor_id,
        )

        logger.info(f"{field_name} -> {extracted[field_name]}")

    # Persist vendor for Strapi _extractionMeta merge (same cibilData keys).
    extracted["_extractionMeta"] = {"vendorId": vendor_id}

    output_path = Path("data/outputs/extracted_fields.json")

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            extracted,
            f,
            indent=4,
            ensure_ascii=False,
        )

    logger.info(
        f"Extraction complete. Saved to {output_path}"
    )

    # python-bridge.ts expects JSON on stdout
    print(json.dumps(extracted, ensure_ascii=False))


if __name__ == "__main__":
    main()
