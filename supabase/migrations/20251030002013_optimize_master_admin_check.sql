/*
  # Optimize Master Admin Check Function

  ## Changes
  - Replace the is_master_admin() function with an optimized SQL version
  - Add an index on users(id, is_master_admin) for faster lookups
*/

-- Replace function with optimized version
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean AS $$
  SELECT COALESCE(is_master_admin, false)
  FROM users 
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_id_is_master_admin ON users(id, is_master_admin);