import os
import re
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger

# Remove default logger
logger.remove()

_code_logs = os.environ.get("SCALEX_CODE_LOGS", "1").strip() not in ("0", "false", "False", "no", "NO")
_log_dir = os.environ.get("SCALEX_LOG_DIR", "").strip()
_log_module = os.environ.get("SCALEX_BUREAU_LOG_MODULE", "").strip()
_log_basename = os.environ.get("SCALEX_LOG_BASENAME", "").strip()
_lead_id = os.environ.get("SCALEX_LOG_LEAD_ID", "").strip()
_lead_name = os.environ.get("SCALEX_LOG_LEAD_NAME", "").strip()

# Default nested path when Strapi bridge did not pass SCALEX_LOG_DIR
_DEFAULT_MODULE = "personal-loan/pl-bureau-extraction"


def _sanitize_lead_name(name: str) -> str:
    cleaned = re.sub(r"\s+", "", (name or "").strip())
    cleaned = re.sub(r"[^a-zA-Z0-9.\-]", "", cleaned)
    return cleaned or "Unknown"


def _module_basename(module: str) -> str:
    return Path(module.replace("\\", "/")).name or "pl-bureau-extraction"


if _code_logs:
    if _log_dir:
        log_dir = Path(_log_dir)
        daily_stem = _log_basename or _module_basename(_log_module or _DEFAULT_MODULE)
    else:
        # logger.py: .../pdf_extractor/src/utils/logger.py → parents[8] = repo root
        repo_root = Path(__file__).resolve().parents[8]
        module = _log_module or _DEFAULT_MODULE
        log_dir = repo_root / "logs" / Path(module)
        daily_stem = _log_basename or _module_basename(module)

    log_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _lead_id:
        # Per-lead: logs/<personal-loan|business-loan>/<pl|bl>-bureau-extraction/<leadId>-<Name>_YYYY-MM-DD.log
        stem = f"{_lead_id}-{_sanitize_lead_name(_lead_name)}"
        log_file = log_dir / f"{stem}_{stamp}.log"
        if log_file.exists():
            log_file.unlink()
    else:
        # System / no lead: .../<basename>_YYYY-MM-DD.log
        log_file = log_dir / f"{daily_stem}_{stamp}.log"

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
