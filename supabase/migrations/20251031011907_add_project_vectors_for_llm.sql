/*
  # Add Project Vectors for LLM Sidekick
  
  1. New Tables
    - `project_vectors`
      - Stores embeddings for project-scoped LLM chat
      - Links to source (interview, upload, document)
      - Uses pgvector extension for similarity search
  
  2. Purpose
    - Enable project-scoped AI assistant
    - Vector search across all project content
    - Source attribution for responses
  
  3. Security
    - Enable RLS
    - Users can only query vectors for their projects
*/

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create project_vectors table
CREATE TABLE IF NOT EXISTS project_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'interview_response',
    'upload',
    'document',
    'transcript',
    'stakeholder_context',
    'project_description'
  )),
  source_id uuid, -- ID of the source record (nullable for project_description)
  chunk_text text NOT NULL,
  chunk_index integer DEFAULT 0,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  metadata jsonb DEFAULT '{}', -- {stakeholder_name, interview_name, question_text, file_name, etc.}
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_vectors ENABLE ROW LEVEL SECURITY;

-- Users can view vectors for their projects
CREATE POLICY "Users can view project vectors"
  ON project_vectors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_vectors.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create vectors for their projects
CREATE POLICY "Users can create project vectors"
  ON project_vectors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_vectors.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete vectors for their projects
CREATE POLICY "Users can delete project vectors"
  ON project_vectors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_vectors.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Master admins can view all vectors
CREATE POLICY "Master admins can view all vectors"
  ON project_vectors
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all vectors
CREATE POLICY "Master admins can manage all vectors"
  ON project_vectors
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_vectors_project ON project_vectors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vectors_source ON project_vectors(source_type, source_id);

-- Create vector similarity search index using ivfflat
-- This creates an approximate nearest neighbor index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_project_vectors_embedding 
  ON project_vectors 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create function for vector search within a project
CREATE OR REPLACE FUNCTION search_project_vectors(
  search_project_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    project_vectors.id,
    project_vectors.source_type,
    project_vectors.source_id,
    project_vectors.chunk_text,
    project_vectors.metadata,
    1 - (project_vectors.embedding <=> query_embedding) AS similarity
  FROM project_vectors
  WHERE project_vectors.project_id = search_project_id
    AND 1 - (project_vectors.embedding <=> query_embedding) > match_threshold
  ORDER BY project_vectors.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_project_vectors TO authenticated;