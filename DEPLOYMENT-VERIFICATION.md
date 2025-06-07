# 🔍 Local Docker Deployment Configuration

## Your Application Structure - LOCAL DEVELOPMENT ✅

### **Frontend (React)**
- **Main File**: `React-App/src/App.js` ✅
- **Port**: 80 (served via Nginx)
- **Environment Variables**: 
  - `REACT_APP_API_URL=http://206.189.60.118:8080` ✅
  - `REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}` ✅

### **Backend (Spring Boot)**
- **Main File**: `Spring-App/src/main/java/com/example/demo/DemoApplication.java` ✅
- **Port**: 8080
- **Configuration**: `application.properties` (standard config) ✅
- **Features**:
  - MongoDB Atlas integration ✅
  - JWT authentication ✅
  - File upload handling ✅
  - CORS configured for localhost ✅

### **Flask Service (AI Analysis)**
- **Main File**: `Spring-App/src/main/java/com/example/demo/services/srs_analyzer/app.py` ✅
- **Port**: 5000
- **Environment**: Development mode ✅
- **Features**:
  - Document analysis ✅
  - YOLO integration ✅
  - Google OAuth ✅
  - OpenAI recommendations ✅
  - Plagiarism detection ✅

### **YOLO Service**
- **Location**: `YOLOv/` directory ✅
- **Port**: 5001
- **Features**: Computer vision analysis ✅

## Docker Configuration Summary

### Services:
1. **frontend** → React App (App.js) on port 80
2. **backend** → Spring Boot (DemoApplication.java) on port 8080  
3. **python-service** → Flask (app.py) on port 5000
4. **yolo-service** → YOLO analysis on port 5001

### Network Communication:
- React → Spring Boot: `http://localhost:8080`
- Spring Boot → Flask: `http://python-service:5000/analyze_document`
- Flask → YOLO: Internal volume mounts

## Required Environment Variables ✅

```bash
# Your actual values needed:
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret_here
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_CLIENT_ID=your_actual_google_client_id
OPENAI_API_KEY=your_actual_openai_api_key
```

## Access URLs After Deployment

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080
- **Flask Service**: http://localhost:5000
- **YOLO Service**: http://localhost:5001

## Deployment Commands

```bash
# 1. Copy environment template
cp environment.example .env

# 2. Edit with your API keys
nano .env

# 3. Deploy with Docker
chmod +x deploy.sh
./deploy.sh
```

## Ready for Local Development! 🚀

All configurations are set for localhost Docker development:
- ✅ React app with Google OAuth
- ✅ Spring Boot with MongoDB Atlas
- ✅ Flask app with comprehensive AI analysis
- ✅ YOLO integration for diagram analysis
- ✅ Proper Docker networking between all services
- ✅ Development environment setup 