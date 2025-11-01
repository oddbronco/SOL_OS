/*
# Add Master Admin Support

This migration adds support for master admin functionality by creating helper functions
that work with Supabase's built-in auth system.

## Changes Made:
1. Helper functions to check master admin status
2. Admin activity logging table
3. Functions to manage user permissions safely
*/

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin activity log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only master admins can read admin logs
CREATE POLICY "Master admins can read admin logs"
  ON admin_activity_log
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true'
  );

-- Policy: Only master admins can insert admin logs
CREATE POLICY "Master admins can insert admin logs"
  ON admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true'
  );

-- Function to check if current user is master admin
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true',
    false
  );
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type text,
  target_user_id uuid DEFAULT NULL,
  action_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow master admins to log actions
  IF NOT is_master_admin() THEN
    RAISE EXCEPTION 'Access denied: Master admin required';
  END IF;

  INSERT INTO admin_activity_log (
    admin_user_id,
    action,
    target_user_id,
    details
  ) VALUES (
    auth.uid(),
    action_type,
    target_user_id,
    action_details
  );
END;
$$;

-- Function to get user count (master admin only)
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow master admins
  IF NOT is_master_admin() THEN
    RAISE EXCEPTION 'Access denied: Master admin required';
  END IF;

  -- Get basic user statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_users', (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'recent_signups', (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action);