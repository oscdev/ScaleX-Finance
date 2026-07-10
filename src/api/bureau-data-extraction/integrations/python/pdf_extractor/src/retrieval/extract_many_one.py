from src.retrieval.extraction_utils import apply_patterns, find_line_windows
from src.validator.validator import validate_candidate
from src.utils.normalizer import normalize_candidate
from src.utils.recency import extract_reference_date
from src.validator.enquiry_validator import EnquiryValidator
from src.validator.payment_history_validator import PaymentHistoryValidator
from src.utils.logger import logger


# Validators that clean/filter the whole candidate list at once
# (as opposed to validate_candidate, which checks one value in
# isolation). Add an entry here to support a new "type" from
# fields.yaml without touching the extractor logic below.
MULTI_VALUE_VALIDATORS = {
    "enquiry_date": EnquiryValidator,
    "payment_history": PaymentHistoryValidator,
}


def extract_many_one(field_cfg, all_text):
    try:
        aliases = field_cfg.get("aliases", [])
        patterns = field_cfg.get("patterns", [])
        section_patterns = field_cfg.get("section_patterns", [])
        validation = field_cfg.get("validation", {})
        normalization = field_cfg.get("normalization", {})
        search_cfg = field_cfg.get("search", {})

        if "before_lines" in search_cfg or "after_lines" in search_cfg:
            before = search_cfg.get("before_lines", 0)
            after = search_cfg.get("after_lines", 0)
        else:
            context_window = field_cfg.get("context_window", 20)
            half = context_window // 2
            before = half
            after = half

    except Exception as e:
        logger.exception("Failed while reading field configuration.")
        return []

    try:
        windows = find_line_windows(
            all_text,
            aliases,
            before=before,
            after=after,
        )
    except Exception:
        logger.exception("Error while finding line windows.")
        return []

    try:
        candidates = []

        for search_text in windows:

            if section_patterns:
                sections = apply_patterns(
                    section_patterns,
                    search_text,
                )

                if sections:
                    search_text = "\n".join(sections)

            candidates.extend(
                apply_patterns(
                    patterns,
                    search_text,
                )
            )

        if not candidates:
            candidates = apply_patterns(
                patterns,
                all_text,
            )

        if not candidates:
            logger.warning("No candidates found for field: %s", field_cfg.get("name"))
            return []

    except Exception:
        logger.exception("Pattern extraction failed.")
        return []

    try:
        validation_type = validation.get("type", "")

        validator_cls = MULTI_VALUE_VALIDATORS.get(validation_type)

        if validator_cls:

            reference_date = extract_reference_date(
                all_text,
                field_cfg.get("reference_date_pattern"),
            )

            valid_candidates = validator_cls(validation).clean(
                candidates,
                today=reference_date,
            )

        else:

            valid_candidates = [
                candidate
                for candidate in candidates
                if validate_candidate(candidate, validation)
            ]

    except Exception:
        logger.exception("Validation failed.")
        return []

    try:
        values = []

        for candidate in valid_candidates:

            candidate = normalize_candidate(
                candidate,
                normalization,
            )

            if candidate:
                values.append(candidate)

        seen = set()
        unique = []

        for value in values:
            if value in seen:
                continue

            seen.add(value)
            unique.append(value)

        return unique

    except Exception:
        logger.exception("Normalization failed.")
        return []