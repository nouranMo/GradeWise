#!/bin/bash

echo "🐍 Setting up Python dependencies globally for Document Analysis Tool"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Install system dependencies
print_status "Installing system dependencies..."
sudo apt update
sudo apt install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    python3-dev \
    python3-pip \
    gcc \
    g++

# Upgrade pip
print_status "Upgrading pip..."
pip3 install --upgrade pip

# Install Flask service dependencies
print_status "Installing Flask service dependencies..."
pip3 install -r Spring-App/src/main/java/com/example/demo/services/srs_analyzer/requirements.txt

# Install YOLO service dependencies
print_status "Installing YOLO service dependencies..."
pip3 install -r YOLOv/requirments.txt

# Download NLTK data
print_status "Downloading NLTK data..."
python3 -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('stopwords')" || true

print_status "✅ Global Python setup completed!"
echo ""
echo "To run your services manually:"
echo "1. Flask service: cd Spring-App/src/main/java/com/example/demo/services/srs_analyzer/ && python3 app.py"
echo "2. Spring Boot: cd Spring-App && ./mvnw spring-boot:run"  
echo "3. React frontend: cd React-App && npm start"
echo ""
print_warning "Note: You'll still need to set up your .env files and MongoDB connection" 