/*
  # Add Document Templates System
  
  1. New Tables
    - `document_templates`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Organization that owns template
      - `created_by` (uuid, references users)
      - `scope` (text) - 'org', 'personal', 'client'
      - `name` (text) - Template name
      - `description` (text)
      - `required_inputs` (jsonb) - {needs_interviews, needs_uploads, min_stakeholders}
      - `prompt_template` (text) - LLM instruction with {{variables}}
      - `output_format` (text) - markdown, docx, txt, pdf
      - `example_output` (text) - Sample output
      - `version` (integer)
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can view org templates from their org
    - Users can CRUD their personal templates
    - Admins can manage org templates
*/

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  scope text NOT NULL CHECK (scope IN ('org', 'personal', 'client')),
  name text NOT NULL,
  description text,
  required_inputs jsonb DEFAULT '{"needs_interviews": true, "needs_uploads": false, "min_stakeholders": 1}'::jsonb,
  prompt_template text NOT NULL,
  output_format text NOT NULL CHECK (output_format IN ('markdown', 'docx', 'txt', 'pdf')) DEFAULT 'markdown',
  example_output text,
  category text, -- sprint0, proposal, technical_scope, etc.
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Users can view org templates from their org
CREATE POLICY "Users can view org templates"
  ON document_templates
  FOR SELECT
  TO authenticated
  USING (
    scope = 'org' AND is_active = true AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.customer_id = document_templates.customer_id
    )
  );

-- Users can view their own personal templates
CREATE POLICY "Users can view own templates"
  ON document_templates
  FOR SELECT
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid());

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON document_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own personal templates
CREATE POLICY "Users can update own templates"
  ON document_templates
  FOR UPDATE
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid())
  WITH CHECK (scope = 'personal' AND created_by = auth.uid());

-- Admins can update org templates
CREATE POLICY "Admins can update org templates"
  ON document_templates
  FOR UPDATE
  TO authenticated
  USING (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = document_templates.customer_id
    )
  )
  WITH CHECK (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = document_templates.customer_id
    )
  );

-- Users can delete their own personal templates
CREATE POLICY "Users can delete own templates"
  ON document_templates
  FOR DELETE
  TO authenticated
  USING (scope = 'personal' AND created_by = auth.uid());

-- Admins can delete org templates
CREATE POLICY "Admins can delete org templates"
  ON document_templates
  FOR DELETE
  TO authenticated
  USING (
    scope = 'org' AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('customer_admin', 'master_admin')
      AND users.customer_id = document_templates.customer_id
    )
  );

-- Master admins can view all templates
CREATE POLICY "Master admins can view all templates"
  ON document_templates
  FOR SELECT
  TO authenticated
  USING (is_master_admin());

-- Master admins can manage all templates
CREATE POLICY "Master admins can manage all templates"
  ON document_templates
  FOR ALL
  TO authenticated
  USING (is_master_admin())
  WITH CHECK (is_master_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_customer ON document_templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_scope ON document_templates(scope);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

-- Insert default templates
INSERT INTO document_templates (customer_id, scope, name, description, category, prompt_template, required_inputs)
SELECT 
  c.id,
  'org',
  'Sprint 0 Summary',
  'Comprehensive project foundation document covering stakeholder insights, objectives, and initial requirements',
  'sprint0',
  'Generate a comprehensive Sprint 0 Summary document based on the following project information and stakeholder responses. Include sections for: Executive Summary, Project Objectives, Stakeholder Insights, Key Requirements, Technical Considerations, Risks & Assumptions, and Next Steps.

Project: {{project_name}}
Description: {{project_description}}

Stakeholder Responses:
{{stakeholder_responses}}

Supplemental Documents:
{{uploads}}',
  '{"needs_interviews": true, "needs_uploads": false, "min_stakeholders": 2}'::jsonb
FROM customers c
ON CONFLICT DO NOTHING;