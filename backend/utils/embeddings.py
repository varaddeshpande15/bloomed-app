from typing import List
import requests
from config import settings
from utils.logger import get_logger

logger = get_logger("embeddings_util")

# HuggingFace Inference API endpoint for the embedding model
_HF_API_URL = f"https://api-inference.huggingface.co/models/sentence-transformers/{settings.EMBED_MODEL}"


def generate_embedding(text: str) -> List[float]:
    """
    Generates embedding via the HuggingFace Inference API.
    Uses the same model (multi-qa-MiniLM-L6-cos-v1) but runs remotely,
    keeping RAM usage minimal.
    """
    token = settings.HF_TOKEN
    if not token:
        logger.warning("HF_TOKEN not set — returning zero vector")
        return [0.01] * settings.VECTOR_DIM

    headers = {"Authorization": f"Bearer {token}"}
    payload = {"inputs": text}

    try:
        resp = requests.post(_HF_API_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        embedding = resp.json()

        # The API returns a list of floats (or nested list for single input)
        if isinstance(embedding, list):
            # Single string input → returns [[...]] or [...]
            if isinstance(embedding[0], list):
                return embedding[0]
            return embedding

        logger.error(f"Unexpected HF API response type: {type(embedding)}")
        return [0.01] * settings.VECTOR_DIM

    except Exception as e:
        logger.error(f"HuggingFace Inference API call failed: {e}")
        return [0.01] * settings.VECTOR_DIM
