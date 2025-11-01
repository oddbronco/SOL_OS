/*
  # Fix Clients Table RLS Policy

  1. Security Updates
    - Drop existing INSERT policy for clients table
    - Create new INSERT policy that allows authenticated users to insert clients where agency_id matches their user ID
    - Ensure RLS is enabled on clients table

  2. Policy Details
    - Policy name: "Users can insert own clients"
    - Target: INSERT operations
    - Role: authenticated users
    - Condition: agency_id must match the authenticated user's ID
*/

-- Ensure RLS is enabled on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;

-- Create new INSERT policy that allows authenticated users to insert clients
-- where the agency_id matches their authenticated user ID
CREATE POLICY "Users can insert own clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = (auth.uid())::text);

-- Verify other policies exist for completeness
DO $$
BEGIN
  -- Ensure SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Users can read own clients'
  ) THEN
    CREATE POLICY "Users can read own clients"
      ON clients
      FOR SELECT
      TO authenticated
      USING (agency_id = (auth.uid())::text);
  END IF;

  -- Ensure UPDATE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Users can update own clients'
  ) THEN
    CREATE POLICY "Users can update own clients"
      ON clients
      FOR UPDATE
      TO authenticated
      USING (agency_id = (auth.uid())::text);
  END IF;

  -- Ensure DELETE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Users can delete own clients'
  ) THEN
    CREATE POLICY "Users can delete own clients"
      ON clients
      FOR DELETE
      TO authenticated
      USING (agency_id = (auth.uid())::text);
  END IF;
END $$;