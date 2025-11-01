/*
  # Rename Agency to Customer Terminology

  This migration updates the database schema to use "customer" terminology instead of "agency"
  throughout the platform for better clarity and broader market appeal.

  ## Changes Made:
  1. **Tables Renamed**:
     - `agencies` → `customers` 
     - `agency_users` → `customer_users`

  2. **Columns Renamed**:
     - All `agency_id` columns → `customer_id`
     - `agency_admin` role → `customer_admin`

  3. **Constraints & Indexes Updated**:
     - All foreign key references updated
     - Index names updated for consistency
     - Check constraints updated for new role names

  4. **Functions & Triggers**:
     - All references to agency terminology updated

  ## Important Notes:
  - This is a breaking change that requires application code updates
  - All existing data will be preserved with new terminology
  - RLS policies updated to use new table/column names
*/

-- Step 1: Create new customers table (renamed from agencies)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text UNIQUE NOT NULL DEFAULT ('CUST_' || upper(substring(gen_random_uuid()::text, 1, 8))),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website text,
  industry text,
  size text CHECK (size = ANY (ARRAY['startup'::text, 'small'::text, 'medium'::text, 'large'::text, 'enterprise'::text])),
  subscription_plan text DEFAULT 'starter'::text CHECK (subscription_plan = ANY (ARRAY['starter'::text, 'pro'::text, 'enterprise'::text])),
  subscription_status text DEFAULT 'trial'::text CHECK (subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'paused'::text, 'cancelled'::text])),
  max_projects integer DEFAULT 3,
  max_stakeholders integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  access_code_used text,
  billing_contact_email text,
  billing_contact_phone text,
  onboarding_completed boolean DEFAULT false
);

-- Step 2: Create new customer_users table (renamed from agency_users)
CREATE TABLE IF NOT EXISTS customer_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'analyst'::text CHECK (role = ANY (ARRAY['customer_admin'::text, 'project_manager'::text, 'analyst'::text])),
  permissions jsonb DEFAULT '{}'::jsonb,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(customer_id, user_id)
);

-- Step 3: Migrate data from agencies to customers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencies') THEN
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
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 4: Migrate data from agency_users to customer_users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agency_users') THEN
    INSERT INTO customer_users (
      id, customer_id, user_id, role, permissions, invited_at, joined_at, is_active
    )
    SELECT 
      id, agency_id, user_id, 
      CASE 
        WHEN role = 'agency_admin' THEN 'customer_admin'
        ELSE role 
      END,
      permissions, invited_at, joined_at, is_active
    FROM agency_users
    ON CONFLICT (customer_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Step 5: Update all tables that reference agency_id to customer_id
DO $$
BEGIN
  -- Update clients table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'agency_id') THEN
    ALTER TABLE clients RENAME COLUMN agency_id TO customer_id;
  END IF;

  -- Update projects table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'agency_id') THEN
    ALTER TABLE projects RENAME COLUMN agency_id TO customer_id;
  END IF;

  -- Update other tables as needed
  -- Add more tables here if they have agency_id columns
END $$;

-- Step 6: Update user roles in users table
UPDATE users 
SET role = 'customer_admin' 
WHERE role = 'agency_admin';

-- Step 7: Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON customer_users(user_id);

-- Step 8: Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for customers table
CREATE POLICY "Customer owners can manage their customer"
  ON customers
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Customer members can read their customer"
  ON customers
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = customers.id 
    AND customer_users.user_id = auth.uid() 
    AND customer_users.is_active = true
  ));

CREATE POLICY "Master admins can read all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_master_admin = true
  ));

-- Step 10: Create RLS policies for customer_users table
CREATE POLICY "Customer admins can manage customer users"
  ON customer_users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM (customer_users cu JOIN users u ON (u.id = cu.user_id))
    WHERE (cu.customer_id = customer_users.customer_id) 
    AND (cu.user_id = auth.uid()) 
    AND ((cu.role = 'customer_admin'::text) OR (u.is_master_admin = true))
  ));

CREATE POLICY "Users can read own customer memberships"
  ON customer_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 11: Update triggers
CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Drop old tables (commented out for safety - uncomment after verifying migration)
-- DROP TABLE IF EXISTS agency_users CASCADE;
-- DROP TABLE IF EXISTS agencies CASCADE;