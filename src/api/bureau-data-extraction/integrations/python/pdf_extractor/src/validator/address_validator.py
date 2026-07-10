import re


class AddressValidator:

    def __init__(
        self,
        config=None,
    ):

        config = config or {}

        self.min_score = config.get("min_score", 70)
        self.min_length = config.get("min_length", 20)
        self.max_length = config.get("max_length", 250)

        self.states = {

            "andhra pradesh",
            "arunachal pradesh",
            "assam",
            "bihar",
            "chhattisgarh",
            "goa",
            "gujarat",
            "haryana",
            "himachal pradesh",
            "jharkhand",
            "karnataka",
            "kerala",
            "madhya pradesh",
            "maharashtra",
            "manipur",
            "meghalaya",
            "mizoram",
            "nagaland",
            "odisha",
            "punjab",
            "rajasthan",
            "sikkim",
            "tamil nadu",
            "telangana",
            "tripura",
            "uttar pradesh",
            "uttarakhand",
            "west bengal",

            # Union Territories
            "andaman and nicobar islands",
            "chandigarh",
            "dadra and nagar haveli and daman and diu",
            "delhi",
            "jammu and kashmir",
            "ladakh",
            "lakshadweep",
            "puducherry",

            # Country
            "india",

        }

        self.address_keywords = {
            
            "avenue",
            "ave",
            "cross",
            "main",
            "extension",
            "phase",
            "layout",
            "apartment",
            "apt",
            "society",
            "chowk",
            "circle",
            "mandal",
            "post",
            "po",
            "police station",
            "ps",
            "hno",
            "h.no",
            "house",
            "flat",
            "plot",
            "room",
            "shop",
            "building",
            "tower",
            "sector",
            "block",
            "road",
            "street",
            "lane",
            "colony",
            "nagar",
            "village",
            "taluka",
            "tehsil",
            "district",
            "near",
            "opp",
            "opposite",

        }

        # <<< ADD IT HERE >>>
        self.bad_lines = {

            "ADDRESS",
            "ADDRESS(ES)",
            "REPORTED ADDRESS",
            "REPORTED ADDRESS(ES)",
            "ADDRESS CATEGORY",
            "CATEGORY",
            "DATE REPORTED",
            "RESIDENCE CODE",
            "LATEST 4 ADDRESS REPORTED",

            "CONSUMER ACCOUNT DETAILS",
            "EMPLOYMENT INFORMATION",
            "EMAIL CONTACT",
            "TELEPHONE",

            "ACCOUNT INFORMATION",
            "ACCOUNT TYPE",
            "ACCOUNT STATUS",

            "PERSONAL INFORMATION",
            "CONTACT DETAILS",
            "ADDRESS DETAILS",

            "MEMBER NAME",
            "MEMBER ID",

            "ENQUIRY DETAILS",
            "ENQUIRIES",

        }

    def normalize(self, text):

        if not text:
            return ""

        text = text.replace("\r", "")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n+", "\n", text)

        return text.strip()

    def clean(self, text):

        text = self.normalize(text)

        cleaned_lines = []

        seen = set()

        for line in text.split("\n"):

            line = line.strip()

            if not line:
                continue

            # Normalize for matching
            normalized = re.sub(
                r"[^A-Z0-9 ]",
                " ",
                line.upper()
            )

            normalized = re.sub(
                r"\s+",
                " ",
                normalized
            ).strip()

            # ----------------------------------------
            # Remove known report headings
            # ----------------------------------------

            if any(
                bad in normalized
                for bad in self.bad_lines
            ):
                continue

            # ----------------------------------------
            # Remove standalone heading words
            # ----------------------------------------

            if normalized in {
                "ADDRESS",
                "PERMANENT",
                "RESIDENCE",
                "CURRENT",
                "CATEGORY",
                "DATE",
                "REPORTED",
            }:
                continue

            # ----------------------------------------
            # Remove dates
            # ----------------------------------------

            if re.fullmatch(
                r"\d{2}/\d{2}/\d{4}",
                line
            ):
                continue

            # ----------------------------------------
            # Remove punctuation-only lines
            # ----------------------------------------

            if re.fullmatch(
                r"[-=:,./() ]+",
                line
            ):
                continue

            # ----------------------------------------
            # Remove tiny OCR junk
            # ----------------------------------------

            if len(normalized) <= 2:
                continue

            # ----------------------------------------
            # Remove duplicate lines
            # ----------------------------------------

            if line in seen:
                continue

            seen.add(line)
            cleaned_lines.append(line)

        # ----------------------------------------
        # Remove duplicate address blocks
        # ----------------------------------------

        final_lines = []
        seen = set()

        for line in cleaned_lines:

            normalized = re.sub(
                r"\s+",
                " ",
                line.strip()
            ).upper()

            if normalized in seen:
                break

            seen.add(normalized)
            final_lines.append(line)

        return "\n".join(final_lines)

    def score(self, text):

        text = self.clean(text)

        score = 0

        lower = text.lower()

        # Length
        if self.min_length <= len(text) <= self.max_length:
            score += 10

        # Lines
        lines = [x for x in text.split("\n") if x.strip()]

        if 3 <= len(lines) <= 10:
            score += 10

        # PIN
        if re.search(r"\b[1-9]\d{5}\b", text):
            score += 25

        # House / Plot number
        if re.search(
            r"\b(H\.?NO|HNO|HOUSE|PLOT|FLAT|ROOM|SHOP)\b",
            text,
            re.I,
        ):
            score += 10
        elif re.search(r"\b\d+\b", text):
            score += 5

        # State
        if any(re.search(rf"\b{re.escape(state)}\b", lower) for state in self.states):
            score += 15

        # Address keywords
        hits = sum(
            keyword in lower
            for keyword in self.address_keywords
        )

        score += min(hits * 3, 15)

        # Enough words
        if len(text.split()) >= 6:
            score += 10

        # OCR garbage
        garbage = len(
            re.findall(
                r"[^A-Za-z0-9\s,./()\-]",
                text,
            )
        )

        if garbage <= 3:
            score += 5

        return max(0, min(score, 100))

    def is_valid(self, text):

        return self.score(text) >= self.min_score

    def best_candidate(self, candidates):

        best = None
        best_score = -1

        for candidate in candidates:

            score = self.score(candidate)

            if score > best_score:
                best_score = score
                best = candidate

        if best is None:
            return None

        if best is None or best_score < self.min_score:
            return None

        return self.clean(best)