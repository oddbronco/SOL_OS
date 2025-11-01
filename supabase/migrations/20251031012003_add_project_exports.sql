/*
  # Add Project Exports System
  
  1. New Tables
    - `project_exports`
      - Tracks export history
      - Stores dual-ZIP exports
      - Enables re-import capability
  
  2. Purpose
    - Support "generate → export → delete" workflow
    - Full backup (JSON, perfect restore)
    - Human-readable (CSV/markdown)
    - Re-import functionality
  
  3. Security
    - Enable RLS
    - Users with export permission can create exports
    - Master admins can access all exports
*/

-- Create project_exports table
CREATE TABLE IF NOT EXISTS project_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_name text NOT NULL, -- Store name in case project is deleted
  exported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  export_type text NOT NULL CHECK (export_type IN ('full_backup', 'human_readable', 'dual')),
  file_path text NOT NULL, -- Supabase Storage path to ZIP
  file_size integer,
  manifest jsonb DEFAULT '{}', -- Export metadata {project_id, timestamp, schema_version, stakeholders_count, etc.}
  schema_version text DEFAULT '1.0',
  can_reimport boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_exports ENABLE ROW LEVEL SECURITY;

-- Users can view exports for their projects
CREATE POLICY "Users can view project exports"
  ON project_exports
  FOR SELECT
  TO authenticated
  USING (
    -- Project still exists and user owns it
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_exports.project_id
      AND projects.user_id = auth.uid()
    ))
    OR
    -- User created the export (even if project deleted)
    exported_by = auth.uid()
    OR
    -- User was assigned to project with export permission
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_assignments.project_id = project_exports.project_id
      AND project_assignments.user_id = auth.uid()
      AND project_assignments.can_export = true
    ))
  );

-- Users can create exports for their projects
CREATE POLICY "Users can create project exports"
  ON project_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- User owns the project
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_exports.project_id
        AND projects.user_id = auth.uid()
      )
      OR
      -- User has export permission
      EXISTS (
        SELECT 1 FROM project_assignments
        WHERE project_assignments.project_id = project_exports.project_id
        AND project_assignments.user_id = auth.uid()
        AND project_assignments.can_export = true
      )
    )
    AND exported_by = auth.uid()
  );

-- Users can delete their own exports
CREATE POLICY "Users can delete own exports"
  ON project_exports
  FOR DELETE
  TO authenticated
  USING (exported_by = auth.uid());

-- Master admins can view all exports
CREATE POLICY "Master admins can view all exports"
  ON project_exports
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all exports
CREATE POLICY "Master admins can manage all exports"
  ON project_exports
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_exports_project ON project_exports(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_exports_exported_by ON project_exports(exported_by);
CREATE INDEX IF NOT EXISTS idx_project_exports_created_at ON project_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_exports_type ON project_exports(export_type);

-- Create function to generate export manifest
CREATE OR REPLACE FUNCTION generate_export_manifest(
  export_project_id uuid
) RETURNS jsonb AS $$
DECLARE
  manifest jsonb;
  project_data record;
  stakeholder_count int;
  interview_count int;
  question_count int;
  upload_count int;
  document_count int;
BEGIN
  -- Get project data
  SELECT * INTO project_data
  FROM projects
  WHERE id = export_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', export_project_id;
  END IF;
  
  -- Count related records
  SELECT COUNT(*) INTO stakeholder_count FROM stakeholders WHERE project_id = export_project_id;
  SELECT COUNT(*) INTO interview_count FROM interview_sessions WHERE project_id = export_project_id;
  SELECT COUNT(*) INTO question_count FROM questions WHERE project_id = export_project_id;
  SELECT COUNT(*) INTO upload_count FROM project_uploads WHERE project_id = export_project_id;
  SELECT COUNT(*) INTO document_count FROM document_runs WHERE project_id = export_project_id;
  
  -- Build manifest
  manifest := jsonb_build_object(
    'export_timestamp', now(),
    'schema_version', '1.0',
    'project_id', export_project_id,
    'project_name', project_data.name,
    'project_status', project_data.status,
    'project_created_at', project_data.created_at,
    'counts', jsonb_build_object(
      'stakeholders', stakeholder_count,
      'interviews', interview_count,
      'questions', question_count,
      'uploads', upload_count,
      'document_runs', document_count
    )
  );
  
  RETURN manifest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_export_manifest TO authenticated;