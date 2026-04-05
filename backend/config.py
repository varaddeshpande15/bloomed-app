from pydantic_settings import BaseSettings
from typing import Optional

import os

class Settings(BaseSettings):
    # API CONFIG
    FASTAPI_HOST: str = "127.0.0.1"
    FASTAPI_PORT: int = 8000
    
    # QDRANT CONFIG
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    COLLECTION_NAME: str = "syllabus_collection"
    
    # EMBEDDINGS
    EMBED_MODEL: str = "multi-qa-MiniLM-L6-cos-v1"
    VECTOR_DIM: int = 384
    
    # LLM/GROQ
    GROQ_API_KEY: str = ""
    MODEL_NAME: str = "llama-3.3-70b-versatile" # Default Groq model
    APP_NAME: str = "PsychProfileAgent"
    DEBUG: bool = False
    
    class Config:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        extra = "allow"

# Global settings instance
settings = Settings()

def get_settings():
    return settings
