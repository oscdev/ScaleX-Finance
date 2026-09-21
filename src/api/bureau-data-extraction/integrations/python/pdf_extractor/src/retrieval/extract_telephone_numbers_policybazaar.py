"""Policy Bazaar phone list parser (Vendor2)."""

from __future__ import annotations

import re

from src.utils.logger import logger

PHONE_ROW = re.compile(
    r"(?im)^\s*(Mobile\s*Phone|Home\s*Phone|Office\s*Phone|Phone)\s+"
    r"([0-9+\-\s]{8,20})\s*$"
)


def extract_telephone_numbers_policybazaar(field_cfg, all_text):
    """
    Parse Contact Information phone rows into top N
    ({type, number}) objects — same shape as Vendor1.
    """
    try:
        top_n = int(field_cfg.get("top_n", 2))
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)Phone\s*Number(.*?)(?=Email\s*ID|Support|Disclaimer|$)",
        )

        region_match = re.search(region_pattern, all_text)
        search_text = region_match.group(1) if region_match else all_text

        results = []
        seen = set()

        for match in PHONE_ROW.finditer(search_text):
            phone_type = re.sub(r"\s+", " ", match.group(1)).strip()
            number = re.sub(r"\s+", "", match.group(2)).strip()
            if not number:
                continue
            key = (phone_type.lower(), number)
            if key in seen:
                continue
            seen.add(key)
            results.append({"type": phone_type, "number": number})
            if len(results) >= top_n:
                break

        logger.info(
            "telephone_numbers (PolicyBazaar) extracted: %s", len(results)
        )
        return results
    except Exception:
        logger.exception("Failed to extract PolicyBazaar telephones")
        return []
