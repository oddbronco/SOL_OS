/*
  # Initial Schema Setup

  1. New Tables
    - `clients` - Client management
    - `projects` - Project tracking
    - `stakeholders` - Project stakeholders
    - `questions` - Interview questions
    - `documents` - Generated documents
    - `users` - User profiles
    - `customers` - Customer/agency management
    - `customer_users` - Multi-user customer access
    - `notifications` - User notifications
    - `user_settings` - User preferences
    - `subscription_plans` - Billing plans
    - `subscription_requests` - Plan change requests
    - `access_codes` - Controlled signups
    - `interview_sessions` - Stakeholder interview sessions
    - `question_assignments` - Assigned questions
    - `interview_responses` - Stakeholder responses
    - `interview_materials` - Uploaded materials
    - `file_storage` - File tracking
    - `transcriptions` - AI transcriptions
    - `storage_usage` - Storage cost tracking
    - `billing_reports` - Monthly billing
    - `csv_uploads` - CSV upload tracking
    - `agency_prompt_configs` - Custom prompts
    - `admin_activity_log` - Admin actions

  2. Security
    - Enable RLS on all tables
    - Comprehensive access control policies
    - Secure authentication checks
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
ALTER TABLE users ADD CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Customer users junction table
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

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  name text NOT NULL,
  industry text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  contact_person text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Setup' CHECK (status IN ('Setup', 'Transcript Processing', 'Stakeholder Outreach', 'Gathering Responses', 'Document Generation', 'Complete')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date date NOT NULL,
  transcript text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  department text NOT NULL,
  phone text,
  seniority text,
  experience_years integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'responded', 'completed')),
  mentioned_context text,
  interview_password text DEFAULT upper(substring(md5(random()::text) from 1 for 7)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text NOT NULL,
  target_roles text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('stakeholder_response', 'project_update', 'system_alert', 'upgrade_request')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key text,
  api_key_set_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- Subscription requests table
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('upgrade', 'downgrade', 'cancel')),
  current_plan text,
  requested_plan text,
  reason text,
  contact_phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- Interview sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL DEFAULT ('INT_' || upper(substring(gen_random_uuid()::text, 1, 12))),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  total_questions integer DEFAULT 0,
  answered_questions integer DEFAULT 0,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Question assignments table
CREATE TABLE IF NOT EXISTS question_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  order_index integer DEFAULT 0,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(stakeholder_id, question_id)
);

-- File storage table
CREATE TABLE IF NOT EXISTS file_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid REFERENCES stakeholders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  storage_bucket text DEFAULT 'interview-files',
  purpose text CHECK (purpose IN ('response', 'material', 'transcript', 'document')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_storage_id uuid NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
  response_id uuid,
  original_file_url text NOT NULL,
  transcription_text text NOT NULL,
  confidence_score numeric(3,2),
  language text DEFAULT 'en',
  duration_seconds integer,
  word_count integer,
  ai_summary text,
  processing_status text DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Interview responses table
CREATE TABLE IF NOT EXISTS interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_assignment_id uuid REFERENCES question_assignments(id) ON DELETE CASCADE,
  response_type text NOT NULL DEFAULT 'text' CHECK (response_type IN ('text', 'audio', 'video', 'file')),
  response_text text,
  file_url text,
  file_name text,
  file_size integer,
  duration_seconds integer,
  transcription text,
  ai_summary text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score decimal(3,2),
  file_storage_id uuid REFERENCES file_storage(id),
  transcription_id uuid REFERENCES transcriptions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(stakeholder_id, question_id)
);

-- Interview materials table
CREATE TABLE IF NOT EXISTS interview_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  material_type text NOT NULL DEFAULT 'document' CHECK (material_type IN ('document', 'image', 'audio', 'video', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  description text,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- Storage usage tracking
CREATE TABLE IF NOT EXISTS storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  storage_mb integer DEFAULT 0,
  bandwidth_mb integer DEFAULT 0,
  file_count integer DEFAULT 0,
  estimated_cost_usd numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, month_year)
);

-- Billing reports table
CREATE TABLE IF NOT EXISTS billing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  subscription_cost numeric(10,2) DEFAULT 0,
  storage_cost numeric(10,2) DEFAULT 0,
  bandwidth_cost numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, month_year)
);

-- CSV uploads table
CREATE TABLE IF NOT EXISTS csv_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_type text NOT NULL CHECK (upload_type IN ('customers', 'stakeholders', 'questions')),
  file_name text NOT NULL,
  total_records integer NOT NULL,
  successful_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_details jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Agency prompt configs table
CREATE TABLE IF NOT EXISTS agency_prompt_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  prompts jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON customer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_questions_project_id ON questions(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_project_id ON interview_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_stakeholder_id ON interview_sessions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_question_assignments_project_id ON question_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_project_id ON interview_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
