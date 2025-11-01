/*
  # Update Interview Sessions for Multiple Interviews per Stakeholder
  
  1. Changes to `interview_sessions` table
    - Add `interview_name` (text) - Name like "Marketing Discovery R1"
    - Add `interview_type` (text) - Type: kickoff, technical, followup, change_request
    - Add `intro_video_path` (text) - Path to personalized intro video
  
  2. Changes to `projects` table
    - Add `default_intro_video_path` (text) - Default intro for all interviews
  
  3. Notes
    - Existing sessions remain valid (new columns are nullable)
    - This enables 1 stakeholder → many interviews workflow
*/

-- Add columns to interview_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'interview_name'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN interview_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'interview_type'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN interview_type text CHECK (interview_type IN ('kickoff', 'technical', 'followup', 'change_request', 'post_project', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'intro_video_path'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN intro_video_path text;
  END IF;
END $$;

-- Add column to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'default_intro_video_path'
  ) THEN
    ALTER TABLE projects ADD COLUMN default_intro_video_path text;
  END IF;
END $$;

-- Update existing interview sessions with default names
UPDATE interview_sessions
SET interview_name = 'Interview #1'
WHERE interview_name IS NULL;

-- Create index for faster lookups by stakeholder
CREATE INDEX IF NOT EXISTS idx_interview_sessions_stakeholder ON interview_sessions(stakeholder_id);