/*
  # Access Codes and Enhanced User Management

  1. New Tables
    - `access_codes` - Platform admin managed signup codes
    - `agencies` - Enhanced agency management with billing plans
    - `agency_users` - Users within agencies
    - `user_profiles` - Enhanced user profiles view

  2. Security
    - Enable RLS on all new tables
    - Add policies for platform admin and agency access
    - Secure access code validation

  3. Features
    - Access code required signup
    - Plan assignment via access codes
    - Agency management
    - User role management
*/

-- Access codes table for controlled signups
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  plan_id uuid REFERENCES subscription_plans(id),
  max_uses integer DEFAULT 1,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhanced agencies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'access_code_used'
  ) THEN
    ALTER TABLE agencies ADD COLUMN access_code_used text;
    ALTER TABLE agencies ADD COLUMN billing_contact_email text;
    ALTER TABLE agencies ADD COLUMN billing_contact_phone text;
    ALTER TABLE agencies ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- CSV upload tracking
CREATE TABLE IF NOT EXISTS csv_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_type text NOT NULL CHECK (upload_type IN ('agencies', 'stakeholders', 'questions')),
  file_name text NOT NULL,
  total_records integer NOT NULL,
  successful_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;

-- Access code policies
CREATE POLICY "Master admins can manage access codes"
  ON access_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_master_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_master_admin = true
    )
  );

-- CSV upload policies
CREATE POLICY "Users can manage own CSV uploads"
  ON csv_uploads
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to validate access codes
CREATE OR REPLACE FUNCTION validate_access_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record access_codes%ROWTYPE;
  plan_record subscription_plans%ROWTYPE;
BEGIN
  -- Get access code
  SELECT * INTO code_record
  FROM access_codes
  WHERE code = code_input
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired access code'
    );
  END IF;

  -- Get associated plan
  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = code_record.plan_id;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', code_record.id,
    'plan', jsonb_build_object(
      'plan_code', plan_record.plan_code,
      'plan_name', plan_record.plan_name,
      'max_projects', plan_record.max_projects,
      'max_stakeholders_per_project', plan_record.max_stakeholders_per_project,
      'max_questions_per_project', plan_record.max_questions_per_project
    )
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
      updated_at = now()
  WHERE code = code_input
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses;

  RETURN FOUND;
END;
$$;

-- Update triggers
CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();