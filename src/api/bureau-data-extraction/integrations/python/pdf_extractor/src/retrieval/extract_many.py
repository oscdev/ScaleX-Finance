from src.retrieval.extraction_utils import apply_patterns, find_line_windows
from src.validator.validator import validate_candidate
from src.utils.normalizer import normalize_candidate
from src.utils.logger import logger


def extract_many(
    field_cfg,
    all_text,
):
    """
    Generic extractor for fields with multiple independent
    occurrences scattered through a document (e.g. one EMI amount
    per account).
    """

    # -------------------------------------------------
    # Read configuration
    # -------------------------------------------------

    try:
        aliases = field_cfg.get("aliases", [])
        patterns = field_cfg["patterns"]
        validation = field_cfg.get("validation", {})
        normalization = field_cfg.get("normalization", {})

        context_window = field_cfg.get("context_window", 6)
        half = context_window // 2

    except Exception:
        logger.exception(
            "Failed while reading configuration for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return []

    # -------------------------------------------------
    # Find search windows
    # -------------------------------------------------

    try:
        if aliases:
            windows = find_line_windows(
                all_text,
                aliases,
                before=half,
                after=half,
            )
        else:
            windows = [all_text]

    except Exception:
        logger.exception(
            "Failed while finding search windows for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return []

    results = []

    # -------------------------------------------------
    # Pattern extraction
    # -------------------------------------------------

    try:
        for search_text in windows:

            candidates = apply_patterns(
                patterns,
                search_text,
            )

            # -----------------------------------------
            # Validation & Normalization
            # -----------------------------------------

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

                results.append(candidate)

    except Exception:
        logger.exception(
            "Extraction failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return []

    return results