/*
  # Add Rate Limit Control Setting

  1. New Table
    - `system_settings` - Store platform-wide configuration
      - `key` (text, primary key) - Setting identifier
      - `value` (jsonb) - Setting value (flexible type)
      - `description` (text) - Human-readable description
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - User who last updated

  2. Initial Settings
    - `interview_rate_limiting_enabled` - Enable/disable rate limiting for interviews (default: true)

  3. Security
    - Enable RLS
    - Only master admins can read/update system settings

  4. Function Update
    - Update `record_session_access` to check rate limiting setting
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only master admins can read system settings
CREATE POLICY "Master admins can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Only master admins can update system settings
CREATE POLICY "Master admins can update system settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Only master admins can insert system settings
CREATE POLICY "Master admins can insert system settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master_admin'
    )
  );

-- Insert default rate limiting setting
INSERT INTO system_settings (key, value, description)
VALUES (
  'interview_rate_limiting_enabled',
  'true'::jsonb,
  'Enable rate limiting for interview password attempts (10 attempts per hour per IP)'
)
ON CONFLICT (key) DO NOTHING;

-- Update record_session_access function to check rate limiting setting
CREATE OR REPLACE FUNCTION record_session_access(
  p_session_token text,
  p_ip_hash text,
  p_success boolean
)
RETURNS jsonb AS $$
DECLARE
  v_session_id uuid;
  v_access_log jsonb;
  v_recent_attempts integer;
  v_result jsonb;
  v_rate_limiting_enabled boolean;
BEGIN
  -- Check if rate limiting is enabled
  SELECT (value)::boolean INTO v_rate_limiting_enabled
  FROM system_settings
  WHERE key = 'interview_rate_limiting_enabled';

  -- Default to true if setting not found
  IF v_rate_limiting_enabled IS NULL THEN
    v_rate_limiting_enabled := true;
  END IF;

  -- Find session
  SELECT id INTO v_session_id
  FROM interview_sessions
  WHERE session_token = p_session_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  -- Get current access log
  SELECT ip_access_log INTO v_access_log
  FROM interview_sessions
  WHERE id = v_session_id;

  -- Add new access attempt to log
  v_access_log = v_access_log || jsonb_build_object(
    'timestamp', now(),
    'ip_hash', p_ip_hash,
    'success', p_success
  );

  -- Keep only last 100 attempts
  IF jsonb_array_length(v_access_log) > 100 THEN
    v_access_log = v_access_log - 0;
  END IF;

  -- Count recent attempts from this IP (last hour)
  SELECT COUNT(*) INTO v_recent_attempts
  FROM jsonb_array_elements(v_access_log) AS log_entry
  WHERE (log_entry->>'ip_hash')::text = p_ip_hash
    AND (log_entry->>'timestamp')::timestamptz > now() - interval '1 hour';

  -- Update session
  IF p_success THEN
    UPDATE interview_sessions
    SET
      last_accessed_at = now(),
      access_count = access_count + 1,
      last_access_ip = p_ip_hash,
      ip_access_log = v_access_log
    WHERE id = v_session_id;
  ELSE
    UPDATE interview_sessions
    SET
      failed_attempts = failed_attempts + 1,
      last_access_ip = p_ip_hash,
      ip_access_log = v_access_log,
      is_locked = CASE WHEN failed_attempts + 1 >= 5 THEN true ELSE is_locked END,
      locked_at = CASE WHEN failed_attempts + 1 >= 5 THEN now() ELSE locked_at END
    WHERE id = v_session_id;
  END IF;

  -- Return result with rate limit info (only apply if enabled)
  IF v_rate_limiting_enabled THEN
    v_result = jsonb_build_object(
      'recent_attempts', v_recent_attempts,
      'rate_limited', v_recent_attempts > 10,
      'locked', v_recent_attempts > 10 OR (SELECT is_locked FROM interview_sessions WHERE id = v_session_id)
    );
  ELSE
    -- Rate limiting disabled - never rate limit
    v_result = jsonb_build_object(
      'recent_attempts', v_recent_attempts,
      'rate_limited', false,
      'locked', (SELECT is_locked FROM interview_sessions WHERE id = v_session_id)
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system setting (helper for frontend)
CREATE OR REPLACE FUNCTION get_system_setting(p_key text)
RETURNS jsonb AS $$
DECLARE
  v_value jsonb;
BEGIN
  SELECT value INTO v_value
  FROM system_settings
  WHERE key = p_key;

  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update system setting (helper for frontend)
CREATE OR REPLACE FUNCTION update_system_setting(
  p_key text,
  p_value jsonb,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_is_master_admin boolean;
BEGIN
  -- Check if user is master admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND role = 'master_admin'
  ) INTO v_is_master_admin;

  IF NOT v_is_master_admin THEN
    RAISE EXCEPTION 'Only master admins can update system settings';
  END IF;

  -- Update setting
  UPDATE system_settings
  SET
    value = p_value,
    updated_at = now(),
    updated_by = p_user_id
  WHERE key = p_key;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE system_settings IS 'Platform-wide system configuration settings - only accessible to master admins';
COMMENT ON COLUMN system_settings.key IS 'Unique setting identifier';
COMMENT ON COLUMN system_settings.value IS 'Setting value stored as JSONB for flexibility';
