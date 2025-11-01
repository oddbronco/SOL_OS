/*
  # Row Level Security Policies

  1. Security Setup
    - Enable RLS on all tables
    - Create comprehensive access control policies
    - Ensure users can only access their own data
    - Allow master admins full access

  2. Policy Types
    - User data policies
    - Customer/agency policies
    - Project-related policies
    - Admin policies
*/

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_prompt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Master admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true');

CREATE POLICY "Master admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true');

-- Customers table policies
CREATE POLICY "Customer owners can manage their customer"
  ON customers FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Customer members can read their customer"
  ON customers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = customers.id 
    AND customer_users.user_id = auth.uid() 
    AND customer_users.is_active = true
  ));

CREATE POLICY "Master admins can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_master_admin = true
  ));

-- Customer users table policies
CREATE POLICY "Customer admins can manage customer users"
  ON customer_users FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM customer_users cu 
    JOIN users u ON u.id = cu.user_id
    WHERE cu.customer_id = customer_users.customer_id 
    AND cu.user_id = auth.uid() 
    AND (cu.role = 'customer_admin' OR u.is_master_admin = true)
  ));

CREATE POLICY "Users can read own customer memberships"
  ON customer_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clients table policies
CREATE POLICY "Users can manage own clients"
  ON clients FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Projects table policies
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Stakeholders table policies
CREATE POLICY "Users can manage stakeholders in own projects"
  ON stakeholders FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = stakeholders.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = stakeholders.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Questions table policies
CREATE POLICY "Users can manage questions in own projects"
  ON questions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = questions.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = questions.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Documents table policies
CREATE POLICY "Users can manage documents in own projects"
  ON documents FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = documents.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = documents.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Notifications table policies
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User settings table policies
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Subscription plans table policies
CREATE POLICY "Anyone can read active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Master admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Subscription requests table policies
CREATE POLICY "Users can manage own subscription requests"
  ON subscription_requests FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can manage all subscription requests"
  ON subscription_requests FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Access codes table policies
CREATE POLICY "Master admins can manage access codes"
  ON access_codes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Interview sessions table policies
CREATE POLICY "Users can manage interview sessions in own projects"
  ON interview_sessions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_sessions.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_sessions.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Question assignments table policies
CREATE POLICY "Users can manage question assignments in own projects"
  ON question_assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = question_assignments.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = question_assignments.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Interview responses table policies
CREATE POLICY "Users can manage interview responses in own projects"
  ON interview_responses FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_responses.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_responses.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Interview materials table policies
CREATE POLICY "Users can manage interview materials in own projects"
  ON interview_materials FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_materials.project_id 
    AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = interview_materials.project_id 
    AND projects.user_id = auth.uid()
  ));

-- File storage table policies
CREATE POLICY "Users can manage own files"
  ON file_storage FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can read all files"
  ON file_storage FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Transcriptions table policies
CREATE POLICY "Users can manage transcriptions for own files"
  ON transcriptions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM file_storage 
    WHERE file_storage.id = transcriptions.file_storage_id 
    AND file_storage.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM file_storage 
    WHERE file_storage.id = transcriptions.file_storage_id 
    AND file_storage.user_id = auth.uid()
  ));

-- Storage usage table policies
CREATE POLICY "Master admins can manage all storage usage"
  ON storage_usage FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Billing reports table policies
CREATE POLICY "Master admins can manage all billing reports"
  ON billing_reports FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- CSV uploads table policies
CREATE POLICY "Users can manage own CSV uploads"
  ON csv_uploads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Agency prompt configs table policies
CREATE POLICY "Users can manage own prompt configs"
  ON agency_prompt_configs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can manage all prompt configs"
  ON agency_prompt_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.is_master_admin = true
  ));

-- Admin activity log table policies
CREATE POLICY "Master admins can manage admin logs"
  ON admin_activity_log FOR ALL
  TO authenticated
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true)
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin')::boolean = true);
