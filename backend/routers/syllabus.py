from fastapi import APIRouter, File, HTTPException, UploadFile

from backend_unified.models.schemas import SyllabusUploadResponse
from backend_unified.services.ingestion_service import process_syllabus

router = APIRouter()


@router.post("/upload-syllabus", response_model=SyllabusUploadResponse)
async def upload_syllabus(file: UploadFile = File(...)):
    """
    Ingests syllabus content and maps into a concept tree in Qdrant.
    PDF text uses magic-byte + filename detection when Content-Type is wrong.
    """
    file_bytes = await file.read()
    try:
        return process_syllabus(
            file_bytes,
            file.content_type,
            filename=file.filename,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
