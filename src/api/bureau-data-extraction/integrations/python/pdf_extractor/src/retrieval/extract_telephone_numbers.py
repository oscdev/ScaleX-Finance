import re

from src.utils.logger import logger


PHONE_PAIR_PATTERN = re.compile(
    r"(?is)Telephone\s*Number\s*Type\s*\n\s*(.*?)\s*\n\s*"
    r"Telephone\s*Number\s*\n\s*([0-9+\-\s]+)"
)


def extract_telephone_numbers(field_cfg, all_text):
    """
    Parse CONTACT DETAILS phone pairs and return the top N
    ({type, number}) objects. N defaults to 2 via fields.yaml.
    """
    try:
        top_n = int(field_cfg.get("top_n", 2))
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)CONTACT\s*DETAILS(.*?)(?=EMAIL\s*DETAILS|EMPLOYMENT\s*DETAILS|Credit\s*Limit|$)",
        )

        region_match = re.search(region_pattern, all_text)
        search_text = region_match.group(1) if region_match else all_text

        # Some print layouts place phones after OPEN ACCOUNTS header
        if "Telephone Number Type" not in search_text:
            fallback = re.search(
                r"(?is)Telephone\s*Number\s*Type(.*?)(?=EMAIL\s*DETAILS|$)",
                all_text,
            )
            if fallback:
                search_text = "Telephone Number Type" + fallback.group(1)

        results = []
        seen = set()

        for match in PHONE_PAIR_PATTERN.finditer(search_text):
            phone_type = re.sub(r"\s+", " ", match.group(1)).strip()
            number = re.sub(r"\s+", "", match.group(2)).strip()

            if not number or number == "-":
                continue

            key = (phone_type.lower(), number)
            if key in seen:
                continue
            seen.add(key)

            results.append({"type": phone_type, "number": number})
            if len(results) >= top_n:
                break

        logger.info("telephone_numbers extracted: %s", len(results))
        return results
    except Exception:
        logger.exception("Failed to extract telephone numbers")
        return []
