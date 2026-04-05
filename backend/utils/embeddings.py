from sentence_transformers import SentenceTransformer
from typing import List
from config import settings
from utils.logger import get_logger

logger = get_logger("embeddings_util")

model = None

def get_model():
    global model
    if model is None:
        logger.info(f"🔥 Loading embedding model: {settings.EMBED_MODEL}")
        model = SentenceTransformer(settings.EMBED_MODEL)
    return model

def generate_embedding(text: str) -> List[float]:
    try:
        model = get_model()
        return model.encode(text).tolist()
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return [0.01] * settings.VECTOR_DIM