# AI Service — siap untuk Hugging Face Spaces (Docker) atau server biasa
FROM python:3.12-slim

RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user . .
# Lexicon tidak disimpan di git; unduh saat build agar preprocessing sama dengan saat training
RUN python scripts/download_lexicon.py

USER user
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
