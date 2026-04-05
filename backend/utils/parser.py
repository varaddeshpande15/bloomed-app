import io
import fitz  # PyMuPDF
from backend_unified.utils.logger import get_logger

logger = get_logger("parser_util")

# If native PDF text has fewer characters than this, try OCR (scanned PDFs).
_MIN_NATIVE_TEXT_FOR_OCR_SKIP = 25
# Max pages to OCR (syllabi are usually short; keeps latency reasonable)
_OCR_MAX_PAGES = 30
# Render scale for OCR (higher = better for small text, slower)
_OCR_MATRIX = fitz.Matrix(2.0, 2.0)


def _normalize_mime(content_type: str | None) -> str:
    if not content_type:
        return ""
    return content_type.split(";")[0].strip().lower()


def _is_pdf_magic(file_bytes: bytes) -> bool:
    return len(file_bytes) >= 4 and file_bytes[:4] == b"%PDF"


def _parse_pdf_native(file_bytes: bytes) -> str:
    """Extract embedded (selectable) text from a PDF using PyMuPDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text())
        return "\n".join(parts)
    finally:
        doc.close()


def _parse_pdf_ocr(file_bytes: bytes) -> str:
    """
    Rasterize pages and run Tesseract OCR. Used when the PDF has no text layer (scanned docs).
    Requires: pip install pytesseract Pillow
    System: Tesseract OCR on PATH (https://github.com/tesseract-ocr/tesseract)
    Windows build: https://github.com/UB-Mannheim/tesseract/wiki
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning(
            "Scanned PDF detected but pytesseract/Pillow are not installed. "
            "Run: pip install pytesseract Pillow"
        )
        return ""

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    parts: list[str] = []
    try:
        n = min(doc.page_count, _OCR_MAX_PAGES)
        for i in range(n):
            page = doc[i]
            pix = page.get_pixmap(matrix=_OCR_MATRIX, alpha=False)
            png_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(png_bytes))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            try:
                text = pytesseract.image_to_string(img, lang="eng")
            except pytesseract.TesseractNotFoundError:
                logger.error(
                    "Tesseract executable not found. Install Tesseract OCR and add it to PATH. "
                    "Windows: https://github.com/UB-Mannheim/tesseract/wiki — "
                    "then re-run the upload."
                )
                return ""
            parts.append(text)
        if doc.page_count > _OCR_MAX_PAGES:
            logger.info(
                "OCR processed first %d pages only (total pages=%d)",
                _OCR_MAX_PAGES,
                doc.page_count,
            )
    except Exception as e:
        logger.exception("OCR pipeline failed: %s", e)
        return ""
    finally:
        doc.close()

    return "\n".join(parts)


def _parse_pdf(file_bytes: bytes) -> str:
    """
    Extract text: native layer first, then OCR if the document looks like a scan.
    """
    native = _parse_pdf_native(file_bytes)
    stripped = native.strip()
    if len(stripped) >= _MIN_NATIVE_TEXT_FOR_OCR_SKIP:
        return native

    logger.info(
        "PDF text layer empty or very short (%d chars); trying OCR for scanned pages",
        len(stripped),
    )
    ocr_text = _parse_pdf_ocr(file_bytes)
    if ocr_text.strip():
        logger.info("OCR extracted %d characters", len(ocr_text.strip()))
        return ocr_text

    return native


def parse_document(file_bytes: bytes, file_type: str) -> str:
    """
    Parses PDF or plain text from bytes. Prefer extract_text_from_upload() for uploads.
    """
    logger.info(f"Parsing document of type {file_type}")
    try:
        ft = _normalize_mime(file_type) or file_type.lower()
        if ft in ("application/pdf", "application/x-pdf", "pdf") or _is_pdf_magic(file_bytes):
            return _parse_pdf(file_bytes)
        if ft.startswith("image/"):
            logger.warning("Image OCR not implemented; no text extracted from image.")
            return ""
        return file_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Failed to parse document: {e}")
        return ""


def extract_text_from_upload(
    file_bytes: bytes,
    content_type: str | None,
    filename: str | None,
) -> str:
    """
    Resolve text from an uploaded file using magic bytes, Content-Type, and filename.
    Fixes cases where the client sends application/octet-stream or wrong MIME for PDFs.
    """
    if not file_bytes:
        return ""

    name = (filename or "").lower()
    ct = _normalize_mime(content_type)

    if _is_pdf_magic(file_bytes):
        logger.info("Detected PDF via %PDF magic bytes")
        return _parse_pdf(file_bytes)

    if ct in ("application/pdf", "application/x-pdf") or name.endswith(".pdf"):
        return _parse_pdf(file_bytes)

    if ct == "application/octet-stream":
        if name.endswith(".pdf"):
            return _parse_pdf(file_bytes)
        if name.endswith((".txt", ".md", ".csv")):
            return file_bytes.decode("utf-8", errors="replace")
        if _is_pdf_magic(file_bytes):
            return _parse_pdf(file_bytes)
        logger.warning("application/octet-stream without clear extension; skipping binary decode")
        return ""

    if ct.startswith("image/"):
        logger.warning("Image upload: OCR not configured; no text extracted.")
        return ""

    if ct in ("text/plain", "text/markdown", "text/csv", "text/html") or name.endswith(
        (".txt", ".md", ".csv")
    ):
        return file_bytes.decode("utf-8", errors="replace")

    if len(file_bytes) < 500_000:
        try:
            decoded = file_bytes.decode("utf-8")
            if "\x00" not in decoded[:1000]:
                return decoded
        except UnicodeDecodeError:
            pass

    logger.warning(f"Could not map content_type={ct!r} filename={filename!r} to a parser")
    return ""


def clean_text(text: str) -> str:
    """Cleans structural artifacts from raw text."""
    if not text:
        return ""
    return text.strip().replace("\n\n", "\n")
