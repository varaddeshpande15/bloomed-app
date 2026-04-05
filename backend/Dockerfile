# ─── Stage 1: Build, install deps & pre-cache model ────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system build deps needed by some pip packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformers model into a known cache dir
# so zero download happens at runtime.
ENV SENTENCE_TRANSFORMERS_HOME=/app/model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('multi-qa-MiniLM-L6-cos-v1')"

# ─── Stage 2: Production image ─────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install runtime system deps: Tesseract OCR + image libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 && \
    rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
# Copy pre-downloaded model cache from builder
COPY --from=builder /app/model_cache /app/model_cache

# Set the model cache dir so sentence-transformers finds the pre-downloaded model
ENV SENTENCE_TRANSFORMERS_HOME=/app/model_cache

# Copy application code
COPY . .

# Render injects PORT env var; default to 10000 (Render's default)
ENV PORT=10000

EXPOSE ${PORT}

# Run gunicorn with uvicorn workers; bind to 0.0.0.0:$PORT
# Shell form so $PORT env var is expanded at runtime (Render injects it)
CMD gunicorn main:app \
    --bind "0.0.0.0:${PORT}" \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 1 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
