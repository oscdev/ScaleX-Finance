"""Policy Bazaar / Paisa Bazaar Account Details parser (Vendor2).

Emits the same open_accounts object shape as Vendor1 extract_open_accounts.
Only Active accounts are included (mirrors Vendor1 OPEN ACCOUNTS section).
"""

from __future__ import annotations

import re
from datetime import date, datetime

from src.utils.logger import logger
from src.utils.recency import extract_reference_date, months_back_cutoff

FOOTER_NOISE = re.compile(
    r"(?m)"
    r"^\s*Report\s*Number\s*\(ECN\).*$|"
    r"^\s*Report\s*Date\s*:.*$|"
    r"^\s*Report\s*to\s*CIBIL.*$|"
    r"^\s*Table\s*of\s*Contents\s*$|"
    r"^\s*Paid\s*on\s*time.*$|"
    r"^\s*JAN\s+FEB\s+MAR\s+APR\s+MAY\s+JUN\s+JUL\s+AUG\s+SEP\s+OCT\s+NOV\s+DEC\s*$"
)

# Split before each account header: "INSTITUTION Active|Closed|Written-off"
ACCOUNT_SPLIT = re.compile(
    r"(?im)(?=^[A-Z0-9][A-Z0-9 .&\-]{1,40}?\s+"
    r"(?:Active|Closed|Written[\-\s]?o(?:ff|ﬀ))\s*$)"
)

HEADER_LINE = re.compile(
    r"(?im)^([A-Z0-9][A-Z0-9 .&\-]{1,40}?)\s+"
    r"(Active|Closed|Written[\-\s]?o(?:ff|ﬀ))\s*$"
)

ACCOUNT_NUMBER = re.compile(
    r"(?i)Account\s*Number:\s*([A-Za-z0-9X*]+)"
)
ACCOUNT_TYPE = re.compile(
    r"(?i)Account\s*type:\s*(.+?)(?=\s*Account\s*Status:|$)",
    re.DOTALL,
)
ACCOUNT_STATUS = re.compile(
    r"(?i)Account\s*Status:\s*(Active|Closed|Written[\-\s]?o(?:ff|ﬀ))"
)
OWNERSHIP = re.compile(
    r"(?i)Ownership:\s*(Individual|Joint|Guarantor|Authorized\s*User)"
)

# Label → Vendor1 key. Values sit on the same line after the label.
LABEL_SPECS = [
    ("date_opened", r"Account\s*Opened\s*Date"),
    ("date_closed", r"Account\s*Closed\s*Date"),
    ("date_reported_and_certified", r"Last\s*Bank\s*Update"),
    ("date_of_last_payment", r"Last\s*Payment\s*Date"),
    ("high_credit", r"Loan\s*Amount"),
    ("credit_limit", r"Credit\s*Limit"),
    ("current_balance", r"Outstanding\s*Balance"),
    ("amount_overdue", r"Overdue\s*Amount"),
    ("emi_amount", r"EMI\s*Amount"),
    ("settlement_amount", r"Settlement\s*Amount"),
    ("rate_of_interest", r"Interest\s*Rate"),
    ("repayment_tenure", r"Repayment\s*Tenure"),
    ("cash_limit", r"Cash\s*Limit"),
    ("payment_frequency", r"Payment\s*Frequency"),
    ("actual_payment_amount", r"Actual\s*Last\s*Payment"),
    ("payment_start_date", r"Pay\s*Start\s*Date"),
    ("payment_end_date", r"Pay\s*End\s*Date"),
    ("value_of_collateral", r"Collateral(?!\s*Type)"),
    ("type_of_collateral", r"Collateral\s*Type"),
    ("suit_filed_wilful_default", r"Suit\s*Filed\s*Status"),
    ("written_off_amount_total", r"Written[\-\s]?O(?:ff|ﬀ)\s*Total\s*Amount"),
    ("written_off_amount_principal", r"Written[\-\s]?O(?:ff|ﬀ)\s*Principal"),
]

NA_VALUES = {"", "NA", "N/A", "-", "—", "null", "None"}

MONTH_NUMBER = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

YEAR_ONLY = re.compile(r"^(20\d{2})$")
DPD_TOKEN = re.compile(r"^(?:\d{1,3}|[A-Z]|XXX|-)$", re.IGNORECASE)
STOP_MARKERS = re.compile(
    r"(?i)^(Paid\s*on\s*time|Report\s*Number|Report\s*Date|Report\s*to\s*CIBIL|"
    r"Table\s*of\s*Contents|This\s*section|Contact\s*Information|Support|Disclaimer|"
    r"Account\s*Number:|[A-Z0-9].*\s+(?:Active|Closed|Written))"
)


def _clean_region(text: str) -> str:
    text = FOOTER_NOISE.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _normalize_date(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value in NA_VALUES:
        return None
    m = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", value)
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    return value


def _clean_money(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().replace("₹", "").replace(",", "")
    if value in NA_VALUES:
        return None
    return value


def _labeled_value(text: str, label_regex: str) -> str | None:
    pattern = re.compile(
        rf"(?im)(?:{label_regex})\s+([^\n]+)",
    )
    match = pattern.search(text)
    if not match:
        return None
    value = match.group(1).strip()
    value = re.split(
        r"\s{2,}(?=[A-Z][A-Za-z\-\s]{2,40}\s)",
        value,
    )[0].strip()
    value = re.sub(r"\s+", " ", value).strip()
    if value in NA_VALUES:
        return None
    return value


def _header_fields(block: str) -> dict:
    header = HEADER_LINE.search(block)
    member = header.group(1).strip() if header else None
    status_hdr = header.group(2).strip() if header else None

    acct_num = ACCOUNT_NUMBER.search(block)
    acct_type = ACCOUNT_TYPE.search(block)
    status = ACCOUNT_STATUS.search(block)
    ownership = OWNERSHIP.search(block)

    account_type = None
    if acct_type:
        account_type = re.sub(r"\s+", " ", acct_type.group(1)).strip()
        account_type = re.split(r"\s+Account\s+Status:", account_type)[0].strip()

    status_val = None
    if status:
        status_val = status.group(1).strip()
    elif status_hdr:
        status_val = status_hdr

    return {
        "member_name": member,
        "account_type": account_type,
        "account_number": acct_num.group(1).strip() if acct_num else None,
        "ownership": ownership.group(1).strip() if ownership else None,
        "_status": status_val,
    }


def _detail_fields(block: str) -> dict:
    details = {}
    for key, label in LABEL_SPECS:
        value = _labeled_value(block, label)
        if value is None:
            continue
        if key.startswith("date_") or key in (
            "payment_start_date",
            "payment_end_date",
        ):
            value = _normalize_date(value)
        elif key in (
            "high_credit",
            "credit_limit",
            "current_balance",
            "amount_overdue",
            "emi_amount",
            "settlement_amount",
            "cash_limit",
            "actual_payment_amount",
            "value_of_collateral",
            "written_off_amount_total",
            "written_off_amount_principal",
        ):
            value = _clean_money(value)
        if value is not None:
            details[key] = value
    return details


def _account_opened_floor(block: str) -> date | None:
    """Earliest month to invent paid-on-time zeros (Account Opened Date)."""
    raw = _labeled_value(block, r"Account\s*Opened\s*Date")
    normalized = _normalize_date(raw)
    if not normalized:
        return None
    try:
        parsed = datetime.strptime(normalized, "%d/%m/%Y").date()
        return date(parsed.year, parsed.month, 1)
    except ValueError:
        return None


def _payment_history(block: str, today: date, months_back: int) -> list[str]:
    """
    Policy Bazaar DPD grid (often one token per line after pdfplumber):

        JAN … DEC
        2021
        54
        60
        …
        2020
        …

    Values are left-aligned from January.
    Empty year rows (no DPD tokens — typical Active “paid on time” graphics)
    are filled as paid-on-time ``0`` for each month in the recency window
    (capped by report date and account opened month).

    Output: ["MM/YYYY: value", ...] newest-first — same as Vendor1.
    """
    history_match = re.search(
        r"(?is)Payment\s*History\s*(.*)$",
        block,
    )
    if not history_match:
        return []

    raw = history_match.group(1)
    cutoff = months_back_cutoff(today, months_back)
    opened_floor = _account_opened_floor(block)
    entries: list[tuple[int, int, str]] = []

    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    # Drop leading legend / month header noise until first year
    i = 0
    while i < len(lines) and not YEAR_ONLY.match(lines[i]):
        i += 1

    while i < len(lines):
        line = lines[i]
        if STOP_MARKERS.match(line):
            break
        year_m = YEAR_ONLY.match(line)
        if not year_m:
            i += 1
            continue

        year = int(year_m.group(1))
        i += 1
        values: list[str] = []
        while i < len(lines):
            nxt = lines[i]
            if YEAR_ONLY.match(nxt) or STOP_MARKERS.match(nxt):
                break
            # Skip leftover month abbreviations if any slipped through
            if nxt.upper()[:3] in MONTH_NUMBER and len(nxt) <= 3:
                i += 1
                continue
            if DPD_TOKEN.match(nxt):
                values.append(nxt.upper() if nxt.isalpha() else nxt)
            i += 1

        if not values:
            # Empty year row = paid on time (graphics not in text layer)
            for month_number in range(1, 13):
                try:
                    cell_date = date(year, month_number, 1)
                except ValueError:
                    continue
                if cell_date < cutoff or cell_date > today:
                    continue
                if opened_floor and cell_date < opened_floor:
                    continue
                entries.append((year, month_number, "0"))
            continue

        for idx, value in enumerate(values):
            month_number = idx + 1
            if month_number > 12:
                break
            try:
                cell_date = date(year, month_number, 1)
            except ValueError:
                continue
            if cutoff <= cell_date <= today:
                entries.append((year, month_number, value))

    entries.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [f"{month:02d}/{year}: {value}" for year, month, value in entries]


def _is_active(status: str | None) -> bool:
    if not status:
        return False
    return bool(re.match(r"(?i)^Active", status.strip()))


def extract_open_accounts_policybazaar(field_cfg, all_text):
    """
    Parse Account Details into structured account objects matching
    Vendor1 keys. Only Active accounts are returned.
    """
    try:
        validation = field_cfg.get("validation", {}) or {}
        months_back = int(validation.get("months_back", 12))
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)Account\s*Details\s*\n"
            r"This\s*section\s*has\s*information(.*?)(?=Contact\s*Information|Support|Disclaimer|$)",
        )
        reference_date_pattern = field_cfg.get("reference_date_pattern")

        region_match = re.search(region_pattern, all_text)
        if not region_match:
            # Fallback: from first Active header through Contact Information
            region_match = re.search(
                r"(?is)((?:^[A-Z0-9].*?\s+Active\s*$).*)(?=Contact\s*Information|Support|$)",
                all_text,
                re.MULTILINE,
            )
        if not region_match:
            logger.warning("PolicyBazaar Account Details region not found")
            return []

        region = _clean_region(
            region_match.group(1)
            if region_match.lastindex and region_match.lastindex >= 1
            else region_match.group(0)
        )

        today = extract_reference_date(all_text, reference_date_pattern)
        if today is None:
            today = datetime.today().date()

        parts = [p.strip() for p in ACCOUNT_SPLIT.split(region) if p.strip()]
        accounts = []

        for block in parts:
            header = _header_fields(block)
            if not header.get("member_name") or not header.get("account_number"):
                continue
            if not _is_active(header.get("_status")):
                continue

            details = _detail_fields(block)
            payment_history = _payment_history(block, today, months_back)

            account = {
                **{
                    k: v
                    for k, v in header.items()
                    if v is not None and not k.startswith("_")
                },
                **details,
                "payment_history": payment_history,
            }
            accounts.append(account)

        logger.info(
            "open_accounts (PolicyBazaar) extracted: %s", len(accounts)
        )
        return accounts
    except Exception:
        logger.exception("Failed to extract PolicyBazaar open accounts")
        return []
