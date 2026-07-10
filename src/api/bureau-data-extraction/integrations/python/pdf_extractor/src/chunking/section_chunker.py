import re

from src.schemas.chunk import Chunk

from src.utils.logger import logger


class SectionChunker:

    def is_section_header(self, line: str) -> bool:

        line = line.strip()

        if not line:
            return False

        # Reject bullets/content
        if line.startswith(("•", "-", "–")):
            return False

        # Reject URLs/emails
        if "@" in line or "http" in line:
            return False
        
        # Reject date-like lines
        if re.fullmatch(r"[\d\-\-/] ", line):
            return False
        
        # Reject likely metadata lines
        if ":" in line:
            return False
        
        # Reject comma-heavy organization lines
        if line.count(",") > 2:
            return False

        # Reject very long lines
        if len(line.split()) > 8:
            return False

        # Reject sentence-like endings
        if re.search(r"[.!?]$", line):
            return False

        words = line.split()

        # Require meaningful capitalization
        capitalized_words = sum(
            1 for word in words
            if word[:1].isupper()
        )

        capitalization_ratio = (
            capitalized_words / len(words)
        )

        # Section titles usually highly capitalized
        if capitalization_ratio < 0.7:
            return False

        return True

    def chunk(
        self,
        cleaned_pages,
        source_file: str
    ):


        chunks = []

        current_section = None

        current_content = []

        chunk_counter = 1

        current_page = 1

        for page in cleaned_pages:

            current_page = page["page_number"]

            lines = page["text"].split("\n")

            for line in lines:

                line = line.strip()

                if not line:
                    continue

                if self.is_section_header(line):

                    # Save previous chunk
                    if current_content:

                        chunk = Chunk(
                            chunk_id=f"chunk_{chunk_counter:04}",
                            source_file=source_file,
                            page_number=current_page,
                            section_title=(
                                current_section
                                or "Untitled Section"
                            ),
                            raw_content="\n".join(
                                current_content
                            ),
                            clean_content="\n".join(
                                current_content
                            )
                        )

                        chunks.append(chunk)

                        chunk_counter += 1

                        current_section = line

                    elif current_section:

                        # Consecutive header lines with no body
                        # between them (e.g. "SANCTIONED" then
                        # "AMOUNT") are one multi-line label -
                        # merge instead of discarding the earlier
                        # word(s).
                        current_section = (
                            f"{current_section} {line}"
                        )

                    else:

                        current_section = line

                    current_content = []

                else:

                    current_content.append(line)

        # Final chunk
        if current_content:

            chunk = Chunk(
                chunk_id=f"chunk_{chunk_counter:04}",
                source_file=source_file,
                page_number=current_page,
                section_title=(
                    current_section
                    or "Untitled Section"
                ),
                raw_content="\n".join(
                    current_content
                ),
                clean_content="\n".join(
                    current_content
                )
            )

            chunks.append(chunk)


        logger.info(
            f"Chunking done. Total chunks created: {len(chunks)}"
        )

        return chunks