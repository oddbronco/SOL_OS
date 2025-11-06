/*
  # Add Video Conversion Tracking

  1. Changes
    - Add `conversion_status` column to track conversion progress (pending, converting, completed, failed)
    - Add `conversion_started_at` timestamp for when conversion begins
    - Add `conversion_completed_at` timestamp for when conversion finishes
    - Add `conversion_error` text field for error messages
    - Add `original_format` to track source format (webm, mov, etc.)

  2. Purpose
    - Track automatic video conversion from WebM/MOV to MP4
    - Enable UI to show conversion progress
    - Store error information for debugging
*/

-- Add conversion tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_intro_videos' AND column_name = 'conversion_status'
  ) THEN
    ALTER TABLE project_intro_videos ADD COLUMN conversion_status text DEFAULT 'completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_intro_videos' AND column_name = 'conversion_started_at'
  ) THEN
    ALTER TABLE project_intro_videos ADD COLUMN conversion_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_intro_videos' AND column_name = 'conversion_completed_at'
  ) THEN
    ALTER TABLE project_intro_videos ADD COLUMN conversion_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_intro_videos' AND column_name = 'conversion_error'
  ) THEN
    ALTER TABLE project_intro_videos ADD COLUMN conversion_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_intro_videos' AND column_name = 'original_format'
  ) THEN
    ALTER TABLE project_intro_videos ADD COLUMN original_format text;
  END IF;
END $$;

-- Add index for querying videos pending conversion
CREATE INDEX IF NOT EXISTS idx_project_intro_videos_conversion_status
  ON project_intro_videos(conversion_status)
  WHERE conversion_status IN ('pending', 'converting');

-- Add comment explaining the status values
COMMENT ON COLUMN project_intro_videos.conversion_status IS
  'Video conversion status: pending (needs conversion), converting (in progress), completed (done), failed (error occurred)';
