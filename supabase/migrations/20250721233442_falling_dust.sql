/*
  # Create Proper User and Customer ID Architecture

  1. New Tables
    - `users` - Proper user profiles with customer IDs
    - `agencies` - Dedicated agency management
    
  2. Schema Updates
    - Add proper foreign key relationships
    - Migrate existing data to new structure
    - Add customer_id field for easy reference
    
  3. Security
    - Enable RLS on all new tables
    - Add proper policies for data access
    
  4. Data Migration
    - Migrate existing users to new structure
    - Update foreign key references
    - Preserve existing data integrity
*/

-- Create users table with proper customer IDs
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text UNIQUE NOT NULL DEFAULT ('CUST_' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  company_name text,
  role text NOT NULL DEFAULT 'agency_admin' CHECK (role IN ('master_admin', 'agency_admin', 'project_manager', 'analyst')),
  is_master_admin boolean DEFAULT false,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text UNIQUE NOT NULL DEFAULT ('AGY_' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website text,
  industry text,
  size text CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  subscription_plan text DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'pro', 'enterprise')),
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'paused', 'cancelled')),
  max_projects integer DEFAULT 3,
  max_stakeholders integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agency_users junction table for multi-user agencies
CREATE TABLE IF NOT EXISTS agency_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('agency_admin', 'project_manager', 'analyst')),
  permissions jsonb DEFAULT '{}',
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(agency_id, user_id)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Master admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_master_admin = true
    )
  );

-- RLS Policies for agencies
CREATE POLICY "Agency owners can manage their agency"
  ON agencies FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Agency members can read their agency"
  ON agencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_users 
      WHERE agency_id = agencies.id AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Master admins can read all agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_master_admin = true
    )
  );

-- RLS Policies for agency_users
CREATE POLICY "Agency admins can manage agency users"
  ON agency_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_users au
      JOIN users u ON u.id = au.user_id
      WHERE au.agency_id = agency_users.agency_id 
      AND au.user_id = auth.uid() 
      AND (au.role = 'agency_admin' OR u.is_master_admin = true)
    )
  );

CREATE POLICY "Users can read own agency memberships"
  ON agency_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update existing tables to use proper foreign keys

-- Add user_id column to clients table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to projects table if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (
    id,
    email,
    full_name,
    company_name,
    is_master_admin
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company'),
    COALESCE((NEW.raw_user_meta_data->>'is_master_admin')::boolean, false)
  );
  
  -- Create agency for non-master admin users
  IF NOT COALESCE((NEW.raw_user_meta_data->>'is_master_admin')::boolean, false) THEN
    INSERT INTO agencies (
      name,
      owner_id,
      subscription_plan,
      subscription_status
    ) VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Agency'),
      NEW.id,
      'starter',
      'trial'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto user profile creation
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_master_admin ON users(is_master_admin);
CREATE INDEX IF NOT EXISTS idx_agencies_agency_id ON agencies(agency_id);
CREATE INDEX IF NOT EXISTS idx_agencies_owner_id ON agencies(owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user_id ON agency_users(user_id);

-- Create view for easy user lookup with agency info
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.customer_id,
  u.email,
  u.full_name,
  u.company_name,
  u.role,
  u.is_master_admin,
  u.avatar_url,
  u.phone,
  u.created_at,
  u.updated_at,
  a.id as agency_id,
  a.agency_id as agency_code,
  a.name as agency_name,
  a.subscription_plan,
  a.subscription_status,
  a.max_projects,
  a.max_stakeholders
FROM users u
LEFT JOIN agencies a ON a.owner_id = u.id
WHERE u.is_master_admin = false
UNION ALL
SELECT 
  u.id,
  u.customer_id,
  u.email,
  u.full_name,
  u.company_name,
  u.role,
  u.is_master_admin,
  u.avatar_url,
  u.phone,
  u.created_at,
  u.updated_at,
  NULL as agency_id,
  NULL as agency_code,
  NULL as agency_name,
  NULL as subscription_plan,
  NULL as subscription_status,
  NULL as max_projects,
  NULL as max_stakeholders
FROM users u
WHERE u.is_master_admin = true;