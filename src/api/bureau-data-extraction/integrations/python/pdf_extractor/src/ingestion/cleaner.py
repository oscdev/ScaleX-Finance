import re

from src.utils.logger import logger


class TextCleaner:

    def clean(self, text: str) -> str:

        # Fix hyphenated line breaks:
        # re-\nproducible -> reproducible
        text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

        # Replace remaining newlines with spaces
        text = re.sub(r"\n+", "\n", text)

        # Remove excessive spaces
        text = re.sub(r"[ \t]+", " ", text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text