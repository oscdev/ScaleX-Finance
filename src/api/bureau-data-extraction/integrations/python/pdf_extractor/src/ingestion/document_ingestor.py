from pathlib import Path

from src.ingestion.pdf_loader import (
    PDFLoader
)

from src.ingestion.parser import (
    PDFParser
)

from src.ingestion.cleaner import (
    TextCleaner
)

from src.chunking.section_chunker import (
    SectionChunker
)

from src.utils.logger import logger


class DocumentIngestor:

    def __init__(
        self,
        pdf_directory: str
    ):

        self.pdf_directory = Path(
            pdf_directory
        )

        self.cleaner = TextCleaner()

        logger.info("Cleaned extracted text")

        self.chunker = SectionChunker()

    def ingest(self):

        # -------------------------
        # Check if directory exists
        # -------------------------
        if not self.pdf_directory.exists():
            logger.error(
                f"Directory does not exist: {self.pdf_directory}"
            )
            raise FileNotFoundError(
                f"Directory does not exist: {self.pdf_directory}"
            )

        # -------------------------
        # Check if cibil_report.pdf exists
        # -------------------------
        pdf_file = self.pdf_directory / "cibil_report.pdf"

        if not pdf_file.exists():
            logger.error(
                f"Required PDF not found: {pdf_file}"
            )
            raise FileNotFoundError(
                f"Required PDF not found: {pdf_file}"
            )

        # Only process cibil_report.pdf
        pdf_files = [pdf_file]

        all_chunks = []
        all_pages = []

        all_pages = []

        for pdf_file in pdf_files:

            # -------------------------
            # Load PDF
            # -------------------------

            loader = PDFLoader(
                str(pdf_file)
            )

            document = loader.load()

            # -------------------------
            # Parse PDF
            # -------------------------

            parser = PDFParser(document)

            parsed_pages = parser.parse()

            # -------------------------
            # Clean Pages
            # -------------------------

            cleaned_pages = []

            for page in parsed_pages:

                cleaned_text = (
                    self.cleaner.clean(
                        page["text"]
                    )
                )

                cleaned_page = {
                    "source_file": (
                        pdf_file.name
                    ),
                    "page_number": (
                        page["page_number"]
                    ),
                    "text": cleaned_text
                }

                cleaned_pages.append(
                    cleaned_page
                )

                all_pages.append(
                    cleaned_page
                )

            # -------------------------
            # Chunk Pages
            # -------------------------

            chunks = self.chunker.chunk(
                cleaned_pages=cleaned_pages,
                source_file=pdf_file.name
            )

            all_chunks.extend(chunks)


        logger.info(
            f"Corpus ingestion complete | "
            f"Total Pages: {len(all_pages)} | "
            f"Total Chunks: {len(all_chunks)}"
        )

        return {
            "pages": all_pages,
            "chunks": all_chunks
        }