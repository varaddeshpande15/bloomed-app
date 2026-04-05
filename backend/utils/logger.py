import logging
from datetime import datetime

# Centralized Logger Setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(module_name: str) -> logging.Logger:
    """Returns a pre-configured logger for a given module."""
    return logging.getLogger(module_name)

# Specific Adaptive Event Logger functions
def log_adaptive_event(event_type: str, user_id: str, details: dict):
    """
    Tracks adaptive events for observability.
    E.g. event_types: behavior_detected, level_changed, topic_switched, confidence_updated
    """
    logger = get_logger("adaptive_engine_tracker")
    logger.info(f"ADAPTIVE_EVENT | TYPE: {event_type} | USER: {user_id} | DETAILS: {details}")

