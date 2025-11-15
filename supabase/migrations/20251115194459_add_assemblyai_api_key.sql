/*
  # Add AssemblyAI API Key Support

  1. Changes
    - Add `assemblyai_api_key` column to `user_settings` for large file transcription
    
  2. Purpose
    - Enable transcription of video/audio files larger than 25MB
    - OpenAI Whisper has 25MB limit, AssemblyAI supports any file size
    - Costs: $0.00025/second ($0.015/minute) - cheaper than Whisper for long files
*/

-- Add AssemblyAI API key column to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'assemblyai_api_key'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN assemblyai_api_key text;
  END IF;
END $$;

COMMENT ON COLUMN user_settings.assemblyai_api_key IS 'AssemblyAI API key for transcribing large video/audio files (>25MB)';
