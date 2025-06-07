# 🐍 Flask App Setup Guide

## Your Current Flask App Structure

Your Flask application is located in:
```
Spring-App/src/main/java/com/example/demo/services/srs_analyzer/
├── app.py (main Flask application)
├── config.py (configuration)
├── requirements.txt (your actual dependencies)
├── .env (contains OPENAI_API_KEY)
└── [other Python modules]
```

## Environment Variables Setup

### 1. Your existing `.env` file in `srs_analyzer/` directory:
```bash
# srs_analyzer/.env (you already have this)
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Create root `.env` file for Docker:
```bash
# Root .env file (create this at project root)
cp environment.example .env
```

Then edit the root `.env` file:
```bash
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_actual_gemini_api_key  
GOOGLE_CLIENT_ID=your_actual_google_client_id
OPENAI_API_KEY=your_actual_openai_api_key
```

## How the Setup Works

1. **Docker reads** environment variables from the **root `.env`** file
2. **Flask app reads** OPENAI_API_KEY from its **local `srs_analyzer/.env`** file  
3. **Other API keys** (Gemini, Google Client ID) are passed via Docker environment variables
4. **Flask app** uses the hardcoded Gemini API key in `config.py` (you can update this)

## Quick Deployment Commands

```bash
# 1. Create root environment file
cp environment.example .env
nano .env  # Add your API keys

# 2. Make sure your srs_analyzer/.env has OPENAI_API_KEY
nano Spring-App/src/main/java/com/example/demo/services/srs_analyzer/.env

# 3. Deploy
chmod +x deploy.sh
./deploy.sh
```

## Your Flask App Features ✅

- ✅ Document analysis (SRS/SDD validation)
- ✅ Content analysis with similarity matrices  
- ✅ Business value evaluation
- ✅ Plagiarism detection
- ✅ Reference validation
- ✅ YOLO integration for diagram analysis
- ✅ Google OAuth authentication
- ✅ OpenAI recommendations
- ✅ Rate limiting
- ✅ Image processing

## Access After Deployment

- **Flask App**: http://localhost:5000
- **Frontend**: http://localhost  
- **Backend**: http://localhost:8080
- **YOLO Service**: http://localhost:5001

## Notes

- Your Flask app will use its existing configuration
- Docker handles the networking between services
- Upload files will be shared between services
- Logs will be generated in the `srs_analyzer/logs/` directory 