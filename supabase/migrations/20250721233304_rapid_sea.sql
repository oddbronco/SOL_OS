/*
  # Fix Admin Activity Log Data Architecture

  This migration fixes issues with the admin_activity_log table to ensure proper data management:

  1. **Foreign Key Constraints**: Adds proper CASCADE deletes
  2. **RLS Policies**: Updates policies for proper access control
  3. **Indexes**: Ensures proper indexing for performance
  4. **Data Integrity**: Prevents orphaned records and ensures clean deletes

  ## Changes Made:
  - Add CASCADE delete for foreign key relationships
  - Update RLS policies for better access control
  - Add proper constraints and indexes
  - Ensure master admins have full CRUD access
*/

-- First, let's ensure the foreign key constraint exists with proper CASCADE
ALTER TABLE admin_activity_log 
DROP CONSTRAINT IF EXISTS admin_activity_log_admin_user_id_fkey;

ALTER TABLE admin_activity_log 
ADD CONSTRAINT admin_activity_log_admin_user_id_fkey 
FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for target_user_id if it references users
ALTER TABLE admin_activity_log 
DROP CONSTRAINT IF EXISTS admin_activity_log_target_user_id_fkey;

ALTER TABLE admin_activity_log 
ADD CONSTRAINT admin_activity_log_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies to ensure proper access control
DROP POLICY IF EXISTS "Master admins can insert admin logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Master admins can read admin logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Master admins can update admin logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Master admins can delete admin logs" ON admin_activity_log;

-- Create comprehensive RLS policies for master admins
CREATE POLICY "Master admins can read admin logs"
  ON admin_activity_log
  FOR SELECT
  TO authenticated
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true);

CREATE POLICY "Master admins can insert admin logs"
  ON admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true);

CREATE POLICY "Master admins can update admin logs"
  ON admin_activity_log
  FOR UPDATE
  TO authenticated
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true)
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true);

CREATE POLICY "Master admins can delete admin logs"
  ON admin_activity_log
  FOR DELETE
  TO authenticated
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true);

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at_desc 
ON admin_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action_created_at 
ON admin_activity_log (action, created_at DESC);

-- Add a function to clean up orphaned records (if any exist)
CREATE OR REPLACE FUNCTION cleanup_orphaned_admin_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove any logs where admin_user_id doesn't exist in auth.users
  DELETE FROM admin_activity_log 
  WHERE admin_user_id IS NOT NULL 
  AND admin_user_id NOT IN (SELECT id FROM auth.users);
  
  -- Remove any logs where target_user_id doesn't exist in auth.users
  DELETE FROM admin_activity_log 
  WHERE target_user_id IS NOT NULL 
  AND target_user_id NOT IN (SELECT id FROM auth.users);
END;
$$;

-- Run the cleanup function
SELECT cleanup_orphaned_admin_logs();

-- Add a trigger to prevent duplicate entries (if that's causing repopulation)
CREATE OR REPLACE FUNCTION prevent_duplicate_admin_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if a similar log entry exists within the last minute
  IF EXISTS (
    SELECT 1 FROM admin_activity_log 
    WHERE action = NEW.action 
    AND admin_user_id = NEW.admin_user_id 
    AND target_user_id IS NOT DISTINCT FROM NEW.target_user_id
    AND created_at > NOW() - INTERVAL '1 minute'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    -- Skip insertion of duplicate
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_admin_logs_trigger ON admin_activity_log;
CREATE TRIGGER prevent_duplicate_admin_logs_trigger
  BEFORE INSERT ON admin_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_admin_logs();