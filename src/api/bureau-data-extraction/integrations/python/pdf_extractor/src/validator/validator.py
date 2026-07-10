import re


def validate_candidate(candidate, validation):
    """
    Validate an extracted candidate according to the field's
    validation configuration from fields.yaml.
    """

    if not validation:
        return True

    if candidate is None:
        return False

    candidate = str(candidate).strip()

    if not candidate:
        return False

    vtype = validation.get("type", "").lower()

    # -------------------------------------------------
    # Integer
    # -------------------------------------------------

    if vtype == "integer":

        try:
            value = int(candidate.replace(",", ""))

            if "min" in validation and value < validation["min"]:
                return False

            if "max" in validation and value > validation["max"]:
                return False

            return True

        except ValueError:
            return False

    # -------------------------------------------------
    # Regex
    # -------------------------------------------------

    if vtype == "regex":

        pattern = validation.get("regex")

        if not pattern:
            return False

        return re.fullmatch(pattern, candidate) is not None

    # -------------------------------------------------
    # Currency
    # -------------------------------------------------

    if vtype == "currency":

        if not re.fullmatch(r"-?[0-9,]+(?:\.\d+)?", candidate):
            return False

        try:
            value = float(candidate.replace(",", ""))

            if "min" in validation and value < validation["min"]:
                return False

            if "max" in validation and value > validation["max"]:
                return False

            return True

        except ValueError:
            return False

    # -------------------------------------------------
    # Date
    # -------------------------------------------------

    if vtype == "date":

        return (
            re.fullmatch(
                r"\d{2}/\d{2}/\d{4}",
                candidate,
            )
            is not None
        )

    # -------------------------------------------------
    # String
    # -------------------------------------------------

    if vtype == "string":

        min_length = validation.get("min_length", 1)
        max_length = validation.get("max_length")

        if len(candidate) < min_length:
            return False

        if max_length and len(candidate) > max_length:
            return False

        return True

    # -------------------------------------------------
    # Unknown validator
    # -------------------------------------------------

    return True