// Environment configuration
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://bfjyaloyehlwmtqtqnpt.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmanlhbG95ZWhsd210cXRxbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDU2MzMsImV4cCI6MjA3NzU4MTYzM30.mHAK3dOTVrka1_mUobNoxycqhLdlILJvkvxTdU9N7TQ',
  },
  domains: {
    landing: import.meta.env.VITE_LANDING_DOMAIN || 'solprojectos.com',
    app: import.meta.env.VITE_APP_DOMAIN || 'localhost:5173',
    admin: import.meta.env.VITE_ADMIN_DOMAIN || 'localhost:5173',
    respond: import.meta.env.VITE_RESPOND_DOMAIN || 'localhost:5173',
  },
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export const isAdminDomain = () => {
  return window.location.hostname === config.domains.admin ||
         (config.isDevelopment && window.location.hostname === 'localhost');
};

export const isAppDomain = () => {
  return window.location.hostname === config.domains.app ||
         (config.isDevelopment && window.location.port === '5173');
};

export const isRespondDomain = () => {
  return window.location.hostname === config.domains.respond ||
         (config.isDevelopment && window.location.port === '5173');
};