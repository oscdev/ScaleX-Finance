import re
from datetime import datetime

from src.utils.logger import logger
from src.utils.recency import extract_reference_date, months_back_cutoff


ENQUIRY_BLOCK_PATTERN = re.compile(
    r"(?is)Member\s*Name\s*\n\s*(.*?)\s*\n\s*"
    r"Date\s*Of\s*Enquiry\s*\n\s*(\d{2}/\d{2}/\d{4})\s*\n\s*"
    r"Enquiry\s*Purpose\s*\n\s*(.*?)(?=\s*Member\s*Name|\s*End\s*of\s*report|\s*Disclaimer|$)"
)


def extract_enquiries(field_cfg, all_text):
    """
    Parse ENQUIRY DETAILS into objects:
    {member_name, date_of_enquiry, enquiry_purpose}
    filtered to the last `months_back` months (default 3).
    """
    try:
        validation = field_cfg.get("validation", {}) or {}
        months_back = validation.get("months_back", 3)
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)ENQUIRY\s*DETAILS(.*?)(?=Disclaimer|End\s*of\s*report|$)",
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

        for match in ENQUIRY_BLOCK_PATTERN.finditer(search_text):
            member_name = re.sub(r"\s+", " ", match.group(1)).strip()
            enquiry_date = match.group(2).strip()
            purpose = re.sub(r"\s+", " ", match.group(3)).strip()
            purpose = re.split(
                r"\d{2}/\d{2}/\d{4},\s*\d{1,2}:\d{2}|CIBIL Report|https?://",
                purpose,
            )[0].strip()

            # Drop footer noise lines
            member_name = re.split(
                r"\d{2}/\d{2}/\d{4},\s*\d{1,2}:\d{2}|CIBIL Report|https?://",
                member_name,
            )[0].strip()

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

        logger.info("enquiries extracted: %s", len(results))
        return results
    except Exception:
        logger.exception("Failed to extract enquiries")
        return []
