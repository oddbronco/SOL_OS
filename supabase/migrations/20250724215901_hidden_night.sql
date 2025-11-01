/*
  # Consolidate to Customers-Only Schema

  1. Data Migration
    - Copy any remaining data from agencies to customers
    - Update all references to use customers table
    - Clean up agency-related tables

  2. Schema Updates
    - Remove agencies and agency_users tables
    - Update CSV upload types
    - Update user roles to use customer_admin

  3. Application Updates
    - All references now point to customers table
    - Consistent terminology throughout
*/

-- First, migrate any data from agencies to customers if needed
DO $$
BEGIN
  -- Copy any agencies data that doesn't exist in customers
  INSERT INTO customers (
    id, customer_id, name, owner_id, website, industry, size,
    subscription_plan, subscription_status, max_projects, max_stakeholders,
    created_at, updated_at, access_code_used, billing_contact_email,
    billing_contact_phone, onboarding_completed
  )
  SELECT 
    id, agency_id, name, owner_id, website, industry, size,
    subscription_plan, subscription_status, max_projects, max_stakeholders,
    created_at, updated_at, access_code_used, billing_contact_email,
    billing_contact_phone, onboarding_completed
  FROM agencies
  WHERE agency_id NOT IN (SELECT customer_id FROM customers)
  ON CONFLICT (customer_id) DO NOTHING;

  -- Copy agency_users to customer_users if needed
  INSERT INTO customer_users (
    id, customer_id, user_id, role, permissions, invited_at, joined_at, is_active
  )
  SELECT 
    au.id, 
    c.id as customer_id,
    au.user_id,
    CASE 
      WHEN au.role = 'agency_admin' THEN 'customer_admin'
      ELSE au.role
    END as role,
    au.permissions,
    au.invited_at,
    au.joined_at,
    au.is_active
  FROM agency_users au
  JOIN agencies a ON a.id = au.agency_id
  JOIN customers c ON c.customer_id = a.agency_id
  WHERE NOT EXISTS (
    SELECT 1 FROM customer_users cu 
    WHERE cu.customer_id = c.id AND cu.user_id = au.user_id
  );
END $$;

-- Update users table role references
UPDATE users 
SET role = 'customer_admin' 
WHERE role = 'agency_admin';

-- Update CSV upload types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'csv_uploads_upload_type_check'
  ) THEN
    ALTER TABLE csv_uploads DROP CONSTRAINT csv_uploads_upload_type_check;
    ALTER TABLE csv_uploads ADD CONSTRAINT csv_uploads_upload_type_check 
    CHECK (upload_type = ANY (ARRAY['customers'::text, 'stakeholders'::text, 'questions'::text]));
  END IF;
END $$;

-- Update any CSV upload records
UPDATE csv_uploads 
SET upload_type = 'customers' 
WHERE upload_type = 'agencies';

-- Update user role constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['master_admin'::text, 'customer_admin'::text, 'project_manager'::text, 'analyst'::text]));
  END IF;
END $$;

-- Clean up old tables (comment out for safety, can be dropped later)
-- DROP TABLE IF EXISTS agency_users CASCADE;
-- DROP TABLE IF EXISTS agencies CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON customer_users(user_id);

-- Update RLS policies to use customers table
DROP POLICY IF EXISTS "Agency members can read their agency" ON agencies;
DROP POLICY IF EXISTS "Agency owners can manage their agency" ON agencies;
DROP POLICY IF EXISTS "Master admins can read all agencies" ON agencies;

-- Ensure customer policies exist
DO $$
BEGIN
  -- Customer policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customer members can read their customer'
  ) THEN
    CREATE POLICY "Customer members can read their customer"
      ON customers
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM customer_users
          WHERE customer_users.customer_id = customers.id
          AND customer_users.user_id = auth.uid()
          AND customer_users.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customer owners can manage their customer'
  ) THEN
    CREATE POLICY "Customer owners can manage their customer"
      ON customers
      FOR ALL
      TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Master admins can read all customers'
  ) THEN
    CREATE POLICY "Master admins can read all customers"
      ON customers
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.is_master_admin = true
        )
      );
  END IF;
END $$;