// Environment configuration for ByteChat
// This file reads environment variables and provides them to the application

export const ENV_CONFIG = {
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',

  // Backend Configuration
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000',

  // Other environment variables can be added here
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const requiredVars = ['GOOGLE_CLIENT_ID'] as const;
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!ENV_CONFIG[varName]) {
      missing.push(`REACT_APP_${varName}`);
    }
  }

  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    // Don't throw error, just warn for now
    return false;
  }
  return true;
};

// Export individual config values for convenience
export const {
  GOOGLE_CLIENT_ID,
  BACKEND_URL,
  NODE_ENV
} = ENV_CONFIG;

export default ENV_CONFIG;