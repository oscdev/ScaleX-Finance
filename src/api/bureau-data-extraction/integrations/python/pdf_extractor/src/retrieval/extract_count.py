import re

from src.retrieval.extraction_utils import first_match, first_findall
from src.utils.logger import logger


def extract_count(field_cfg, all_text):

    try:
        block_pattern = field_cfg.get("block_pattern")

        if not block_pattern:
            return 0

        region_pattern = field_cfg.get("region_pattern")
        status_patterns = field_cfg.get("status_patterns", {})
        scope_patterns = field_cfg.get("scope_patterns", {})
        type_pattern = field_cfg.get("type_pattern")
        type_classification = field_cfg.get("type_classification", {})

        count_status = field_cfg.get("count_status")
        count_classification = field_cfg.get("count_classification")

    except Exception:
        logger.exception("Failed while reading extract_count configuration.")
        return 0

    # --------------------------------------------------
    # Region Extraction
    # --------------------------------------------------

    try:
        region_text = all_text

        if region_pattern:

            region_match = first_match(region_pattern, all_text)

            if region_match:
                region_text = (
                    region_match.group(1)
                    if region_match.groups()
                    else region_match.group(0)
                )

    except Exception:
        logger.exception(
            "Region extraction failed for field '%s'.",
            field_cfg.get("name", "Unknown")
        )
        return 0

    try:
        keywords = [
            keyword.lower()
            for keyword in type_classification.get(count_classification, [])
        ]
    except Exception:
        logger.exception("Failed while preparing classification keywords.")
        return 0

    def matches_classification(block):
        try:
            if not count_classification:
                return True

            if not type_pattern:
                return False

            match = first_match(type_pattern, block)

            if not match:
                return False

            account_type = re.sub(
                r"\s+",
                " ",
                match.group(1),
            ).strip().lower()

            return any(
                keyword in account_type
                for keyword in keywords
            )

        except Exception:
            logger.exception(
                "Classification matching failed.\nBlock:\n%s",
                block[:500]
            )
            return False

    # --------------------------------------------------
    # Block Extraction
    # --------------------------------------------------

    try:
        all_blocks = first_findall(block_pattern, region_text)
    except Exception:
        logger.exception("Failed while extracting blocks.")
        return 0

    # --------------------------------------------------
    # Strategy 1
    # --------------------------------------------------

    try:
        if status_patterns:

            any_status_found = any(
                re.search(regex, block)
                for block in all_blocks
                for regex in status_patterns.values()
            )

            if any_status_found:

                status_regex = status_patterns.get(count_status)

                if not status_regex:
                    return 0

                return sum(
                    1
                    for block in all_blocks
                    if re.search(status_regex, block)
                    and matches_classification(block)
                )
    except Exception:
        logger.exception("Status-based counting failed.")
        return 0

    # --------------------------------------------------
    # Strategy 2
    # --------------------------------------------------

    try:
        if scope_patterns and count_status in scope_patterns:

            scope_match = first_match(
                scope_patterns[count_status],
                region_text,
            )

            if not scope_match:
                return 0

            scope_text = (
                scope_match.group(1)
                if scope_match.groups()
                else scope_match.group(0)
            )

            scoped_blocks = first_findall(
                block_pattern,
                scope_text,
            )

            return sum(
                1
                for block in scoped_blocks
                if matches_classification(block)
            )
    except Exception:
        logger.exception("Scope-based counting failed.")
        return 0

    # --------------------------------------------------
    # Strategy 3
    # --------------------------------------------------

    try:
        if count_status:
            return 0

        return sum(
            1
            for block in all_blocks
            if matches_classification(block)
        )

    except Exception:
        logger.exception("Final counting strategy failed.")
        return 0