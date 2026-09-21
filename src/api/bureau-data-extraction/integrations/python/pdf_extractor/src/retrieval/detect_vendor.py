"""Detect CIBIL PDF vendor layout from extracted text.

Returns Vendor1_NormalCIBIL | Vendor2_PolicyBazaar.
Unknown / ambiguous layouts default to Vendor1_NormalCIBIL (fail-safe).
"""

from __future__ import annotations

import re

from src.utils.logger import logger

VENDOR1_NORMAL = "Vendor1_NormalCIBIL"
VENDOR2_POLICYBAZAAR = "Vendor2_PolicyBazaar"

# Strong Policy Bazaar / Paisa Bazaar fingerprints.
_PB_STRONG = [
    re.compile(r"(?i)paisabazaar\.com"),
    re.compile(r"(?i)creditreport@paisabazaar\.com"),
    re.compile(r"(?i)Report\s*Number\s*\(ECN\)"),
    re.compile(r"(?i)Your\s*free\s*credit\s*report\s*is\s*a\s*detailed\s*analysis"),
    re.compile(r"(?i)Credit\s*Enquiries[\s\S]{0,200}?Enquired\s*on"),
]

# Classic TransUnion consumer report section headers.
_V1_STRONG = [
    re.compile(r"(?i)PERSONAL\s*DETAILS"),
    re.compile(r"(?i)OPEN\s*ACCOUNTS"),
    re.compile(r"(?im)^Member\s*Name\s*$"),
    re.compile(r"(?i)ENQUIRY\s*DETAILS"),
]


def detect_vendor(all_text: str) -> str:
    """Return vendor switch id from full PDF text."""
    text = all_text or ""
    pb_hits = sum(1 for p in _PB_STRONG if p.search(text))
    v1_hits = sum(1 for p in _V1_STRONG if p.search(text))

    if pb_hits >= 2 and pb_hits >= v1_hits:
        vendor = VENDOR2_POLICYBAZAAR
    elif pb_hits >= 1 and v1_hits == 0:
        vendor = VENDOR2_POLICYBAZAAR
    else:
        vendor = VENDOR1_NORMAL

    logger.info(
        "detect_vendor -> %s (pb_hits=%s v1_hits=%s)",
        vendor,
        pb_hits,
        v1_hits,
    )
    return vendor
