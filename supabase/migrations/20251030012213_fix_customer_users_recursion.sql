/*
  # Fix Infinite Recursion in customer_users RLS Policies

  1. Problem
    - The "Customer admins can manage customer users" policy joins customer_users to itself
    - This causes infinite recursion when querying
  
  2. Solution
    - Drop the recursive policy
    - Create new policies that check users table directly for admin status
    - Separate policies for SELECT, INSERT, UPDATE, DELETE
    - Master admins get full access via direct users.is_master_admin check
    - Customer admins get access by checking a separate query without recursion
  
  3. Security
    - Master admins can manage all customer_users entries
    - Customer admins can only manage customer_users for their own customer
    - Regular users can only read their own customer_users entry
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Customer admins can manage customer users" ON customer_users;

-- Master admins can select all customer_users entries
CREATE POLICY "Master admins can select all customer_users"
  ON customer_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

-- Master admins can insert customer_users entries
CREATE POLICY "Master admins can insert customer_users"
  ON customer_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

-- Master admins can update customer_users entries
CREATE POLICY "Master admins can update customer_users"
  ON customer_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

-- Master admins can delete customer_users entries
CREATE POLICY "Master admins can delete customer_users"
  ON customer_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

-- Customer admins can select customer_users for their customer
CREATE POLICY "Customer admins can select their customer_users"
  ON customer_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.customer_id = customer_users.customer_id
      AND users.role = 'customer_admin'
    )
  );

-- Customer admins can insert customer_users for their customer
CREATE POLICY "Customer admins can insert their customer_users"
  ON customer_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.customer_id = customer_users.customer_id
      AND users.role = 'customer_admin'
    )
  );

-- Customer admins can update customer_users for their customer
CREATE POLICY "Customer admins can update their customer_users"
  ON customer_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.customer_id = customer_users.customer_id
      AND users.role = 'customer_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.customer_id = customer_users.customer_id
      AND users.role = 'customer_admin'
    )
  );

-- Customer admins can delete customer_users for their customer
CREATE POLICY "Customer admins can delete their customer_users"
  ON customer_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.customer_id = customer_users.customer_id
      AND users.role = 'customer_admin'
    )
  );
