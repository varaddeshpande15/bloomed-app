import uuid
import json
import re
from typing import List, Optional

from groq import Groq

from backend_unified.config import settings
from backend_unified.utils.parser import clean_text, extract_text_from_upload
from backend_unified.utils.embeddings import generate_embedding
from backend_unified.models.schemas import SyllabusUploadResponse, TopicBreakdown
from backend_unified.services.vector_service import VectorService
from backend_unified.utils.logger import get_logger

logger = get_logger("ingestion_service")
vector_service = VectorService()

# Below this, extraction is unreliable — do not call LLM with fake curriculum
MIN_TEXT_CHARS = 50
MIN_WORDS = 12

SYSTEM_EXTRACT = (
    "You extract syllabus or course outline structure from the user's document text ONLY.\n"
    "Rules:\n"
    "- Every topic and subtopic must reflect the actual document: use chapter titles, unit names, "
    "learning outcomes, and section headings from the text.\n"
    "- Do NOT invent placeholder curricula (for example generic 'Introduction to Curriculum' blocks) "
    "when they are not supported by the text.\n"
    "- If the text is empty, garbled, or too short to identify real sections, return {\"topics\": []}.\n"
    "- Respond with valid JSON only, shape: "
    '{"topics": [{"topic": "string", "subtopics": ["string", ...]}]}'
)

SYSTEM_SPARSE = (
    "The syllabus text is short. Extract ONLY what is explicitly stated; use 1–4 topics if the text "
    "clearly lists them. Do not invent filler modules. If nothing clear exists, return {\"topics\": []}.\n"
    "JSON only: "
    '{"topics": [{"topic": "string", "subtopics": ["string", ...]}]}'
)


def _word_count(text: str) -> int:
    return len(text.split())


def extract_links(text: str) -> List[str]:
    return re.findall(r"https?://\S+", text)


def process_syllabus(
    file_bytes: bytes,
    file_type: Optional[str],
    raw_text_input: Optional[str] = None,
    filename: Optional[str] = None,
) -> SyllabusUploadResponse:
    """
    Parse upload, extract topics via Groq, embed chunks into Qdrant.
    """
    logger.info("Starting syllabus pipeline (filename=%r, content_type=%r)", filename, file_type)

    if raw_text_input:
        raw_text = raw_text_input
    else:
        raw_text = extract_text_from_upload(file_bytes, file_type, filename)

    cleaned_text = clean_text(raw_text)
    resources = extract_links(cleaned_text)

    if not cleaned_text.strip():
        raise ValueError(
            "No text could be extracted from this file. "
            "If the PDF is scanned (photos of pages), install the Tesseract OCR program, "
            "ensure it is on your PATH, run: pip install pytesseract Pillow, then restart the server. "
            "See: https://github.com/UB-Mannheim/tesseract/wiki (Windows)"
        )

    if len(cleaned_text) < MIN_TEXT_CHARS or _word_count(cleaned_text) < MIN_WORDS:
        logger.warning(
            "Extracted text too short (%d chars, %d words); refusing LLM hallucination",
            len(cleaned_text),
            _word_count(cleaned_text),
        )
        return SyllabusUploadResponse(
            topics=[],
            resources=resources,
            enhanced=False,
        )

    wc = _word_count(cleaned_text)
    is_sparse = wc < 120
    is_enhanced = is_sparse

    topics: List[TopicBreakdown] = []
    if not (settings.GROQ_API_KEY or "").strip():
        logger.error("GROQ_API_KEY is not set")
        raise ValueError("Server misconfiguration: GROQ_API_KEY is missing. Set it in backend_unified/.env")

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        system_prompt = SYSTEM_SPARSE if is_sparse else SYSTEM_EXTRACT
        chunk = cleaned_text[:8000]

        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Syllabus document text:\n\n{chunk}"},
            ],
            model=settings.MODEL_NAME or "llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        result_str = response.choices[0].message.content
        if not result_str:
            raise ValueError("Empty LLM response")
        data = json.loads(result_str)
        for t in data.get("topics", []):
            try:
                topics.append(TopicBreakdown(**t))
            except Exception as ex:
                logger.warning("Skipping invalid topic row: %s (%s)", t, ex)

    except Exception as e:
        logger.exception("LLM syllabus extraction failed: %s", e)
        raise ValueError(f"Could not structure syllabus topics: {e!s}") from e

    chunks = []
    chunk_size = 500
    text_chunks = [
        cleaned_text[i : i + chunk_size] for i in range(0, len(cleaned_text), chunk_size)
    ]

    for txt in text_chunks:
        if not txt.strip():
            continue
        chunk_id = str(uuid.uuid4())
        vector = generate_embedding(txt)
        mapped_topic = topics[0].topic if topics else "general"
        chunks.append(
            {
                "id": chunk_id,
                "vector": vector,
                "payload": {"topic": mapped_topic, "text": txt},
            }
        )

    if chunks:
        try:
            vector_service.store_chunks(chunks)
        except Exception as ex:
            logger.warning("Vector store failed (topics still returned): %s", ex)

    logger.info(
        "Syllabus pipeline done: topics=%d, enhanced=%s, resources=%d",
        len(topics),
        is_enhanced,
        len(resources),
    )
    return SyllabusUploadResponse(topics=topics, resources=resources, enhanced=is_enhanced)
