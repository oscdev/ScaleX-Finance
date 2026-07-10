import re


def normalize_candidate(text, cfg):

    if text is None:
        return None

    if cfg.get("strip", False):
        text = text.strip()

    if cfg.get("uppercase", False):
        text = text.upper()

    if cfg.get("lowercase", False):
        text = text.lower()

    if cfg.get("remove_commas", False):
        text = text.replace(",", "")

    if cfg.get("collapse_spaces", False):
        text = re.sub(r"\s+", " ", text)

    if cfg.get("collapse_newlines", False):
        text = re.sub(r"\n+", "\n", text)

    if cfg.get("to_boolean", False):

        cleaned = re.sub(r"[^\d.\-]", "", text)

        try:
            return float(cleaned) > 0
        except ValueError:
            return False

    return text