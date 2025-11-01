/*
  # Add Question Collections System
  
  1. New Tables
    - `question_collections`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Organization (references customers.id)
      - `created_by` (uuid, references users) - User who created it
      - `scope` (text) - 'org' (shared) or 'personal' (private)
      - `name` (text) - Collection name
      - `description` (text) - Description
      - `tags` (text[]) - Searchable tags
      - `questions` (jsonb) - Array of question objects
      - `version` (integer) - Version tracking
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can view org-wide collections from their org
    - Users can CRUD their personal collections
    - Master admins can view/manage all
*/

-- Create question_collections table
CREATE TABLE IF NOT EXISTS question_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('org', 'personal')),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  questions jsonb DEFAULT '[]',
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE question_collections ENABLE ROW LEVEL SECURITY;

-- Users can view org-wide collections from their org
CREATE POLICY "Users can view org collections"
  ON question_collections
  FOR SELECT
  TO authenticated
  USING (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.customer_id = question_collections.customer_id
    )
  );

-- Users can view their own personal collections
CREATE POLICY "Users can view own collections"
  ON question_collections
  FOR SELECT
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid());

-- Users can create collections
CREATE POLICY "Users can create collections"
  ON question_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own personal collections
CREATE POLICY "Users can update own collections"
  ON question_collections
  FOR UPDATE
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid())
  WITH CHECK (scope = 'personal' AND created_by = auth.uid());

-- Admins can update org-wide collections
CREATE POLICY "Admins can update org collections"
  ON question_collections
  FOR UPDATE
  TO authenticated
  USING (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = question_collections.customer_id
    )
  )
  WITH CHECK (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = question_collections.customer_id
    )
  );

-- Users can delete their own personal collections
CREATE POLICY "Users can delete own collections"
  ON question_collections
  FOR DELETE
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid());

-- Admins can delete org collections
CREATE POLICY "Admins can delete org collections"
  ON question_collections
  FOR DELETE
  TO authenticated
  USING (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = question_collections.customer_id
    )
  );

-- Master admins can view all collections
CREATE POLICY "Master admins can view all collections"
  ON question_collections
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all collections
CREATE POLICY "Master admins can manage all collections"
  ON question_collections
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_question_collections_customer ON question_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_question_collections_created_by ON question_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_question_collections_scope ON question_collections(scope);
CREATE INDEX IF NOT EXISTS idx_question_collections_tags ON question_collections USING gin(tags);