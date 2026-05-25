FROM python:3.9-slim

#build delle dipendenze
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8001
#forma shell per configurazione esterna della porta
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
