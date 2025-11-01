/*
  # Interview Management System

  1. New Tables
    - `interview_sessions` - Individual interview sessions for stakeholders
    - `question_assignments` - Questions assigned to specific stakeholders
    - `interview_responses` - Stakeholder responses to questions
    - `interview_materials` - Uploaded materials/attachments

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own project data

  3. Features
    - Track interview progress per stakeholder
    - Assign custom questions to specific stakeholders
    - Store responses with multiple formats (text, audio, video)
    - Upload supporting materials
    - Calculate completion percentages
*/

-- Interview Sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL DEFAULT ('INT_' || upper(substring(gen_random_uuid()::text, 1, 12))),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  total_questions integer DEFAULT 0,
  answered_questions integer DEFAULT 0,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Question Assignments table
CREATE TABLE IF NOT EXISTS question_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  order_index integer DEFAULT 0,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(stakeholder_id, question_id)
);

-- Interview Responses table
CREATE TABLE IF NOT EXISTS interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_assignment_id uuid REFERENCES question_assignments(id) ON DELETE CASCADE,
  response_type text NOT NULL DEFAULT 'text' CHECK (response_type IN ('text', 'audio', 'video', 'file')),
  response_text text,
  file_url text,
  file_name text,
  file_size integer,
  duration_seconds integer,
  transcription text,
  ai_summary text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score decimal(3,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(stakeholder_id, question_id)
);

-- Interview Materials table
CREATE TABLE IF NOT EXISTS interview_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  material_type text NOT NULL DEFAULT 'document' CHECK (material_type IN ('document', 'image', 'audio', 'video', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  description text,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_project_id ON interview_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_stakeholder_id ON interview_sessions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_token ON interview_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_question_assignments_project_id ON question_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_question_assignments_stakeholder_id ON question_assignments(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_question_assignments_question_id ON question_assignments(question_id);

CREATE INDEX IF NOT EXISTS idx_interview_responses_project_id ON interview_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_stakeholder_id ON interview_responses(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_question_id ON interview_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_interview_materials_project_id ON interview_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_materials_stakeholder_id ON interview_materials(stakeholder_id);

-- Enable RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_sessions
CREATE POLICY "Users can manage interview sessions in own projects"
  ON interview_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = interview_sessions.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for question_assignments
CREATE POLICY "Users can manage question assignments in own projects"
  ON question_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = question_assignments.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for interview_responses
CREATE POLICY "Users can manage interview responses in own projects"
  ON interview_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = interview_responses.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for interview_materials
CREATE POLICY "Users can manage interview materials in own projects"
  ON interview_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = interview_materials.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update interview session progress
CREATE OR REPLACE FUNCTION update_interview_session_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the interview session progress when responses are added/updated/deleted
  UPDATE interview_sessions 
  SET 
    answered_questions = (
      SELECT COUNT(*) 
      FROM interview_responses 
      WHERE interview_session_id = COALESCE(NEW.interview_session_id, OLD.interview_session_id)
    ),
    completion_percentage = LEAST(100, ROUND(
      (SELECT COUNT(*) FROM interview_responses WHERE interview_session_id = COALESCE(NEW.interview_session_id, OLD.interview_session_id)) * 100.0 / 
      GREATEST(1, (SELECT total_questions FROM interview_sessions WHERE id = COALESCE(NEW.interview_session_id, OLD.interview_session_id)))
    )),
    updated_at = now()
  WHERE id = COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update progress
CREATE TRIGGER update_interview_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON interview_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_session_progress();

-- Function to update total questions count
CREATE OR REPLACE FUNCTION update_interview_total_questions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total questions when assignments are added/removed
  UPDATE interview_sessions 
  SET 
    total_questions = (
      SELECT COUNT(*) 
      FROM question_assignments 
      WHERE interview_session_id = COALESCE(NEW.interview_session_id, OLD.interview_session_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update total questions
CREATE TRIGGER update_total_questions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON question_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_total_questions();