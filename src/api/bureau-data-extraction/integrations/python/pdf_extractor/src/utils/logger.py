import os
import re
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger

# Remove default logger
logger.remove()

_code_logs = os.environ.get("SCALEX_CODE_LOGS", "1").strip() not in ("0", "false", "False", "no", "NO")
_log_dir = os.environ.get("SCALEX_LOG_DIR", "").strip()
_lead_id = os.environ.get("SCALEX_LOG_LEAD_ID", "").strip()
_lead_name = os.environ.get("SCALEX_LOG_LEAD_NAME", "").strip()


def _sanitize_lead_name(name: str) -> str:
    cleaned = re.sub(r"\s+", "", (name or "").strip())
    cleaned = re.sub(r"[^a-zA-Z0-9.\-]", "", cleaned)
    return cleaned or "Unknown"


if _code_logs:
    if _log_dir:
        log_dir = Path(_log_dir)
    else:
        # logger.py: .../pdf_extractor/src/utils/logger.py → parents[8] = repo root
        repo_root = Path(__file__).resolve().parents[8]
        log_dir = repo_root / "logs" / "bureau-extraction"

    log_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _lead_id:
        # Per-lead: logs/bureau-extraction/<leadId>-<Name>_YYYY-MM-DD.log
        stem = f"{_lead_id}-{_sanitize_lead_name(_lead_name)}"
        log_file = log_dir / f"{stem}_{stamp}.log"
        if log_file.exists():
            log_file.unlink()
    else:
        # System / no lead: logs/bureau-extraction/bureau-extraction_YYYY-MM-DD.log
        log_file = log_dir / f"bureau-extraction_{stamp}.log"

    logger.add(
        str(log_file),
        level="DEBUG",
        rotation="10 MB",
        retention="10 days",
        compression="zip",
        enqueue=True,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {message}",
    )
    logger.info("Logger initialized path={}", log_file)
else:
    # Keep loguru usable but discard (no file)
    import os as _os
    logger.add(_os.devnull, level="DEBUG")
