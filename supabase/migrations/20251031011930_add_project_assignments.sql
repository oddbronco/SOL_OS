/*
  # Add Project Assignments for Team Permissions
  
  1. New Tables
    - `project_assignments`
      - Enables per-project team member assignment
      - Role-based permissions at project level
      - Export permission control
  
  2. Purpose
    - Assign specific users to specific projects
    - Control project-level permissions
    - Track who can export projects
  
  3. Security
    - Enable RLS
    - Project owners and admins can manage assignments
*/

-- Create project_assignments table
CREATE TABLE IF NOT EXISTS project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'analyst', 'viewer')),
  can_export boolean DEFAULT false,
  can_edit_stakeholders boolean DEFAULT true,
  can_generate_documents boolean DEFAULT true,
  can_view_responses boolean DEFAULT true,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for their projects
CREATE POLICY "Users can view project assignments"
  ON project_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- If user is project owner
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignments.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    -- Or if user is assigned to the project
    user_id = auth.uid()
  );

-- Project owners can create assignments
CREATE POLICY "Project owners can create assignments"
  ON project_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Project owners can update assignments
CREATE POLICY "Project owners can update assignments"
  ON project_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignments.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Project owners can delete assignments
CREATE POLICY "Project owners can delete assignments"
  ON project_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assignments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Master admins can view all assignments
CREATE POLICY "Master admins can view all assignments"
  ON project_assignments
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all assignments
CREATE POLICY "Master admins can manage all assignments"
  ON project_assignments
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_role ON project_assignments(role);

-- Create function to check if user has project access
CREATE OR REPLACE FUNCTION user_has_project_access(
  check_project_id uuid,
  check_user_id uuid DEFAULT auth.uid()
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    -- User is project owner
    SELECT 1 FROM projects
    WHERE projects.id = check_project_id
    AND projects.user_id = check_user_id
  ) OR EXISTS (
    -- User is assigned to project
    SELECT 1 FROM project_assignments
    WHERE project_assignments.project_id = check_project_id
    AND project_assignments.user_id = check_user_id
  ) OR EXISTS (
    -- User is master admin
    SELECT 1 FROM users
    WHERE users.id = check_user_id
    AND users.is_master_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_project_access TO authenticated;