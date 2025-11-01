// Environment configuration
export const config = {
  supabase: {
    url: import.meta.env.VITE_BoltDB_URL,
    anonKey: import.meta.env.VITE_BoltDB_KEY,
  },
  domains: {
    landing: import.meta.env.VITE_LANDING_DOMAIN || 'withspeak.com',
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