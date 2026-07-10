from src.utils.logger import logger


class PDFParser:

    def __init__(self, document):
        self.document = document

    def parse(self):

        parsed_pages = []

        for page_index in range(self.document.page_count):

            page = self.document.load_page(page_index)

            text = page.get_text("text").strip()

            parsed_pages.append(
                {
                    "page_number": page_index + 1,
                    "text": text
                }
            )

        logger.info(
            f"Parsed {len(parsed_pages)} pages successfully"
        )

        return parsed_pages