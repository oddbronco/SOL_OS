/*
  # Remove CloudConvert and Add Mux Integration

  1. Changes to `user_settings` table
    - Remove `cloudconvert_api_key` column
    - Add `mux_token_id` (public token ID)
    - Add `mux_token_secret` (secret token)
  
  2. Changes to `project_intro_videos` table
    - Remove CloudConvert-related columns
    - Add Mux-related columns for asset tracking
  
  3. Notes
    - Mux handles all transcoding automatically
    - Videos get a playback_id for instant streaming
    - No manual conversion needed
*/

-- Remove CloudConvert API key from user_settings
ALTER TABLE user_settings 
DROP COLUMN IF EXISTS cloudconvert_api_key;

-- Add Mux credentials to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS mux_token_id text,
ADD COLUMN IF NOT EXISTS mux_token_secret text;

-- Update project_intro_videos for Mux
ALTER TABLE project_intro_videos
DROP COLUMN IF EXISTS conversion_status,
DROP COLUMN IF EXISTS conversion_started_at,
DROP COLUMN IF EXISTS conversion_completed_at,
DROP COLUMN IF EXISTS conversion_error,
DROP COLUMN IF EXISTS cloudconvert_job_id;

-- Add Mux-specific columns
ALTER TABLE project_intro_videos
ADD COLUMN IF NOT EXISTS mux_asset_id text,
ADD COLUMN IF NOT EXISTS mux_playback_id text,
ADD COLUMN IF NOT EXISTS mux_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_error text;

-- Create index for Mux asset lookups
CREATE INDEX IF NOT EXISTS idx_project_intro_videos_mux_asset 
ON project_intro_videos(mux_asset_id);

-- Comments
COMMENT ON COLUMN user_settings.mux_token_id IS 'Mux API Token ID for video processing';
COMMENT ON COLUMN user_settings.mux_token_secret IS 'Mux API Token Secret for video processing';
COMMENT ON COLUMN project_intro_videos.mux_asset_id IS 'Mux Asset ID after upload';
COMMENT ON COLUMN project_intro_videos.mux_playback_id IS 'Mux Playback ID for streaming';
COMMENT ON COLUMN project_intro_videos.mux_status IS 'Mux processing status: pending, ready, error';
