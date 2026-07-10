import re
from datetime import datetime

from src.utils.recency import months_back_cutoff


class EnquiryValidator:
    """
    Validator for enquiry dates.

    Responsibilities:
        - Validate extracted enquiry dates.
        - Remove duplicates.
        - Remove invalid dates.
        - Optionally keep only the last `months_back` months (unset
          by default, so existing fields keep returning full history
          unless a config explicitly opts in).
        - Sort dates in descending order.

    NOTE:
        Searching, retrieval, chunk selection and regex extraction
        are handled by the extractor.
    """

    def __init__(self, validation=None):

        self.validation = validation or {}

        self.min_year = self.validation.get(
            "min_year",
            1990,
        )

        self.allow_future = self.validation.get(
            "allow_future",
            False,
        )

        self.months_back = self.validation.get(
            "months_back",
        )

    # ----------------------------------------------------
    # Validate a single date
    # ----------------------------------------------------

    def validate(self, value):

        if value is None:
            return False

        value = value.strip()

        if not re.fullmatch(
            r"\d{2}/\d{2}/\d{4}",
            value,
        ):
            return False

        try:
            date = datetime.strptime(
                value,
                "%d/%m/%Y",
            )

        except ValueError:
            return False

        if date.year < self.min_year:
            return False

        if (
            not self.allow_future
            and date > datetime.today()
        ):
            return False

        return True

    # ----------------------------------------------------
    # Clean extracted dates
    # ----------------------------------------------------

    def clean(self, values, today=None):

        if not values:
            return []

        cleaned = []
        seen = set()

        for value in values:

            if value is None:
                continue

            value = value.strip()

            if not self.validate(value):
                continue

            if value in seen:
                continue

            seen.add(value)

            cleaned.append(value)

        cleaned.sort(
            key=lambda value: datetime.strptime(
                value,
                "%d/%m/%Y",
            ),
            reverse=True,
        )

        if self.months_back is not None:

            today = today or datetime.today().date()

            cutoff = months_back_cutoff(today, self.months_back)

            cleaned = [
                value
                for value in cleaned
                if cutoff
                <= datetime.strptime(value, "%d/%m/%Y").date()
                <= today
            ]

        return cleaned