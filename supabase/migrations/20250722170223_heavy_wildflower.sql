/*
  # Fix RLS policies for CRUD operations

  1. Security Updates
    - Fix agency_id matching for projects table
    - Ensure proper user authentication checks
    - Add missing RLS policies for updates

  2. Policy Updates
    - Update projects policies to use proper agency_id matching
    - Fix clients policies for proper access control
    - Ensure stakeholders can be managed by project owners
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

-- Create new policies for projects table with proper agency_id matching
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (agency_id = (auth.uid())::text);

CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = (auth.uid())::text);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (agency_id = (auth.uid())::text)
  WITH CHECK (agency_id = (auth.uid())::text);

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (agency_id = (auth.uid())::text);

-- Drop existing problematic policies for clients
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can read own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;

-- Create new policies for clients table
CREATE POLICY "Users can read own clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (agency_id = (auth.uid())::text);

CREATE POLICY "Users can insert own clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = (auth.uid())::text);

CREATE POLICY "Users can update own clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (agency_id = (auth.uid())::text)
  WITH CHECK (agency_id = (auth.uid())::text);

CREATE POLICY "Users can delete own clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (agency_id = (auth.uid())::text);

-- Ensure users table has proper policies for profile updates
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());