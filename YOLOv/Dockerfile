FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy YOLO application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/output_results

# Download YOLO model if not present (optional, since you have yolov8n.pt)
# RUN wget -O yolov8n.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt

# Create a non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 5001

# Create a simple Flask wrapper for YOLO services
RUN echo '#!/usr/bin/env python3\n\
from flask import Flask, request, jsonify\n\
import subprocess\n\
import os\n\
\n\
app = Flask(__name__)\n\
\n\
@app.route("/health")\n\
def health():\n\
    return {"status": "healthy"}\n\
\n\
@app.route("/analyze_class_diagram", methods=["POST"])\n\
def analyze_class_diagram():\n\
    try:\n\
        result = subprocess.run(["python", "classDiagramScript.py"], capture_output=True, text=True)\n\
        return {"status": "success", "output": result.stdout, "error": result.stderr}\n\
    except Exception as e:\n\
        return {"status": "error", "message": str(e)}, 500\n\
\n\
@app.route("/analyze_sequence_diagram", methods=["POST"])\n\
def analyze_sequence_diagram():\n\
    try:\n\
        result = subprocess.run(["python", "seqDiagramScript.py"], capture_output=True, text=True)\n\
        return {"status": "success", "output": result.stdout, "error": result.stderr}\n\
    except Exception as e:\n\
        return {"status": "error", "message": str(e)}, 500\n\
\n\
@app.route("/analyze_usecase_diagram", methods=["POST"])\n\
def analyze_usecase_diagram():\n\
    try:\n\
        result = subprocess.run(["python", "UseCaseDiagramScript.py"], capture_output=True, text=True)\n\
        return {"status": "success", "output": result.stdout, "error": result.stderr}\n\
    except Exception as e:\n\
        return {"status": "error", "message": str(e)}, 500\n\
\n\
if __name__ == "__main__":\n\
    app.run(host="0.0.0.0", port=5001, debug=False)\n\
' > yolo_service.py

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

CMD ["python", "yolo_service.py"] 