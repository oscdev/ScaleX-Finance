import re
from datetime import date, datetime

from src.utils.recency import months_back_cutoff


MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
]

MONTH_NUMBER = {name: index + 1 for index, name in enumerate(MONTHS)}

# "Mon YYYY" then a value, e.g. "Dec 2025 0" (same line) or
# "Dec 2025" / "0" (value on the next line - some PDF extractions
# split it there). The month and year must stay on one line
# ([ \t] only between them); at most one newline is allowed before
# the value, so this can't runaway-match across the many lines of
# a "Days Past Due" grid the way an unbounded \s+ would.
FLAT_ROW_PATTERN = re.compile(
    r"(?im)^[ \t]*([A-Za-z]{3})[a-z]*[ \t]+(\d{4})[ \t]*\n?[ \t]*(-|XXX|[0-9]+)[ \t]*$"
)


class PaymentHistoryValidator:
    """
    Parses a payment-history section and keeps only the entries that
    fall within a recency window measured from the current date.

    Auto-detects between two known layouts so the same field config
    works across report formats without a code change:
        - a "Days Past Due" grid: a JAN..DEC month header followed by
          repeating YEAR + 12 monthly values blocks
        - a flat list: one "Mon YYYY value" row per month, e.g.
          "Dec 2025 0"

    Responsibilities:
        - Parse raw grid text into (year, month, value) entries.
        - Drop entries older than `months_back` months from today.
        - Re-render each account's remaining entries as a compact,
          newest-first string.

    NOTE:
        Chunk selection and regex extraction are handled by the
        extractor; this class only interprets the grid text it is
        given.
    """

    def __init__(self, validation=None):

        self.validation = validation or {}

        self.months_back = self.validation.get(
            "months_back",
            12,
        )

    # ----------------------------------------------------
    # Parse a single block into (year, month, value) entries,
    # trying each known layout in turn.
    # ----------------------------------------------------

    def _parse(self, text):

        flat_rows = FLAT_ROW_PATTERN.findall(text)

        if flat_rows:

            entries = []

            for month_abbr, year, value in flat_rows:

                month_number = MONTH_NUMBER.get(month_abbr[:3].upper())

                if month_number:
                    entries.append((int(year), month_number, value))

            return entries

        return self._parse_grid(text)

    def _parse_grid(self, text):

        tokens = text.split()

        idx = 0

        if (
            len(tokens) >= 12
            and [token.upper() for token in tokens[:12]] == MONTHS
        ):
            idx = 12

        entries = []

        while idx < len(tokens):

            year_token = tokens[idx]

            if not re.fullmatch(r"\d{4}", year_token):
                break

            year = int(year_token)
            idx += 1

            values = tokens[idx: idx + 12]

            if len(values) < 12:
                break

            for month_number, value in enumerate(values, start=1):
                entries.append((year, month_number, value))

            idx += 12

        return entries

    # ----------------------------------------------------
    # Clean a list of raw grid candidates (one per account)
    # ----------------------------------------------------

    def clean(self, values, today=None):

        if not values:
            return []

        today = today or datetime.today().date()

        cutoff = months_back_cutoff(today, self.months_back)

        results = []

        for raw in values:

            if not raw:
                continue

            entries = self._parse(raw)

            recent = [
                (year, month, value)
                for year, month, value in entries
                if cutoff <= date(year, month, 1) <= today
            ]

            if not recent:
                continue

            recent.sort(
                key=lambda entry: (entry[0], entry[1]),
                reverse=True,
            )

            formatted = ", ".join(
                f"{month:02d}/{year}: {value}"
                for year, month, value in recent
            )

            if formatted not in results:
                results.append(formatted)

        return results
