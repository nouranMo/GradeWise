// Configuration file for the React app
// This works with both Docker environment variables and fallback values

const config = {
  // API URL for the backend server
  // In Docker, this will use the environment variable set in docker-compose.yml
  // For local development, it falls back to localhost
  API_URL: process.env.REACT_APP_API_URL || "http://localhost:8080",
  
  // Google OAuth Client ID
  // In Docker, this will use the environment variable from docker-compose.yml
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || "your-google-client-id-here",
  
  // Add other configuration values as needed
  // ANOTHER_CONFIG: process.env.REACT_APP_OTHER_CONFIG || "default-value",
};

// Log the configuration in development for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('App Configuration:', {
    API_URL: config.API_URL,
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV
  });
}

export default config; 