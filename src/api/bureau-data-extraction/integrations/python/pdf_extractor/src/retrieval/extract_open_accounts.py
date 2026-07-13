import re
from datetime import date, datetime

from src.utils.logger import logger
from src.utils.recency import extract_reference_date, months_back_cutoff
from src.validator.payment_history_validator import (
    FLAT_ROW_PATTERN,
    MONTH_NUMBER,
)


FOOTER_NOISE = re.compile(
    r"(?m)^\s*\d{2}/\d{2}/\d{4},\s*\d{1,2}:\d{2}\s*$|"
    r"(?m)^\s*CIBIL Report\s*$|"
    r"(?m)^\s*https?://\S+\s*$|"
    r"(?m)^\s*\d{1,3}/\d{1,3}\s*$|"
    r"(?m)^\s*ACCOUNT DETAILS\s*$|"
    r"(?m)^\s*PAYMENT STATUS\s*$|"
    r"(?m)^\s*STD:.*$|"
    r"(?m)^\s*DBT:.*$|"
    r"(?m)^\s*###:.*$|"
    r"(?m)^\s*SMA:.*$|"
    r"(?m)^\s*LSS:.*$|"
    r"(?m)^\s*XXX:.*$|"
    r"(?m)^\s*SUB:.*$"
)

MEMBER_SPLIT = re.compile(r"(?im)(?=^Member\s*Name\s*$)")

LABEL_SPECS = [
    ("credit_limit", r"Credit\s*Limit"),
    ("high_credit", r"High\s*Credit"),
    ("current_balance", r"Current\s*Balance"),
    ("cash_limit", r"Cash\s*Limit"),
    ("amount_overdue", r"Amount\s*Overdue"),
    ("rate_of_interest", r"Rate\s*of\s*Interest"),
    ("repayment_tenure", r"Repayment\s*Tenure"),
    ("emi_amount", r"EMI\s*Amount"),
    ("payment_frequency", r"Payment\s*Frequency"),
    ("actual_payment_amount", r"Actual\s*Payment\s*Amount"),
    ("date_opened", r"Date\s*Opened\s*/\s*Disbursed"),
    ("date_closed", r"Date\s*Closed"),
    ("date_of_last_payment", r"Date\s*of\s*Last\s*Payment"),
    ("date_reported_and_certified", r"Date\s*Reported\s*And\s*Certified"),
    ("value_of_collateral", r"Value\s*of\s*Collateral"),
    ("type_of_collateral", r"Type\s*of\s*Collateral"),
    ("suit_filed_wilful_default", r"Suit\s*-\s*Filed\s*/\s*Wilful\s*Default"),
    ("credit_facility_status", r"Credit\s*Facility\s*Status"),
    ("written_off_amount_total", r"Written-off\s*Amount\s*\(Total\)"),
    ("written_off_amount_principal", r"Written-off\s*Amount\s*\(Principal\)"),
    ("settlement_amount", r"Settlement\s*Amount"),
    ("payment_start_date", r"Payment\s*Start\s*Date"),
    ("payment_end_date", r"Payment\s*End\s*Date"),
]


def _clean_region(text: str) -> str:
    text = FOOTER_NOISE.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _labeled_value(text: str, label_regex: str) -> str | None:
    """
    Read the first non-empty line after a label line.
    Joins mid-word line breaks (e.g. Mon\\nthly → Monthly).
    """
    pattern = re.compile(
        rf"(?im)^(?:{label_regex})\s*$\n+([^\n]+(?:\n(?![A-Z][a-z].*:?\s*$)[^\n]+)*)",
    )
    match = pattern.search(text)
    if not match:
        pattern2 = re.compile(rf"(?im)^(?:{label_regex})\s*[:=]?\s+(.+)$")
        match = pattern2.search(text)
        if not match:
            return None

    value = match.group(1)
    value = re.sub(r"(?<=\w)\n(?=\w)", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    value = value.replace("₹", "").replace(",", "").strip()
    # Stop at known next-section markers accidentally captured
    value = re.split(
        r"\b(?:Member Name|Account Type|Credit Limit|Payment History|PAYMENT STATUS)\b",
        value,
    )[0].strip()
    return value if value else None


def _header_fields(block: str) -> dict:
    member = _labeled_value(block, r"Member\s*Name")
    account_type = _labeled_value(block, r"Account\s*Type")
    account_number = _labeled_value(block, r"Account\s*Number")
    ownership = _labeled_value(block, r"Ownership")
    return {
        "member_name": member,
        "account_type": account_type,
        "account_number": account_number,
        "ownership": ownership,
    }


def _detail_fields(block: str) -> dict:
    details = {}
    for key, label in LABEL_SPECS:
        value = _labeled_value(block, label)
        if value is not None:
            details[key] = value
    return details


def _payment_history(block: str, today: date, months_back: int) -> list[str]:
    history_match = re.search(
        r"(?is)Payment\s*History\s*(.*?)(?=PAYMENT\s*STATUS|Member\s*Name|STD:|$)",
        block,
    )
    if not history_match:
        return []

    raw = history_match.group(1)
    cutoff = months_back_cutoff(today, months_back)

    entries = []
    for month_abbr, year, value in FLAT_ROW_PATTERN.findall(raw):
        month_number = MONTH_NUMBER.get(month_abbr[:3].upper())
        if not month_number:
            continue
        year_i = int(year)
        if cutoff <= date(year_i, month_number, 1) <= today:
            entries.append((year_i, month_number, value))

    entries.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [f"{month:02d}/{year}: {value}" for year, month, value in entries]


def _is_account_block(block: str) -> bool:
    return bool(
        re.search(r"(?im)^Member\s*Name\s*$", block)
        and re.search(r"(?im)^Account\s*Number\s*$", block)
    )


def extract_open_accounts(field_cfg, all_text):
    """
    Parse OPEN ACCOUNTS into structured account objects including
    ACCOUNT DETAILS and PAYMENT STATUS (payment history trimmed to
    last `months_back` months, default 12).
    """
    try:
        validation = field_cfg.get("validation", {}) or {}
        months_back = int(validation.get("months_back", 12))
        region_pattern = field_cfg.get(
            "region_pattern",
            r"(?is)OPEN\s*ACCOUNTS(.*?)(?=CLOSED\s*ACCOUNTS|$)",
        )
        reference_date_pattern = field_cfg.get("reference_date_pattern")

        region_match = re.search(region_pattern, all_text)
        if not region_match:
            logger.warning("OPEN ACCOUNTS region not found")
            return []

        region = _clean_region(region_match.group(1))

        # Drop leading contact/email/employment noise before first account signal
        first_signal = re.search(
            r"(?is)(?:Credit\s*Limit|Member\s*Name)",
            region,
        )
        if first_signal:
            region = region[first_signal.start() :]

        today = extract_reference_date(all_text, reference_date_pattern)
        if today is None:
            today = datetime.today().date()

        parts = [part.strip() for part in MEMBER_SPLIT.split(region) if part.strip()]

        account_blocks: list[str] = []
        buffer: list[str] = []

        for part in parts:
            if _is_account_block(part):
                if buffer and account_blocks:
                    # Trailing payment/details belong to the previous account
                    account_blocks[-1] = (
                        account_blocks[-1] + "\n" + "\n".join(buffer)
                    ).strip()
                    buffer = []
                elif buffer and not account_blocks:
                    # Credit Limit block before first Member Name
                    part = ("\n".join(buffer) + "\n" + part).strip()
                    buffer = []
                account_blocks.append(part)
            else:
                buffer.append(part)

        if buffer and account_blocks:
            account_blocks[-1] = (
                account_blocks[-1] + "\n" + "\n".join(buffer)
            ).strip()

        accounts = []
        for block in account_blocks:
            header = _header_fields(block)
            if not header.get("member_name") or not header.get("account_number"):
                continue

            details = _detail_fields(block)
            payment_history = _payment_history(block, today, months_back)

            account = {
                **{k: v for k, v in header.items() if v is not None},
                **details,
                "payment_history": payment_history,
            }
            accounts.append(account)

        logger.info("open_accounts extracted: %s", len(accounts))
        return accounts
    except Exception:
        logger.exception("Failed to extract open accounts")
        return []
