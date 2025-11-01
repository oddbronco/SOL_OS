/*
  # Fix Master Admin Users Policy
  
  1. Changes
    - Drop the old "Master admins can read all users" policy that relies on JWT metadata
    - Create a new policy that uses the is_master_admin() function for real-time database checks
    
  2. Why This Matters
    - JWT metadata is only updated when users log out and log back in
    - The is_master_admin() function checks the database directly, so changes take effect immediately
    - This makes the users table policy consistent with projects, documents, and stakeholders tables
    
  3. Impact
    - Newly designated master admins can now see all users immediately without needing to re-login
    - Consistent behavior across all admin permissions
*/

-- Drop the old JWT-based policy
DROP POLICY IF EXISTS "Master admins can read all users" ON users;

-- Create new policy using the is_master_admin() function
CREATE POLICY "Master admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_master_admin());
