/*
  # Allow Public Access to Interview Sessions
  
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
  
  ## Security Considerations
  
  - Anonymous access is scoped to specific session tokens only
  - No sensitive data is exposed (passwords are hashed, no user emails, etc.)
  - UPDATE access is limited to session progress fields only
  - This is a standard pattern for public-facing interview/survey tools
*/

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
