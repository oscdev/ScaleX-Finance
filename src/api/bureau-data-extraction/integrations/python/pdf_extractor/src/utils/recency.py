from datetime import date, datetime

from src.retrieval.extraction_utils import first_match


def extract_reference_date(all_text, pattern):
    """
    Find a document's own "as of" date (e.g. "Date : 03/01/2026"
    printed near the top of a credit report) to use as the anchor
    for "last N months" filtering, instead of the machine's real
    clock.

    This matters because a report is a snapshot: "payments in the
    last 6 months" should mean the last 6 months *of the report's
    own data*, not 6 months back from whatever day the analysis
    happens to run - otherwise re-analyzing an older report long
    after it was generated would wrongly show nothing.

    `pattern` may be a single regex or a list of alternatives - a
    different report layout wording its own date differently (e.g.
    "REPORT DATE & TIME : 26/07/2025 (16:18:20)" instead of
    "Date : 03/01/2026") is a YAML-only addition to that list, not a
    code change.

    Returns None (letting callers fall back to the real date) if
    `pattern` is unset or none of its alternatives match.
    """

    if not pattern:
        return None

    match = first_match(pattern, all_text)

    if not match:
        return None

    try:
        return datetime.strptime(match.group(1), "%d/%m/%Y").date()
    except (ValueError, IndexError):
        return None


def months_back_cutoff(today, months_back):
    """
    Return the first-of-month date `months_back` months before
    `today`. Shared by any validator that needs to keep only entries
    from the last N months (e.g. payment history, enquiries).
    """

    total_months = (
        today.year * 12
        + (today.month - 1)
        - months_back
    )

    cutoff_year = total_months // 12
    cutoff_month = total_months % 12 + 1

    return date(cutoff_year, cutoff_month, 1)
