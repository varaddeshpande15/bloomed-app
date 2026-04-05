from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from backend_unified.config import settings
from backend_unified.utils.logger import get_logger

logger = get_logger("vector_service")

class VectorService:
    def __init__(self):
        self.collection_name = settings.COLLECTION_NAME
        try:
            if settings.QDRANT_URL and settings.QDRANT_API_KEY:
                self.client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            else:
                self.client = QdrantClient(":memory:")
            
            if not self.client.collection_exists(collection_name=self.collection_name):
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=settings.VECTOR_DIM, distance=Distance.COSINE)
                )
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            self.client = None

    def store_chunks(self, chunks: List[Dict[str, Any]]):
        if not self.client: return
        logger.info(f"Storing {len(chunks)} chunks to Qdrant")
        points = []
        for chunk in chunks:
            points.append(
                PointStruct(
                    id=chunk["id"],
                    vector=chunk["vector"],
                    payload=chunk["payload"]
                )
            )
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    def retrieve_context(self, topic: str, concept: str, vector: List[float], limit=3) -> str:
        """
        Retrieves top-k related text for generation.
        """
        if not self.client: return f"Context mapping to {topic} - {concept}"
        
        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=limit
        )
        return "\n".join([hit.payload.get("text", "") for hit in search_result])
