/*
  # Add access_password column to interview_sessions

  This migration adds the missing access_password column that is used
  to protect interview sessions with an optional password.

  ## Changes
  
  1. **interview_sessions table**
     - Add access_password column (optional text field)
*/

-- Add access_password column to interview_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'access_password'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN access_password text;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN interview_sessions.access_password IS 'Optional password to protect interview access';