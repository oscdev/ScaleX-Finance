from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Citation(BaseModel):
    page_number: int
    section_title: Optional[str] = None
    chunk_id: str


class Response(BaseModel):
    answer: str

    citations: List[Citation]

    confidence: ConfidenceLevel

    warning: Optional[str] = None