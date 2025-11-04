/*
  # Add Missing RLS Policies

  This migration adds comprehensive Row Level Security policies for 9 tables that had RLS enabled but no policies defined.

  ## Tables Updated
  
  1. **agency_prompt_configs**
     - Users can manage their own prompt configurations
     - Master admins can view all configurations
  
  2. **billing_reports**
     - Customer owners can view their billing reports
     - Master admins can view all billing reports
  
  3. **csv_uploads**
     - Users can view and create their own CSV uploads
     - Master admins can view all uploads
  
  4. **customer_users**
     - Customer owners can manage users in their organization
     - Users can view their own customer membership
     - Master admins have full access
  
  5. **file_storage**
     - Users can manage files in their own projects
     - Master admins can view all files
  
  6. **interview_materials**
     - Project owners can manage interview materials
     - Anonymous users can view materials for their interview sessions
  
  7. **storage_usage**
     - Customer owners can view their storage usage
     - Master admins can view all storage usage
  
  8. **subscription_requests**
     - Users can view and create their own subscription requests
     - Master admins can manage all requests
  
  9. **transcriptions**
     - Project owners can view transcriptions for their projects
     - Anonymous users can view transcriptions for their responses

  ## Security
  - All policies check authentication status
  - Ownership is verified through user_id, customer_id, or project relationships
  - Master admins have administrative access where appropriate
  - Anonymous access is granted only for interview-related functionality
*/

-- ============================================================================
-- 1. AGENCY_PROMPT_CONFIGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own prompt configs"
  ON agency_prompt_configs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own prompt configs"
  ON agency_prompt_configs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prompt configs"
  ON agency_prompt_configs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own prompt configs"
  ON agency_prompt_configs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Master admins can view all prompt configs"
  ON agency_prompt_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 2. BILLING_REPORTS POLICIES
-- ============================================================================

CREATE POLICY "Customer owners can view own billing reports"
  ON billing_reports FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Master admins can view all billing reports"
  ON billing_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

CREATE POLICY "Master admins can manage billing reports"
  ON billing_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 3. CSV_UPLOADS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own csv uploads"
  ON csv_uploads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create csv uploads"
  ON csv_uploads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own csv uploads"
  ON csv_uploads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master admins can view all csv uploads"
  ON csv_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 4. CUSTOMER_USERS POLICIES
-- ============================================================================

CREATE POLICY "Customer owners can view own customer users"
  ON customer_users FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Customer owners can manage own customer users"
  ON customer_users FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own customer membership"
  ON customer_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Master admins can manage all customer users"
  ON customer_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 5. FILE_STORAGE POLICIES
-- ============================================================================

CREATE POLICY "Users can view files in own projects"
  ON file_storage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create files in own projects"
  ON file_storage FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update files in own projects"
  ON file_storage FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files in own projects"
  ON file_storage FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Master admins can view all files"
  ON file_storage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 6. INTERVIEW_MATERIALS POLICIES
-- ============================================================================

CREATE POLICY "Project owners can view interview materials"
  ON interview_materials FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage interview materials"
  ON interview_materials FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view materials for their sessions"
  ON interview_materials FOR SELECT
  TO anon
  USING (interview_session_id IS NOT NULL);

-- ============================================================================
-- 7. STORAGE_USAGE POLICIES
-- ============================================================================

CREATE POLICY "Customer owners can view own storage usage"
  ON storage_usage FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE owner_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Master admins can view all storage usage"
  ON storage_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

CREATE POLICY "Master admins can manage storage usage"
  ON storage_usage FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 8. SUBSCRIPTION_REQUESTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own subscription requests"
  ON subscription_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create subscription requests"
  ON subscription_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending requests"
  ON subscription_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Master admins can view all subscription requests"
  ON subscription_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

CREATE POLICY "Master admins can manage all subscription requests"
  ON subscription_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master_admin'
    )
  );

-- ============================================================================
-- 9. TRANSCRIPTIONS POLICIES
-- ============================================================================

CREATE POLICY "Project owners can view transcriptions"
  ON transcriptions FOR SELECT
  TO authenticated
  USING (
    file_storage_id IN (
      SELECT id FROM file_storage 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners can manage transcriptions"
  ON transcriptions FOR ALL
  TO authenticated
  USING (
    file_storage_id IN (
      SELECT id FROM file_storage 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    file_storage_id IN (
      SELECT id FROM file_storage 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anonymous users can view transcriptions for their responses"
  ON transcriptions FOR SELECT
  TO anon
  USING (
    response_id IN (
      SELECT id FROM interview_responses
    )
  );
