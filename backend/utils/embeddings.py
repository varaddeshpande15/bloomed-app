from sentence_transformers import SentenceTransformer
from typing import List
from config import settings
from utils.logger import get_logger

logger = get_logger("embeddings_util")

# Lazy singleton — model loads on first use, not at import time.
# This lets the ASGI server bind its port before the heavy download/load.
_model = None


def _get_model():
    """Return the cached SentenceTransformer, loading it on first call."""
    global _model
    if _model is None:
        try:
            logger.info(f"Loading embedding model: {settings.EMBED_MODEL} ...")
            _model = SentenceTransformer(settings.EMBED_MODEL)
            logger.info(f"Embedding model loaded successfully: {settings.EMBED_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load sentence_transformers: {e}")
    return _model


def generate_embedding(text: str) -> List[float]:
    """
    Generates embedding locally via sentence-transformers.
    """
    model = _get_model()
    if model:
        # returns numpy array, convert to list
        return model.encode(text).tolist()
    else:
        logger.warning("Faking embedding, model failed to load")
        return [0.01] * settings.VECTOR_DIM
