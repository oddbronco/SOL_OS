/*
  # Interview Session Security Features

  1. New Columns Added to `interview_sessions`
    - `session_token` (text, unique, indexed) - Single random token for URL obfuscation
    - `expires_at` (timestamptz) - Interview expires 30 days after creation
    - `last_accessed_at` (timestamptz) - Track when stakeholder last visited
    - `access_count` (integer, default 0) - Count successful accesses for analytics
    - `failed_attempts` (integer, default 0) - Track failed password attempts
    - `is_locked` (boolean, default false) - Lock after too many failed attempts
    - `locked_at` (timestamptz) - When the session was locked
    - `is_closed` (boolean, default false) - Permanently closed after completion
    - `closed_at` (timestamptz) - When the interview was completed/closed
    - `last_access_ip` (text) - Track IP for rate limiting (hashed for privacy)
    - `ip_access_log` (jsonb) - Log of access attempts with timestamps for rate limiting

  2. Security Features Implemented
    - **Token-based URLs**: Single random token instead of project+stakeholder IDs
    - **30-day expiration**: Automatic expiration window
    - **Rate limiting**: Track IP access patterns to prevent brute force
    - **Account lockout**: Lock after 5 failed password attempts
    - **Session closure**: Prevent re-access after completion
    - **Access analytics**: Track when and how often links are accessed

  3. Security Notes
    - Session tokens are 32-character random strings (cryptographically secure)
    - IP addresses are hashed before storage (SHA-256) for privacy compliance
    - Expired/closed/locked sessions still respond (don't 404) but show appropriate messages
    - All timestamp columns use timestamptz for proper timezone handling
    - Indexes added for performance on token lookups
*/

-- Add security columns to interview_sessions
DO $$
BEGIN
  -- Session token for URL obfuscation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN session_token text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_interview_sessions_token ON interview_sessions(session_token);
  END IF;

  -- Expiration timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN expires_at timestamptz;
  END IF;

  -- Last access tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN last_accessed_at timestamptz;
  END IF;

  -- Access count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'access_count'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN access_count integer DEFAULT 0;
  END IF;

  -- Failed password attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'failed_attempts'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN failed_attempts integer DEFAULT 0;
  END IF;

  -- Lock state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN is_locked boolean DEFAULT false;
  END IF;

  -- Locked timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN locked_at timestamptz;
  END IF;

  -- Closed state (completed interview)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'is_closed'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN is_closed boolean DEFAULT false;
  END IF;

  -- Closed timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN closed_at timestamptz;
  END IF;

  -- IP tracking for rate limiting (hashed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'last_access_ip'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN last_access_ip text;
  END IF;

  -- IP access log for rate limiting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'ip_access_log'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN ip_access_log jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Generate session tokens for existing sessions (backwards compatibility)
UPDATE interview_sessions
SET session_token = encode(gen_random_bytes(24), 'base64')
WHERE session_token IS NULL;

-- Set expiration dates for existing sessions (30 days from creation)
UPDATE interview_sessions
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

-- Create function to generate secure session tokens
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if session is accessible
CREATE OR REPLACE FUNCTION is_session_accessible(session_id uuid)
RETURNS boolean AS $$
DECLARE
  session_record interview_sessions%ROWTYPE;
BEGIN
  SELECT * INTO session_record
  FROM interview_sessions
  WHERE id = session_id;

  -- Check if session exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if locked
  IF session_record.is_locked THEN
    RETURN false;
  END IF;

  -- Check if closed
  IF session_record.is_closed THEN
    RETURN false;
  END IF;

  -- Check if expired
  IF session_record.expires_at < now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record access attempt
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
BEGIN
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

  -- Return result with rate limit info
  v_result = jsonb_build_object(
    'recent_attempts', v_recent_attempts,
    'rate_limited', v_recent_attempts > 10,
    'locked', v_recent_attempts > 10 OR (SELECT is_locked FROM interview_sessions WHERE id = v_session_id)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the security model
COMMENT ON COLUMN interview_sessions.session_token IS 'Unique random token for URL obfuscation - prevents enumeration attacks';
COMMENT ON COLUMN interview_sessions.expires_at IS 'Interview expires 30 days after creation - time-limited access window';
COMMENT ON COLUMN interview_sessions.is_locked IS 'Locked after 5 failed password attempts - prevents brute force';
COMMENT ON COLUMN interview_sessions.is_closed IS 'Permanently closed after completion - one-time use';
COMMENT ON COLUMN interview_sessions.ip_access_log IS 'Hashed IP access log for rate limiting - max 10 attempts per hour per IP';