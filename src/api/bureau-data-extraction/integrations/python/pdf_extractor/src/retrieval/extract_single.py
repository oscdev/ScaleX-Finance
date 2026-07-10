import re

from src.retrieval.extraction_utils import apply_patterns
from src.validator.validator import validate_candidate
from src.validator.address_validator import AddressValidator
from src.utils.normalizer import normalize_candidate
from src.utils.logger import logger

def extract_single(
    field_cfg,
    hybrid,
    embedder,
    chunks,
    all_text,
    top_k=10,
):
    # -------------------------------------------------
    # Read configuration
    # -------------------------------------------------
    try:
        aliases = field_cfg.get("aliases", [])
        query = ", ".join(aliases) if aliases else field_cfg["query"]

        patterns = field_cfg["patterns"]
        validation = field_cfg.get("validation", {})
        normalization = field_cfg.get("normalization", {})

    except Exception:
        logger.exception(
            "Failed while reading configuration for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return None

    # -------------------------------------------------
    # Hybrid Search
    # -------------------------------------------------
    try:
        query_embedding = embedder.embed([query])[0]

        results = hybrid.search(
            query=query,
            query_embedding=query_embedding,
            top_k=top_k,
            alpha=0.5,
        )

        if not results:
            logger.warning(
                "No hybrid search results found for field '%s'.",
                field_cfg.get("name", "Unknown")
            )
            return None

        context_window = field_cfg.get("context_window", 1)

        if context_window % 2 == 0:
            context_window += 1

        half = context_window // 2

        best_chunk = results[0]["chunk"]

        chunk_index = chunks.index(best_chunk)

        start = max(0, chunk_index - half)
        end = min(len(chunks), chunk_index + half + 1)

        candidate_texts = [
            chunk.clean_content
            for chunk in chunks[start:end]
        ]

    except Exception:
        logger.exception(
            "Hybrid search failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return None

    # -------------------------------------------------
    # Address extraction
    # -------------------------------------------------
    try:
        if validation.get("type") == "address":

            category_pattern = field_cfg.get("category_pattern")
            preferred_category = field_cfg.get("preferred_category")

            if category_pattern and preferred_category:

                category_blocks = re.findall(
                    category_pattern,
                    all_text,
                    flags=re.IGNORECASE,
                )

                preferred_candidates = [
                    address_text.strip()
                    for address_text, category_text in category_blocks
                    if preferred_category.lower()
                    in re.sub(r"\s+", " ", category_text).strip().lower()
                ]

                if preferred_candidates:

                    validator = AddressValidator(validation)

                    best = validator.best_candidate(preferred_candidates)

                    if best:
                        return normalize_candidate(best, normalization)

            candidates = []

            for text in candidate_texts:
                candidates.extend(
                    apply_patterns(
                        patterns,
                        text,
                    )
                )

            if not candidates:
                candidates = apply_patterns(
                    patterns,
                    all_text,
                )

            validator = AddressValidator(validation)

            best = validator.best_candidate(candidates)

            return normalize_candidate(best, normalization)

    except Exception:
        logger.exception(
            "Address extraction failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return None

    # -------------------------------------------------
    # Normal field extraction
    # -------------------------------------------------
    try:
        search_text = "\n".join(candidate_texts)

        candidates = apply_patterns(
            patterns,
            search_text,
        )

        if not candidates:
            candidates = apply_patterns(
                patterns,
                all_text,
            )

    except Exception:
        logger.exception(
            "Pattern extraction failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return None

    # -------------------------------------------------
    # Validation & Normalization
    # -------------------------------------------------
    try:
        for candidate in candidates:

            if not validate_candidate(
                candidate,
                validation,
            ):
                continue

            candidate = normalize_candidate(
                candidate,
                normalization,
            )

            return candidate

        return None

    except Exception:
        logger.exception(
            "Validation/Normalization failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return None