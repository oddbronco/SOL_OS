/*
  # Database Functions and Triggers

  1. Helper Functions
    - User profile creation
    - Password generation
    - Access code validation
    - Notification creation
    - Storage cost calculation

  2. Triggers
    - Auto-create user profiles
    - Update timestamps
    - Progress tracking
    - Notification automation
*/

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to generate random interview password
CREATE OR REPLACE FUNCTION generate_interview_password()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 7));
END;
$$;

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_metadata jsonb;
BEGIN
  user_metadata := NEW.raw_user_meta_data;
  
  INSERT INTO public.users (
    id,
    email,
    full_name,
    company_name,
    role,
    is_master_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(user_metadata->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(user_metadata->>'company_name', 'Company'),
    CASE 
      WHEN (user_metadata->>'is_master_admin')::boolean = true THEN 'master_admin'
      ELSE 'customer_admin'
    END,
    COALESCE((user_metadata->>'is_master_admin')::boolean, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger on auth.users to create profile
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to validate and consume access codes
CREATE OR REPLACE FUNCTION validate_access_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record record;
  plan_record record;
  result jsonb;
BEGIN
  SELECT * INTO code_record
  FROM access_codes
  WHERE code = upper(code_input)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND current_uses < max_uses;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired access code'
    );
  END IF;

  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = code_record.plan_id;

  RETURN jsonb_build_object(
    'valid', true,
    'plan_id', code_record.plan_id,
    'plan_name', COALESCE(plan_record.plan_name, 'starter'),
    'plan_code', COALESCE(plan_record.plan_code, 'starter'),
    'max_projects', COALESCE(plan_record.max_projects, 3),
    'max_stakeholders', COALESCE(plan_record.max_stakeholders_per_project, 15)
  );
END;
$$;

-- Function to consume access code
CREATE OR REPLACE FUNCTION consume_access_code(code_input text, user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE access_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE code = upper(code_input)
    AND is_active = true
    AND current_uses < max_uses;

  RETURN FOUND;
END;
$$;

-- Function to set stakeholder interview password
CREATE OR REPLACE FUNCTION set_stakeholder_interview_password()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.interview_password IS NULL OR NEW.interview_password = '' THEN
    NEW.interview_password := generate_interview_password();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to set interview password for stakeholders
DROP TRIGGER IF EXISTS trigger_set_stakeholder_interview_password ON stakeholders;
CREATE TRIGGER trigger_set_stakeholder_interview_password
  BEFORE INSERT ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION set_stakeholder_interview_password();

-- Function to update interview session progress
CREATE OR REPLACE FUNCTION update_interview_session_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_id uuid;
  total_questions integer;
  answered_questions integer;
  completion_pct integer;
BEGIN
  session_id := COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  IF session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO total_questions
  FROM question_assignments
  WHERE interview_session_id = session_id;

  SELECT COUNT(*) INTO answered_questions
  FROM interview_responses ir
  JOIN question_assignments qa ON qa.question_id = ir.question_id
  WHERE qa.interview_session_id = session_id;

  completion_pct := CASE 
    WHEN total_questions > 0 THEN (answered_questions * 100 / total_questions)
    ELSE 0
  END;

  UPDATE interview_sessions
  SET answered_questions = answered_questions,
      completion_percentage = completion_pct,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update interview progress
DROP TRIGGER IF EXISTS update_interview_progress_trigger ON interview_responses;
CREATE TRIGGER update_interview_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON interview_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_session_progress();

-- Function to update total questions in interview session
CREATE OR REPLACE FUNCTION update_interview_total_questions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_id uuid;
  total_questions integer;
BEGIN
  session_id := COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  IF session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO total_questions
  FROM question_assignments
  WHERE interview_session_id = session_id;

  UPDATE interview_sessions
  SET total_questions = total_questions,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update total questions
DROP TRIGGER IF EXISTS update_total_questions_trigger ON question_assignments;
CREATE TRIGGER update_total_questions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON question_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_total_questions();

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON stakeholders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_requests_updated_at
  BEFORE UPDATE ON subscription_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON access_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_responses_updated_at
  BEFORE UPDATE ON interview_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_usage_updated_at
  BEFORE UPDATE ON storage_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_prompt_configs_updated_at
  BEFORE UPDATE ON agency_prompt_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
