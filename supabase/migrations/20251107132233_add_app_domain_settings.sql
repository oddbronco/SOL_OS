/*
  # Add Application Domain Settings
  
  ## Overview
  Adds configuration for application domain(s) used for Mux playback restrictions.
  
  ## Changes
  
  1. New Columns in `user_settings`
     - `app_domains` - JSONB array of allowed domains for video playback
  
  2. Purpose
     - Stores domains that should be added to Mux playback restrictions
     - Used when configuring Mux signing keys to automatically set up CORS
     - Supports multiple domains (e.g., main domain, subdomains, staging)
*/

-- Add app domains field to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS app_domains jsonb DEFAULT '["interviews.solprojectos.com", "solprojectos.com"]'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN user_settings.app_domains IS 'Array of domains allowed for Mux video playback (for playback restrictions)';