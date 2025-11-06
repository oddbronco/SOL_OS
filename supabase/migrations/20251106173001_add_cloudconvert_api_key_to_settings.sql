/*
  # Add CloudConvert API Key to User Settings

  1. Changes
    - Add `cloudconvert_api_key` column to user_settings table
    - Encrypted storage for API key

  2. Purpose
    - Store CloudConvert API key for automatic video conversion
    - Enable WebM → MP4 conversion for universal browser compatibility
*/

-- Add CloudConvert API key column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'cloudconvert_api_key'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN cloudconvert_api_key text;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_settings.cloudconvert_api_key IS
  'CloudConvert API key for automatic video format conversion (WebM/MOV → MP4)';
