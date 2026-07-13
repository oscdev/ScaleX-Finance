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
from src.retrieval.extract_open_accounts import extract_open_accounts
from src.retrieval.extract_enquiries import extract_enquiries
from src.utils.logger import logger


def load_fields(config_path="configs/fields.yaml"):

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
):

    value_type = field_cfg.get("value", "one")

    # ------------------------------
    # Structured telephone pairs
    # ------------------------------
    if value_type == "telephones":

        return extract_telephone_numbers(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Structured open accounts
    # ------------------------------
    if value_type == "accounts":

        return extract_open_accounts(
            field_cfg=field_cfg,
            all_text=all_text,
        )

    # ------------------------------
    # Structured enquiries
    # ------------------------------
    if value_type == "enquiries":

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

    # raw_pdf = (
    #     f"/var/www/vhosts/ScaleX-Finance/public/uploads/api_uploads/{lead_id}_{lead_name}"
    # )


# print("CURRENT FILE:", Path(__file__).resolve())
# print("PROJECT ROOT:", project_root)

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

    fields = load_fields()

    # Ingest once; build hybrid retrieval only when at least one field
    # needs value:one (alias/chunk search). Structured extractors use all_text only.
    needs_hybrid = any(
        (field_cfg.get("value", "one") == "one")
        for field_cfg in fields.values()
    )

    if needs_hybrid:
        hybrid, embedder, chunks, all_text = build_pipeline(raw_pdf)
    else:
        from src.ingestion.document_ingestor import DocumentIngestor

        corpus = DocumentIngestor(raw_pdf).ingest()
        all_text = "\n".join(page["text"] for page in corpus["pages"])
        hybrid = embedder = chunks = None

    extracted = {}

    for field_name, field_cfg in fields.items():

        extracted[field_name] = extract_field(
            field_cfg=field_cfg,
            hybrid=hybrid,
            embedder=embedder,
            chunks=chunks,
            all_text=all_text,
        )

        logger.info(f"{field_name} -> {extracted[field_name]}")

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