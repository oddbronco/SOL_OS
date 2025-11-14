/*
  # Fix Anonymous Access to Projects and Stakeholders for Interviews

  This migration allows anonymous users to read project and stakeholder data
  when they have a valid interview session token. This is required for the
  interview page to load properly.

  ## Changes
  
  1. **Projects Table**
     - Add policy for anonymous users to read project details via interview sessions
  
  2. **Stakeholders Table**
     - Add policy for anonymous users to read stakeholder details via interview sessions
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view projects with interview sessions" ON projects;
DROP POLICY IF EXISTS "Anyone can view stakeholders with interview sessions" ON stakeholders;

-- Allow anonymous users to view projects that have active interview sessions
CREATE POLICY "Anyone can view projects with interview sessions"
ON projects FOR SELECT
TO anon
USING (
  id IN (
    SELECT DISTINCT project_id 
    FROM interview_sessions 
    WHERE status != 'cancelled'
  )
);

-- Allow anonymous users to view stakeholders that have active interview sessions
CREATE POLICY "Anyone can view stakeholders with interview sessions"
ON stakeholders FOR SELECT
TO anon
USING (
  id IN (
    SELECT DISTINCT stakeholder_id 
    FROM interview_sessions 
    WHERE status != 'cancelled'
  )
);