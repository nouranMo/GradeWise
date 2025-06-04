// Configuration file for the React app
// This replaces environment variables for more reliable deployment

const config = {
  // API URL for the backend server
  // Change this based on your deployment environment
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  
  // Google OAuth Client ID
  // Replace 'your-google-client-id-here' with your actual Google Client ID
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || "your-google-client-id-here",
  
  // Add other configuration values as needed
  // ANOTHER_CONFIG: "value",
};

// For Docker deployments, you can override these values by setting them here directly:
// Uncomment and modify the lines below for production deployment
/*
config.API_URL = "https://your-production-api.com";
config.GOOGLE_CLIENT_ID = "your-actual-google-client-id";
*/

export default config; 