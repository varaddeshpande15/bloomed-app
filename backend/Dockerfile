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

# Install Python dependencies (no more PyTorch/sentence-transformers)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
