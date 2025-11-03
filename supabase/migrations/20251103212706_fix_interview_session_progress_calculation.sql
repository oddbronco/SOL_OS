/*
  # Fix Interview Session Progress Calculation

  ## Problem
  The update_interview_session_progress() function has a variable name collision bug.
  Line: `SET answered_questions = answered_questions` sets the column to itself
  instead of to the calculated local variable.

  ## Solution
  Rename local variables to avoid collision with column names:
  - total_questions → total_count
  - answered_questions → answered_count

  ## Impact
  - Fixes completion percentage calculations
  - Fixes answered question counts in interview dashboard
  - Properly tracks interview progress
*/

CREATE OR REPLACE FUNCTION update_interview_session_progress()
RETURNS TRIGGER AS $$
DECLARE
  session_id uuid;
  total_count integer;
  answered_count integer;
  completion_pct integer;
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

  -- Count answered questions for this session
  SELECT COUNT(DISTINCT ir.question_id) INTO answered_count
  FROM interview_responses ir
  JOIN question_assignments qa ON qa.question_id = ir.question_id
  WHERE qa.interview_session_id = session_id
    AND ir.response_text IS NOT NULL
    AND ir.response_text != '';

  -- Calculate completion percentage
  completion_pct := CASE 
    WHEN total_count > 0 THEN (answered_count * 100 / total_count)
    ELSE 0
  END;

  -- Update the interview_sessions table with correct variable names
  UPDATE interview_sessions
  SET answered_questions = answered_count,
      completion_percentage = completion_pct,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_interview_progress_trigger ON interview_responses;
CREATE TRIGGER update_interview_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON interview_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_session_progress();

COMMENT ON FUNCTION update_interview_session_progress IS 'Updates interview session statistics when responses are added/modified. Fixed variable naming to avoid column collision.';