/*
  # Add Project Uploads System (Supplemental Documents)
  
  1. New Tables
    - `project_uploads`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `upload_type` (text) - kickoff_transcript, supplemental_doc, rfp, org_chart, asset, notes
      - `file_name` (text) - Original file name
      - `file_path` (text) - Supabase Storage path
      - `file_size` (integer) - File size in bytes
      - `mime_type` (text) - File MIME type
      - `uploaded_by` (uuid, references users)
      - `meeting_date` (date) - Optional meeting date
      - `include_in_generation` (boolean) - Include in document generation
      - `description` (text) - User description
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can manage uploads for their projects
    - Master admins can view/manage all uploads
*/

-- Create project_uploads table
CREATE TABLE IF NOT EXISTS project_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  upload_type text NOT NULL CHECK (upload_type IN (
    'kickoff_transcript',
    'supplemental_doc',
    'rfp',
    'org_chart',
    'asset',
    'notes',
    'recording',
    'image',
    'other'
  )),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  meeting_date date,
  include_in_generation boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view uploads for their projects
CREATE POLICY "Users can view project uploads"
  ON project_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_uploads.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create uploads for their projects
CREATE POLICY "Users can create project uploads"
  ON project_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_uploads.project_id
      AND projects.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Users can update uploads for their projects
CREATE POLICY "Users can update project uploads"
  ON project_uploads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_uploads.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_uploads.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete uploads for their projects
CREATE POLICY "Users can delete project uploads"
  ON project_uploads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_uploads.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Master admins can view all uploads
CREATE POLICY "Master admins can view all uploads"
  ON project_uploads
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all uploads
CREATE POLICY "Master admins can manage all uploads"
  ON project_uploads
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_uploads_project ON project_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_project_uploads_uploaded_by ON project_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_uploads_type ON project_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_project_uploads_include ON project_uploads(include_in_generation) WHERE include_in_generation = true;