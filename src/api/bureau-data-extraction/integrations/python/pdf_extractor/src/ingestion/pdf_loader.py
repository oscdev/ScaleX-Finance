import fitz

from pathlib import Path

from src.utils.logger import logger


class PDFLoader:

    def __init__(self, file_path: str):
        self.file_path = Path(file_path)

    def load(self):

        if not self.file_path.exists():
            logger.error(f"File not found: {self.file_path}")
            raise FileNotFoundError(f"{self.file_path} does not exist")

        try:
            document = fitz.open(self.file_path)

            logger.info(
                f"PDF loaded successfully | Pages: {document.page_count}"
            )

            return document

        except Exception as e:

            logger.exception("Failed to load PDF")

            raise e