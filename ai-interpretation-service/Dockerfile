#immagine dell'hub come gli altri servizi
FROM python:3.9-slim

#crea cartella nel container e si sposta dentro
#i comandi successivi vengono eseguiti in questa cartella
WORKDIR /app

#stesso pattern dell'altro docker file per la gestione della cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# config_manager.py and models.yaml injected at runtime via docker-compose volume mounts
#COPY serve a inserire i file permanentemente nell'immagine Docker
COPY main.py .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
