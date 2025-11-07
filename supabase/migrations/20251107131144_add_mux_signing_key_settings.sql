/*
  # Add Mux Signing Key Settings
  
  ## Overview
  Adds Mux signing key configuration fields to enable secure, signed playback URLs.
  
  ## Changes
  
  1. New Columns in `user_settings`
     - `mux_signing_key_id` - Mux signing key ID (public identifier)
     - `mux_signing_key_private` - Mux signing key private key (base64 encoded RSA key)
  
  2. Security
     - Fields are encrypted at rest (Supabase handles this)
     - Only accessible via RLS policies to authorized users
  
  ## Purpose
  These keys are used to generate JSON Web Tokens (JWT) for secure video playback,
  preventing unauthorized access and enabling CORS restrictions.
*/

-- Add Mux signing key fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS mux_signing_key_id text,
ADD COLUMN IF NOT EXISTS mux_signing_key_private text;

-- Add comments explaining the fields
COMMENT ON COLUMN user_settings.mux_signing_key_id IS 'Mux Signing Key ID for generating secure playback tokens';
COMMENT ON COLUMN user_settings.mux_signing_key_private IS 'Mux Signing Key Private Key (base64 encoded) for JWT generation';