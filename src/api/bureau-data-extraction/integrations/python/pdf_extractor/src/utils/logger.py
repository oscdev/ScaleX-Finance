from loguru import logger
from pathlib import Path

# Ensure logs directory exists
Path("logs").mkdir(exist_ok=True)

# Remove default logger
logger.remove()

# Log everything to file only
logger.add(
    "logs/app.txt",
    level="DEBUG",
    rotation="10 MB",
    retention="10 days",
    compression="zip",
    enqueue=True,
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {message}",
)

logger.info("Logger initialized")