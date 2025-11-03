/*
  # Fix update_interview_total_questions Function
  
  This migration fixes the ambiguous column reference error in the 
  update_interview_total_questions() function by using proper table prefixes.
  
  ## Changes
  
  - Drop and recreate the function with fixed SQL
  - Properly prefix table columns to avoid ambiguity
*/

-- Drop and recreate the function with fixed SQL
CREATE OR REPLACE FUNCTION update_interview_total_questions()
RETURNS TRIGGER AS $$
DECLARE
  session_id uuid;
  total_count integer;
BEGIN
  -- Get session_id based on operation type
  IF TG_OP = 'DELETE' THEN
    session_id := OLD.interview_session_id;
  ELSE
    session_id := NEW.interview_session_id;
  END IF;

  -- Skip if no session is associated
  IF session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total questions assigned to this session
  SELECT COUNT(*) INTO total_count
  FROM question_assignments
  WHERE interview_session_id = session_id;

  -- Update the interview_sessions table with new count
  UPDATE interview_sessions
  SET total_questions = total_count,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;