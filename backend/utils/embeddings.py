from sentence_transformers import SentenceTransformer
from typing import List
from backend_unified.config import settings
from backend_unified.utils.logger import get_logger

logger = get_logger("embeddings_util")

try:
    model = SentenceTransformer(settings.EMBED_MODEL)
    logger.info(f"Loaded embedding model: {settings.EMBED_MODEL}")
except Exception as e:
    logger.error(f"Failed to load sentence_transformers: {e}")
    model = None

def generate_embedding(text: str) -> List[float]:
    """
    Generates embedding locally via sentence-transformers.
    """
    if model:
        # returns numpy array, convert to list
        return model.encode(text).tolist()
    else:
        logger.warning("Faking embedding, model failed to load")
        return [0.01] * settings.VECTOR_DIM
