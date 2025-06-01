# 🚀 Digital Ocean Deployment Guide

## Automated Document Analysis Tool Deployment

This guide will help you deploy your multi-component application (React + Spring Boot + Python/Flask + YOLO) on a Digital Ocean droplet.

Your Flask application (`app.py`) includes comprehensive document analysis features:
- Document structure validation (SRS/SDD)
- Content analysis with similarity matrices
- Business value evaluation
- Plagiarism checking
- Reference validation
- Diagram convention analysis using YOLO
- Google OAuth authentication
- AI-powered recommendations

## 📋 Prerequisites

1. **Digital Ocean Droplet** (Recommended: 4GB RAM, 2 vCPUs, 80GB SSD)
2. **Domain name** (optional but recommended)
3. **MongoDB Atlas** account (already configured)
4. **Google Gemini API** key
5. **Google Client ID** (for OAuth)
6. **OpenAI API** key (for recommendations)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Spring Boot   │    │   MongoDB       │
│   (Frontend)    │────│   (Backend)     │────│   (Atlas)       │
│   Port: 80      │    │   Port: 8080    │    │   Cloud         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         └───────────────────────┼─────────────────────────────────┐
                                 │                                 │
                    ┌─────────────────┐              ┌─────────────────┐
                    │ Flask Service   │              │   YOLO Service  │
                    │ (app.py)        │              │   (CV Analysis) │
                    │ AI Analysis     │              │   Port: 5001    │
                    │ Port: 5000      │              │                 │
                    └─────────────────┘              └─────────────────┘
```

## 🛠️ Step 1: Initial Server Setup

### 1.1 Create Digital Ocean Droplet

1. Go to [Digital Ocean](https://cloud.digitalocean.com/)
2. Create a new droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic - 4GB RAM, 2 vCPUs ($24/month recommended)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or root password

### 1.2 Connect to Your Droplet

```bash
ssh root@your_droplet_ip
```

### 1.3 Run Initial Setup Script

```bash
# Download and run the server setup script
wget https://raw.githubusercontent.com/your-username/your-repo/main/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

**Or manually copy the `server-setup.sh` script and run it.**

### 1.4 Log out and log back in

This ensures Docker group changes take effect:

```bash
exit
ssh root@your_droplet_ip
```

## 🚀 Step 2: Deploy Your Application

### 2.1 Clone Your Repository

```bash
cd /opt/document-analysis-tool
git clone https://github.com/your-username/your-repo.git .
```

### 2.2 Configure Environment Variables

```bash
# Copy the environment template
cp environment.example .env

# Edit the environment file
nano .env
```

Configure these variables in `.env`:

```bash
# MongoDB Configuration (from your Atlas cluster)
MONGODB_URI=mongodb+srv://george:joujou123@cluster0.mz94k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret (generate a strong secret)
JWT_SECRET=YourSuperSecretKeyThatIsAtLeast512BitsLongAndSecureEnoughForHS512Algorithm1234567890

# Google Gemini API Key (for AI analysis)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Google Client ID (for OAuth authentication)
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here

# OpenAI API Key (for recommendations and additional AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Your droplet's public IP
DROPLET_IP=your_actual_droplet_ip_here
```

### 2.3 Make Deploy Script Executable

```bash
chmod +x deploy.sh
```

### 2.4 Run Deployment

```bash
./deploy.sh
```

This script will:
- Build all Docker containers
- Start all services
- Check health of each service
- Show you access URLs

## 🔍 Step 3: Verification

### 3.1 Check Running Services

```bash
docker-compose ps
```

You should see all services running:
- `frontend` (React app)
- `backend` (Spring Boot)
- `python-service` (Flask app.py)
- `yolo-service` (YOLO analysis)

### 3.2 Test Each Service

```bash
# Test frontend
curl http://localhost:80

# Test backend health
curl http://localhost:8080/actuator/health

# Test Flask service (your main app.py)
curl http://localhost:5000

# Test YOLO service
curl http://localhost:5001/health
```

### 3.3 Access Your Application

Open your browser and go to:
- **Frontend**: `http://your_droplet_ip`
- **API Documentation**: `http://your_droplet_ip:8080/actuator/health`

## 🔧 Step 4: Production Optimizations

### 4.1 Domain Setup (Optional)

If you have a domain name:

1. **Point your domain to the droplet IP**:
   - Create an A record: `yourdomain.com → your_droplet_ip`

2. **Update environment variables**:
   ```bash
   nano .env
   # Change DROPLET_IP=yourdomain.com
   ```

3. **Redeploy**:
   ```bash
   ./deploy.sh
   ```

### 4.2 SSL Certificate (Recommended)

Install Certbot for free SSL:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Stop nginx temporarily
docker-compose stop frontend

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx config to use SSL
# (You'll need to modify React-App/nginx.conf)
```

### 4.3 Monitoring Setup

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f python-service
docker-compose logs -f yolo-service

# Monitor resource usage
docker stats
```

## 🚨 Troubleshooting

### Common Issues

1. **Out of memory errors**:
   ```bash
   # Check memory usage
   free -h
   # Increase swap or upgrade droplet
   ```

2. **Container fails to start**:
   ```bash
   # Check logs
   docker-compose logs [service-name]
   
   # Rebuild specific service
   docker-compose up --build [service-name]
   ```

3. **MongoDB connection issues**:
   - Verify MongoDB URI in `.env`
   - Check MongoDB Atlas network access (allow all IPs or add droplet IP)

4. **Port conflicts**:
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :8080
   ```

### Service-Specific Debugging

```bash
# Backend (Spring Boot)
docker-compose exec backend cat /app/logs/application.log

# Python service (your Flask app.py)
docker-compose exec python-service python -c "import flask; print('Flask OK')"

# YOLO service
docker-compose exec yolo-service python -c "import torch; print('PyTorch OK')"
```

### Flask App Specific Issues

```bash
# Check if Flask app.py is running correctly
docker-compose exec python-service ls -la /app/srs_analyzer/

# Check Flask application logs
docker-compose logs python-service

# Test Flask app endpoints
curl http://localhost:5000/analyze_document
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./deploy.sh
```

### Backup Important Data

```bash
# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Export Docker volumes
docker run --rm -v document_uploads:/data -v $(pwd):/backup alpine tar czf /backup/docker_volumes_backup.tar.gz /data
```

### Scale Services

If you need more resources:

```bash
# Scale Python service to 2 instances
docker-compose up --scale python-service=2 -d
```

## 📊 Monitoring and Logs

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Specific service (your Flask app)
docker-compose logs -f python-service
```

### Monitor Performance

```bash
# Resource usage
docker stats

# Disk usage
df -h
du -sh uploads/
```

## 🔐 Security Considerations

1. **Firewall**: UFW is configured automatically
2. **Secrets**: Store sensitive data in `.env` file (not in code)
3. **MongoDB**: Use MongoDB Atlas with proper access controls
4. **API Keys**: Secure your Gemini, Google, and OpenAI API keys
5. **Updates**: Regularly update system packages
6. **Backup**: Regular backups of uploads and database

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Check system resources: `free -h && df -h`
4. Review this guide for common solutions

## 🎉 Success!

Your automated document analysis tool should now be running on:
- **Frontend**: `http://your_droplet_ip`
- **Backend API**: `http://your_droplet_ip:8080`

The application includes:
- ✅ React frontend with modern UI
- ✅ Spring Boot backend with JWT authentication
- ✅ MongoDB integration
- ✅ Python Flask AI analysis service (app.py)
- ✅ YOLO computer vision service
- ✅ File upload and processing
- ✅ Real-time analysis results
- ✅ Google OAuth authentication
- ✅ Comprehensive document analysis features 