/*
  # Add RLS policy for admin activity log

  1. Security
    - Enable RLS on admin_activity_log table
    - Allow master admins to insert activity logs
    - Allow master admins to read all logs
*/

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can insert activity logs"
  ON admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (is_master_admin());

CREATE POLICY "Master admins can view activity logs"
  ON admin_activity_log
  FOR SELECT
  TO authenticated
  USING (is_master_admin());
