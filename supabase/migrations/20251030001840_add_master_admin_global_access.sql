/*
  # Add Master Admin Global Access Policies

  ## Overview
  This migration adds RLS policies that allow master admins (platform owners) to see ALL data
  across all users, clients, projects, and related entities. Previously, master admins could
  only see data they created themselves.

  ## Changes
  
  ### New Policies for Master Admins:
  - **clients**: Master admins can view and manage all clients
  - **projects**: Master admins can view and manage all projects  
  - **stakeholders**: Master admins can view and manage all stakeholders
  - **questions**: Master admins can view and manage all questions
  - **documents**: Master admins can view and manage all documents
  - **customers**: Master admins can view and manage all customers
  - **interview_sessions**: Master admins can view all interview sessions
  - **question_assignments**: Master admins can view all question assignments
  - **interview_responses**: Master admins can view all responses
  - **interview_materials**: Master admins can view all materials

  ## Security
  Master admin status is checked via the database `users.is_master_admin` column.
  This ensures real-time permission updates when admin status changes.
*/

-- Function to check if user is master admin from database
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_master_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clients: Master admins can see all clients
CREATE POLICY "Master admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all clients"
  ON clients FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Projects: Master admins can see all projects
CREATE POLICY "Master admins can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all projects"
  ON projects FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Stakeholders: Master admins can see all stakeholders
CREATE POLICY "Master admins can view all stakeholders"
  ON stakeholders FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all stakeholders"
  ON stakeholders FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Questions: Master admins can see all questions
CREATE POLICY "Master admins can view all questions"
  ON questions FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all questions"
  ON questions FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Documents: Master admins can see all documents
CREATE POLICY "Master admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all documents"
  ON documents FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Customers: Master admins can see all customers
CREATE POLICY "Master admins can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all customers"
  ON customers FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Interview Sessions: Master admins can see all sessions
CREATE POLICY "Master admins can view all interview sessions"
  ON interview_sessions FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all interview sessions"
  ON interview_sessions FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Question Assignments: Master admins can see all assignments
CREATE POLICY "Master admins can view all question assignments"
  ON question_assignments FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all question assignments"
  ON question_assignments FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Interview Responses: Master admins can see all responses
CREATE POLICY "Master admins can view all interview responses"
  ON interview_responses FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all interview responses"
  ON interview_responses FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Interview Materials: Master admins can see all materials
CREATE POLICY "Master admins can view all interview materials"
  ON interview_materials FOR SELECT
  TO authenticated
  USING (is_master_admin());

CREATE POLICY "Master admins can manage all interview materials"
  ON interview_materials FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Notifications: Master admins can see all notifications
CREATE POLICY "Master admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- File Storage: Master admins can see all files
CREATE POLICY "Master admins can view all file storage"
  ON file_storage FOR SELECT
  TO authenticated
  USING (is_master_admin());