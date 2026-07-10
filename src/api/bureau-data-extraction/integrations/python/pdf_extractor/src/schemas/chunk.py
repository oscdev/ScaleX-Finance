from pydantic import BaseModel
from typing import Optional


class Chunk(BaseModel):
    chunk_id: str

    source_file: str

    page_number: int

    section_title: Optional[str] = None

    raw_content: str

    clean_content: str

    embedding: Optional[list[float]] = None

    metadata: Optional[dict] = None