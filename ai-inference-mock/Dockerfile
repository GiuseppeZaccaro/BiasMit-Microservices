# Usa un'immagine Python leggera come base
FROM python:3.9-slim

# Installiamo le dipendenze di sistema necessarie per gestire file binari (come Arrow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Imposta la cartella di lavoro all'interno del container
WORKDIR /app

# Copia il file dei requisiti e installa le librerie Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# config_manager.py and models.yaml are injected at runtime via docker-compose volume mounts
# from ./shared/ — do not bake them into the image.
COPY main.py .

# Esponi la porta 8000 (quella usata da FastAPI)
EXPOSE 8000

# Comando per avviare il server uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]