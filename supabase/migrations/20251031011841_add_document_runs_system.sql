/*
  # Add Document Runs & Iterations System
  
  1. New Tables
    - `document_runs`
      - Tracks each document generation run with full metadata
      - Links to templates, inputs, and generated files
    - `document_run_files`
      - Individual files generated in each run
  
  2. Purpose
    - Enable timestamped iteration tracking
    - Store what inputs were used for each generation
    - Support custom documents
    - Allow "Save As Template" workflow
  
  3. Security
    - Enable RLS
    - Users can manage runs for their projects
*/

-- Create document_runs table
CREATE TABLE IF NOT EXISTS document_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  run_label text, -- "Sprint0-Run", "Updated-With-Late-Responses"
  generated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  llm_model text DEFAULT 'gpt-4o',
  templates_used jsonb DEFAULT '[]', -- array of template IDs or names
  custom_document boolean DEFAULT false,
  custom_prompt text,
  custom_document_name text,
  stakeholders_used uuid[], -- array of stakeholder IDs
  interviews_used uuid[], -- array of interview_session IDs
  uploads_used uuid[], -- array of project_uploads IDs
  questions_used jsonb, -- {categories: [...]}
  notes text,
  folder_path text, -- "2025-11-03_1430_Sprint0-Run/"
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create document_run_files table
CREATE TABLE IF NOT EXISTS document_run_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_run_id uuid REFERENCES document_runs(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL, -- "sprint0_summary.md"
  file_path text NOT NULL, -- Supabase Storage path
  file_type text, -- markdown, docx, txt, pdf
  file_size integer,
  content text, -- For markdown/txt, store content directly
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on document_runs
ALTER TABLE document_runs ENABLE ROW LEVEL SECURITY;

-- Users can view runs for their projects
CREATE POLICY "Users can view project document runs"
  ON document_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = document_runs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create runs for their projects
CREATE POLICY "Users can create document runs"
  ON document_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = document_runs.project_id
      AND projects.user_id = auth.uid()
    )
    AND generated_by = auth.uid()
  );

-- Users can update runs for their projects
CREATE POLICY "Users can update document runs"
  ON document_runs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = document_runs.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = document_runs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete runs for their projects
CREATE POLICY "Users can delete document runs"
  ON document_runs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = document_runs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Master admins can view all runs
CREATE POLICY "Master admins can view all document runs"
  ON document_runs
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all runs
CREATE POLICY "Master admins can manage all document runs"
  ON document_runs
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Enable RLS on document_run_files
ALTER TABLE document_run_files ENABLE ROW LEVEL SECURITY;

-- Users can view run files for their projects
CREATE POLICY "Users can view document run files"
  ON document_run_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_runs
      JOIN projects ON projects.id = document_runs.project_id
      WHERE document_runs.id = document_run_files.document_run_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create run files
CREATE POLICY "Users can create document run files"
  ON document_run_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_runs
      JOIN projects ON projects.id = document_runs.project_id
      WHERE document_runs.id = document_run_files.document_run_id
      AND projects.user_id = auth.uid()
    )
  );

-- Master admins can view all run files
CREATE POLICY "Master admins can view all run files"
  ON document_run_files
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all run files
CREATE POLICY "Master admins can manage all run files"
  ON document_run_files
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_runs_project ON document_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_document_runs_generated_by ON document_runs(generated_by);
CREATE INDEX IF NOT EXISTS idx_document_runs_created_at ON document_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_run_files_run ON document_run_files(document_run_id);

-- Create function to generate folder path
CREATE OR REPLACE FUNCTION generate_document_run_folder_path(
  project_name text,
  run_label text
) RETURNS text AS $$
DECLARE
  timestamp_str text;
BEGIN
  timestamp_str := to_char(now(), 'YYYY-MM-DD_HH24MI');
  RETURN timestamp_str || '_' || regexp_replace(project_name, '[^a-zA-Z0-9]', '-', 'g') || '_' || COALESCE(run_label, 'Run');
END;
$$ LANGUAGE plpgsql;