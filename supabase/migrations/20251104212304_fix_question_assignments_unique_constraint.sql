/*
  # Fix question assignments unique constraint for multiple interview sessions
  
  1. Problem
    - Current unique constraint on (stakeholder_id, question_id) prevents assigning 
      the same question to the same stakeholder in different interview sessions
    - This breaks the multiple interview sessions feature
  
  2. Changes
    - Drop the old unique constraint on (stakeholder_id, question_id)
    - Add new unique constraint on (stakeholder_id, question_id, interview_session_id)
    - This allows the same question to be assigned to different sessions
  
  3. Notes
    - Existing assignments with NULL interview_session_id will remain unique per stakeholder
    - New assignments with specific session IDs can now have duplicates across sessions
*/

-- Drop the old constraint
ALTER TABLE question_assignments 
DROP CONSTRAINT IF EXISTS question_assignments_stakeholder_id_question_id_key;

-- Add new constraint that includes interview_session_id
-- This allows the same question to be assigned to different interview sessions
ALTER TABLE question_assignments
ADD CONSTRAINT question_assignments_unique_per_session 
UNIQUE NULLS NOT DISTINCT (stakeholder_id, question_id, interview_session_id);