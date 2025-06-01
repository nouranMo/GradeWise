#!/bin/bash

# Digital Ocean Deployment Script for Automated Document Analysis Tool
# This script automates the deployment process on your droplet

set -e

echo "🚀 Starting deployment to Digital Ocean droplet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_warning "Please copy environment.example to .env and configure your variables"
    echo "cp environment.example .env"
    echo "nano .env"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$MONGODB_URI" ] || [ -z "$JWT_SECRET" ] || [ -z "$GEMINI_API_KEY" ] || [ -z "$DROPLET_IP" ]; then
    print_error "Missing required environment variables in .env file!"
    print_warning "Please ensure all variables in environment.example are set"
    exit 1
fi

print_status "Environment variables loaded successfully"

# Update REACT_APP_API_URL in docker-compose.yml
print_status "Updating API URL in docker-compose.yml..."
sed -i "s/your-droplet-ip/$DROPLET_IP/g" docker-compose.yml

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans || true

# Remove old images to force rebuild
print_status "Removing old Docker images..."
docker system prune -f

# Build and start services
print_status "Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check backend health
if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
    print_status "✅ Backend service is healthy"
else
    print_warning "⚠️ Backend service may not be ready yet"
fi

# Check frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    print_status "✅ Frontend service is healthy"
else
    print_warning "⚠️ Frontend service may not be ready yet"
fi

# Check Flask service
if curl -f http://localhost:5000 > /dev/null 2>&1; then
    print_status "✅ Flask service is healthy"
else
    print_warning "⚠️ Flask service may not be ready yet"
fi

# Check YOLO service
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    print_status "✅ YOLO service is healthy"
else
    print_warning "⚠️ YOLO service may not be ready yet"
fi

# Show running containers
print_status "Running containers:"
docker-compose ps

print_status "🎉 Deployment completed!"
echo ""
echo "Access your application:"
echo "🌐 Frontend: http://$DROPLET_IP"
echo "🔧 Backend API: http://$DROPLET_IP:8080"
echo "🐍 Flask Service: http://$DROPLET_IP:5000"
echo "🤖 YOLO Service: http://$DROPLET_IP:5001"
echo ""
echo "To view logs:"
echo "docker-compose logs -f [service-name]"
echo ""
echo "To restart services:"
echo "docker-compose restart" 