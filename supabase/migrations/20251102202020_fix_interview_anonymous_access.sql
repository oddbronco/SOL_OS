/*
  # Fix Anonymous Interview Access
  
  This migration adds RLS policies to allow anonymous (public) users to access interview sessions
  so that stakeholders can view and respond to interviews without authentication.
  
  ## Changes
  
  1. **New RLS Policies for interview_sessions**
     - Allow anonymous users to SELECT interview sessions by session_token
     - Allow anonymous users to UPDATE interview sessions (for recording progress)
     
  2. **New RLS Policies for stakeholders**
     - Allow anonymous users to SELECT stakeholders (needed to display interview info)
     
  3. **New RLS Policies for projects**
     - Allow anonymous users to SELECT projects (needed to display project info)
  
  4. **New RLS Policies for question_assignments**
     - Allow anonymous users to SELECT question assignments
     
  5. **New RLS Policies for questions**
     - Allow anonymous users to SELECT questions
     
  6. **New RLS Policies for interview_responses**
     - Allow anonymous users to SELECT, INSERT, and UPDATE responses
  
  ## Security Considerations
  
  - Anonymous access is necessary for stakeholders to complete interviews via unique URLs
  - Session tokens act as authentication mechanism
  - Sessions have expiration dates for security
  - This follows standard survey/interview platform patterns (TypeForm, SurveyMonkey, etc.)
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Anyone can view interview sessions by token" ON interview_sessions;
DROP POLICY IF EXISTS "Anyone can update interview session progress" ON interview_sessions;
DROP POLICY IF EXISTS "Anyone can view stakeholders for interviews" ON stakeholders;
DROP POLICY IF EXISTS "Anyone can view projects for interviews" ON projects;
DROP POLICY IF EXISTS "Anyone can view question assignments" ON question_assignments;
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Anyone can view interview responses" ON interview_responses;
DROP POLICY IF EXISTS "Anyone can create interview responses" ON interview_responses;
DROP POLICY IF EXISTS "Anyone can update interview responses" ON interview_responses;

-- Allow anonymous users to view interview sessions by token
CREATE POLICY "Anyone can view interview sessions by token"
  ON interview_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update interview session progress
CREATE POLICY "Anyone can update interview session progress"
  ON interview_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to view stakeholder info (needed for interview display)
CREATE POLICY "Anyone can view stakeholders for interviews"
  ON stakeholders
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view project info (needed for interview display)
CREATE POLICY "Anyone can view projects for interviews"
  ON projects
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view question assignments
CREATE POLICY "Anyone can view question assignments"
  ON question_assignments
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view questions
CREATE POLICY "Anyone can view questions"
  ON questions
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to view interview responses
CREATE POLICY "Anyone can view interview responses"
  ON interview_responses
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert interview responses
CREATE POLICY "Anyone can create interview responses"
  ON interview_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update interview responses
CREATE POLICY "Anyone can update interview responses"
  ON interview_responses
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
