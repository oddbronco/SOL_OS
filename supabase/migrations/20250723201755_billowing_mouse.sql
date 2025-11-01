/*
  # Add subscription management and file storage

  1. New Tables
    - `subscription_plans` - Admin-defined plans with custom limits
    - `subscription_requests` - Upgrade/cancellation requests
    - `file_storage` - Track all uploaded files
    - `transcriptions` - Store AI transcriptions

  2. Updates
    - Add file storage tracking to responses
    - Add transcription support
    - Add custom plan limits

  3. Security
    - Enable RLS on all new tables
    - Add policies for admin and user access
*/

-- Subscription Plans (Admin-controlled)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  plan_code text UNIQUE NOT NULL,
  max_projects integer NOT NULL DEFAULT 3,
  max_stakeholders_per_project integer NOT NULL DEFAULT 15,
  max_questions_per_project integer NOT NULL DEFAULT 50,
  max_file_size_mb integer NOT NULL DEFAULT 100,
  max_recording_minutes integer NOT NULL DEFAULT 5,
  features jsonb DEFAULT '{}',
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscription Requests (Upgrades/Cancellations)
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('upgrade', 'downgrade', 'cancel')),
  current_plan text,
  requested_plan text,
  reason text,
  contact_phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- File Storage Tracking
CREATE TABLE IF NOT EXISTS file_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid REFERENCES stakeholders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  storage_bucket text DEFAULT 'interview-files',
  purpose text CHECK (purpose IN ('response', 'material', 'transcript', 'document')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Transcriptions
CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_storage_id uuid NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
  response_id uuid REFERENCES interview_responses(id) ON DELETE CASCADE,
  original_file_url text NOT NULL,
  transcription_text text NOT NULL,
  confidence_score numeric(3,2),
  language text DEFAULT 'en',
  duration_seconds integer,
  word_count integer,
  ai_summary text,
  processing_status text DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Update interview_responses to include file storage references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_responses' AND column_name = 'file_storage_id'
  ) THEN
    ALTER TABLE interview_responses ADD COLUMN file_storage_id uuid REFERENCES file_storage(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_responses' AND column_name = 'transcription_id'
  ) THEN
    ALTER TABLE interview_responses ADD COLUMN transcription_id uuid REFERENCES transcriptions(id);
  END IF;
END $$;

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, plan_code, max_projects, max_stakeholders_per_project, max_questions_per_project, max_file_size_mb, max_recording_minutes, price_monthly, price_yearly, features) VALUES
('Starter', 'starter', 3, 15, 50, 100, 5, 0, 0, '{"ai_features": false, "custom_branding": false, "priority_support": false}'),
('Professional', 'pro', 15, 50, 200, 500, 10, 49, 490, '{"ai_features": true, "custom_branding": true, "priority_support": true, "advanced_analytics": true}'),
('Enterprise', 'enterprise', 100, 200, 1000, 2000, 30, 199, 1990, '{"ai_features": true, "custom_branding": true, "priority_support": true, "advanced_analytics": true, "white_label": true, "api_access": true}')
ON CONFLICT (plan_code) DO UPDATE SET
  max_projects = EXCLUDED.max_projects,
  max_stakeholders_per_project = EXCLUDED.max_stakeholders_per_project,
  max_questions_per_project = EXCLUDED.max_questions_per_project,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  max_recording_minutes = EXCLUDED.max_recording_minutes,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  updated_at = now();

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Master admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- RLS Policies for subscription_requests
CREATE POLICY "Users can manage own subscription requests"
  ON subscription_requests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can manage all subscription requests"
  ON subscription_requests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- RLS Policies for file_storage
CREATE POLICY "Users can manage own files"
  ON file_storage
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can read all files"
  ON file_storage
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- RLS Policies for transcriptions
CREATE POLICY "Users can manage transcriptions for own files"
  ON transcriptions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM file_storage 
    WHERE file_storage.id = transcriptions.file_storage_id 
    AND file_storage.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM file_storage 
    WHERE file_storage.id = transcriptions.file_storage_id 
    AND file_storage.user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_requests_updated_at
  BEFORE UPDATE ON subscription_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS trigger AS $$
DECLARE
  user_plan_limits record;
  current_usage record;
BEGIN
  -- Get user's current plan limits
  SELECT sp.* INTO user_plan_limits
  FROM users u
  JOIN agencies a ON a.owner_id = u.id
  JOIN subscription_plans sp ON sp.plan_code = a.subscription_plan
  WHERE u.id = auth.uid();

  -- Check project limits
  IF TG_TABLE_NAME = 'projects' THEN
    SELECT COUNT(*) as project_count INTO current_usage
    FROM projects 
    WHERE user_id = auth.uid();
    
    IF current_usage.project_count >= user_plan_limits.max_projects THEN
      RAISE EXCEPTION 'Project limit exceeded. Upgrade your plan to create more projects.';
    END IF;
  END IF;

  -- Check stakeholder limits per project
  IF TG_TABLE_NAME = 'stakeholders' THEN
    SELECT COUNT(*) as stakeholder_count INTO current_usage
    FROM stakeholders 
    WHERE project_id = NEW.project_id;
    
    IF current_usage.stakeholder_count >= user_plan_limits.max_stakeholders_per_project THEN
      RAISE EXCEPTION 'Stakeholder limit exceeded for this project. Upgrade your plan to add more stakeholders.';
    END IF;
  END IF;

  -- Check question limits per project
  IF TG_TABLE_NAME = 'questions' THEN
    SELECT COUNT(*) as question_count INTO current_usage
    FROM questions 
    WHERE project_id = NEW.project_id;
    
    IF current_usage.question_count >= user_plan_limits.max_questions_per_project THEN
      RAISE EXCEPTION 'Question limit exceeded for this project. Upgrade your plan to add more questions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply subscription limit triggers
CREATE TRIGGER check_project_limits
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION check_subscription_limits();

CREATE TRIGGER check_stakeholder_limits
  BEFORE INSERT ON stakeholders
  FOR EACH ROW EXECUTE FUNCTION check_subscription_limits();

CREATE TRIGGER check_question_limits
  BEFORE INSERT ON questions
  FOR EACH ROW EXECUTE FUNCTION check_subscription_limits();