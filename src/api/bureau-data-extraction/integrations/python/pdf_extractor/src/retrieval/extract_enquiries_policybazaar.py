"""Policy Bazaar / Paisa Bazaar enquiry table parser (Vendor2)."""

from __future__ import annotations

import re
from datetime import datetime

from src.utils.logger import logger
from src.utils.recency import extract_reference_date, months_back_cutoff

# Sr. No. | Enquiry Purpose | Financial Institution | Enquired on (DD-MM-YYYY)
ENQUIRY_ROW = re.compile(
    r"(?im)^\s*(\d+)\s+"
    r"(.+?)\s+"
    r"([A-Z0-9][A-Z0-9 .&\-]{1,40}?)\s+"
    r"(\d{2}-\d{2}-\d{4})\s*$"
)


def _normalize_date(dd_mm_yyyy: str) -> str:
    return dd_mm_yyyy.replace("-", "/")


def extract_enquiries_policybazaar(field_cfg, all_text):
    """
    Parse Credit Enquiries into the same shape as Vendor1:
    {member_name, date_of_enquiry, enquiry_purpose}
    filtered to the last `months_back` months (default 3).
    """
    try:
        validation = field_cfg.get("validation", {}) or {}
        months_back = validation.get("months_back", 3)
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)Credit\s*Enquiries\s*\n"
            r"This\s*section\s*shows\s*the\s*names(.*?)(?=Summary:\s*(?:Credit|Loan)\s*Accounts|Account\s*Details|Contact\s*Information|$)",
        )
        reference_date_pattern = field_cfg.get("reference_date_pattern")

        region_match = re.search(region_pattern, all_text)
        search_text = region_match.group(1) if region_match else all_text

        today = extract_reference_date(all_text, reference_date_pattern)
        if today is None:
            today = datetime.today().date()

        cutoff = months_back_cutoff(today, months_back)

        results = []
        seen = set()

        for match in ENQUIRY_ROW.finditer(search_text):
            purpose = re.sub(r"\s+", " ", match.group(2)).strip()
            member_name = re.sub(r"\s+", " ", match.group(3)).strip()
            enquiry_date = _normalize_date(match.group(4).strip())

            if not member_name or not enquiry_date:
                continue

            try:
                parsed = datetime.strptime(enquiry_date, "%d/%m/%Y").date()
            except ValueError:
                continue

            if parsed < cutoff or parsed > today:
                continue

            key = (member_name.lower(), enquiry_date, purpose.lower())
            if key in seen:
                continue
            seen.add(key)

            results.append(
                {
                    "member_name": member_name,
                    "date_of_enquiry": enquiry_date,
                    "enquiry_purpose": purpose,
                }
            )

        results.sort(
            key=lambda item: datetime.strptime(
                item["date_of_enquiry"], "%d/%m/%Y"
            ),
            reverse=True,
        )

        logger.info("enquiries (PolicyBazaar) extracted: %s", len(results))
        return results
    except Exception:
        logger.exception("Failed to extract PolicyBazaar enquiries")
        return []
