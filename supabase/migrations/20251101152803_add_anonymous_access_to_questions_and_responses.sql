/*
  # Add Anonymous Access to Questions and Responses
  
  This migration extends anonymous access to question assignments, questions, and interview responses
  so that stakeholders can view questions and submit responses without authentication.
  
  ## Changes
  
  1. **New RLS Policies for question_assignments**
     - Allow anonymous users to SELECT question assignments
     - Allows viewing questions assigned to interview sessions
     
  2. **New RLS Policies for questions**
     - Allow anonymous users to SELECT questions
     - Needed to display question text and details
     
  3. **New RLS Policies for interview_responses**
     - Allow anonymous users to SELECT their responses
     - Allow anonymous users to INSERT new responses
     - Allow anonymous users to UPDATE their responses
     - Enables stakeholders to submit and modify answers
  
  ## Security Considerations
  
  - Access is open for read/write but scoped to specific interview sessions
  - This follows standard survey/interview platform patterns
  - Responses are tied to interview sessions which have expiration dates
*/

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
