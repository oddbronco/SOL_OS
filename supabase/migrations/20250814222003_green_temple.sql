/*
  # Create user profile function and trigger

  1. Database Functions
    - `create_user_profile()` - Automatically creates user profile when auth user is created
    - `generate_interview_password()` - Generates random 7-character passwords for stakeholders

  2. Triggers
    - Trigger on auth.users insert to create profile in public.users table

  3. Security
    - Function runs with security definer privileges
    - Proper error handling for duplicate entries
*/

-- Function to generate random interview passwords
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
  -- Get user metadata
  user_metadata := NEW.raw_user_meta_data;
  
  -- Insert into public.users table
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
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users
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
  -- Find the access code
  SELECT * INTO code_record
  FROM access_codes
  WHERE code = upper(code_input)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND current_uses < max_uses;

  -- If code not found or invalid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired access code'
    );
  END IF;

  -- Get plan details
  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = code_record.plan_id;

  -- Return validation result
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
  -- Increment usage count
  UPDATE access_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE code = upper(code_input)
    AND is_active = true
    AND current_uses < max_uses;

  -- Return success if row was updated
  RETURN FOUND;
END;
$$;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  user_record record;
  current_count integer;
  max_allowed integer;
BEGIN
  -- Get user subscription info
  SELECT u.*, 
         COALESCE(sp.max_projects, 3) as max_projects,
         COALESCE(sp.max_stakeholders_per_project, 15) as max_stakeholders,
         COALESCE(sp.max_questions_per_project, 50) as max_questions
  INTO user_record
  FROM users u
  LEFT JOIN subscription_plans sp ON sp.plan_code = 'starter' -- Default plan
  WHERE u.id = COALESCE(NEW.user_id, (
    SELECT user_id FROM projects WHERE id = NEW.project_id
  ));

  -- Check limits based on table
  IF TG_TABLE_NAME = 'projects' THEN
    SELECT COUNT(*) INTO current_count
    FROM projects
    WHERE user_id = user_record.id;
    
    max_allowed := user_record.max_projects;
    
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Project limit reached (%). Upgrade your plan to create more projects.', max_allowed;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'stakeholders' THEN
    SELECT COUNT(*) INTO current_count
    FROM stakeholders
    WHERE project_id = NEW.project_id;
    
    max_allowed := user_record.max_stakeholders;
    
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Stakeholder limit reached (% per project). Upgrade your plan to add more stakeholders.', max_allowed;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'questions' THEN
    SELECT COUNT(*) INTO current_count
    FROM questions
    WHERE project_id = NEW.project_id;
    
    max_allowed := user_record.max_questions;
    
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Question limit reached (% per project). Upgrade your plan to add more questions.', max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to set stakeholder interview password
CREATE OR REPLACE FUNCTION set_stakeholder_interview_password()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set interview password if not provided
  IF NEW.interview_password IS NULL OR NEW.interview_password = '' THEN
    NEW.interview_password := generate_interview_password();
  END IF;
  
  RETURN NEW;
END;
$$;

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

-- Function to prevent duplicate admin logs
CREATE OR REPLACE FUNCTION prevent_duplicate_admin_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for duplicate log within last 5 minutes
  IF EXISTS (
    SELECT 1 FROM admin_activity_log
    WHERE admin_user_id = NEW.admin_user_id
      AND action = NEW.action
      AND target_user_id = NEW.target_user_id
      AND created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    -- Skip duplicate
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

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
  -- Get session ID from the response
  session_id := COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  IF session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total questions for this session
  SELECT COUNT(*) INTO total_questions
  FROM question_assignments
  WHERE interview_session_id = session_id;

  -- Count answered questions
  SELECT COUNT(*) INTO answered_questions
  FROM interview_responses ir
  JOIN question_assignments qa ON qa.question_id = ir.question_id
  WHERE qa.interview_session_id = session_id;

  -- Calculate completion percentage
  completion_pct := CASE 
    WHEN total_questions > 0 THEN (answered_questions * 100 / total_questions)
    ELSE 0
  END;

  -- Update interview session
  UPDATE interview_sessions
  SET answered_questions = answered_questions,
      completion_percentage = completion_pct,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update total questions in interview session
CREATE OR REPLACE FUNCTION update_interview_total_questions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_id uuid;
  total_questions integer;
BEGIN
  -- Get session ID
  session_id := COALESCE(NEW.interview_session_id, OLD.interview_session_id);
  
  IF session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total questions for this session
  SELECT COUNT(*) INTO total_questions
  FROM question_assignments
  WHERE interview_session_id = session_id;

  -- Update interview session
  UPDATE interview_sessions
  SET total_questions = total_questions,
      updated_at = NOW()
  WHERE id = session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  customer_uuid uuid;
  month_year_str text;
  file_size_mb numeric;
BEGIN
  -- Get customer ID from user
  IF TG_OP = 'DELETE' THEN
    SELECT customer_id INTO customer_uuid
    FROM users
    WHERE id = OLD.user_id;
    file_size_mb := -(OLD.file_size / 1024.0 / 1024.0);
  ELSE
    SELECT customer_id INTO customer_uuid
    FROM users
    WHERE id = NEW.user_id;
    file_size_mb := (NEW.file_size / 1024.0 / 1024.0);
  END IF;

  -- Get current month-year
  month_year_str := to_char(NOW(), 'YYYY-MM');

  -- Update or insert storage usage
  INSERT INTO storage_usage (customer_id, user_id, month_year, storage_mb, file_count)
  VALUES (
    customer_uuid,
    COALESCE(NEW.user_id, OLD.user_id),
    month_year_str,
    file_size_mb,
    CASE WHEN TG_OP = 'DELETE' THEN -1 ELSE 1 END
  )
  ON CONFLICT (customer_id, month_year) DO UPDATE SET
    storage_mb = storage_usage.storage_mb + EXCLUDED.storage_mb,
    file_count = storage_usage.file_count + EXCLUDED.file_count,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to notify on project update
CREATE OR REPLACE FUNCTION notify_on_project_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'project_update',
      'Project Status Updated',
      format('Project "%s" status changed from %s to %s', NEW.name, OLD.status, NEW.status),
      jsonb_build_object('project_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify on stakeholder response
CREATE OR REPLACE FUNCTION notify_on_stakeholder_response()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_owner_id uuid;
  project_name text;
BEGIN
  -- Only notify when status changes to 'responded' or 'completed'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('responded', 'completed') THEN
    -- Get project owner and name
    SELECT p.user_id, p.name INTO project_owner_id, project_name
    FROM projects p
    WHERE p.id = NEW.project_id;
    
    IF project_owner_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        project_owner_id,
        'stakeholder_response',
        'New Stakeholder Response',
        format('"%s" has %s their interview for project "%s"', 
               NEW.name, 
               CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'responded to' END,
               project_name),
        jsonb_build_object(
          'project_id', NEW.project_id, 
          'stakeholder_id', NEW.id,
          'stakeholder_name', NEW.name,
          'status', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;