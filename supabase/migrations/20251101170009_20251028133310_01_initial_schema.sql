/*
  # Initial Schema Setup

  1. New Tables
    - All core tables for the application

  2. Security
    - Enable RLS on all tables
*/

-- Users table with proper customer IDs
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  company_name text,
  role text NOT NULL DEFAULT 'customer_admin' CHECK (role IN ('master_admin', 'customer_admin', 'project_manager', 'analyst')),
  is_master_admin boolean DEFAULT false,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table (renamed from agencies)
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

-- Update users table to reference customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_customer'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  plan_code text UNIQUE NOT NULL,
  max_projects integer NOT NULL DEFAULT 3,
  max_stakeholders_per_project integer NOT NULL DEFAULT 15,
  max_questions_per_project integer NOT NULL DEFAULT 50,
  max_file_size_mb integer NOT NULL DEFAULT 100,
  max_recording_minutes integer NOT NULL DEFAULT 5,
  features jsonb DEFAULT '{}',
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, plan_code, max_projects, max_stakeholders_per_project, max_questions_per_project, max_file_size_mb, max_recording_minutes, price_monthly, price_yearly, features) VALUES
('Starter', 'starter', 3, 15, 50, 100, 5, 0, 0, '{"ai_features": false, "custom_branding": false, "priority_support": false}'),
('Professional', 'pro', 15, 50, 200, 500, 10, 49, 490, '{"ai_features": true, "custom_branding": true, "priority_support": true, "advanced_analytics": true}'),
('Enterprise', 'enterprise', 100, 200, 1000, 2000, 30, 199, 1990, '{"ai_features": true, "custom_branding": true, "priority_support": true, "advanced_analytics": true, "white_label": true, "api_access": true}')
ON CONFLICT (plan_code) DO NOTHING;

-- Access codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  plan_id uuid REFERENCES subscription_plans(id),
  max_uses integer DEFAULT 1,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);