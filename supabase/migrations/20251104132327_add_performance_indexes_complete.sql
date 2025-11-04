/*
  # Add Performance Indexes

  This migration adds indexes to improve query performance across the database.

  ## Indexes Added

  ### Foreign Key Indexes
  Foreign keys should always have indexes for efficient joins and cascading operations:
  - agency_prompt_configs.user_id
  - clients.user_id, customer_id
  - csv_uploads.user_id
  - documents.project_id
  - file_storage.user_id, project_id, stakeholder_id
  - interview_materials.project_id, stakeholder_id, interview_session_id
  - interview_responses.project_id, interview_session_id
  - interview_sessions.project_id, stakeholder_id
  - notifications.user_id
  - projects.user_id, customer_id
  - question_assignments.project_id, interview_session_id
  - questions.project_id
  - stakeholders.project_id
  - storage_usage.user_id
  - subscription_requests.user_id
  - users.customer_id

  ### Additional Performance Indexes
  - interview_responses: created_at for sorting recent responses
  - interview_sessions: status, created_at for filtering active sessions
  - stakeholders: email for lookups
  - questions: category for filtering by category
  - notifications: read status for filtering unread
  - admin_activity_log: admin_user_id for auditing

  ## Performance Impact
  - Faster joins between related tables
  - Improved query performance for RLS policies
  - Better filtering and sorting performance
*/

-- ============================================================================
-- FOREIGN KEY INDEXES
-- ============================================================================

-- agency_prompt_configs
CREATE INDEX IF NOT EXISTS idx_agency_prompt_configs_user 
  ON agency_prompt_configs(user_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_user 
  ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_customer 
  ON clients(customer_id);

-- csv_uploads
CREATE INDEX IF NOT EXISTS idx_csv_uploads_user 
  ON csv_uploads(user_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_project 
  ON documents(project_id);

-- file_storage
CREATE INDEX IF NOT EXISTS idx_file_storage_user 
  ON file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_project 
  ON file_storage(project_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_stakeholder 
  ON file_storage(stakeholder_id);

-- interview_materials
CREATE INDEX IF NOT EXISTS idx_interview_materials_project 
  ON interview_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_materials_stakeholder 
  ON interview_materials(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_interview_materials_session 
  ON interview_materials(interview_session_id);

-- interview_responses
CREATE INDEX IF NOT EXISTS idx_interview_responses_project 
  ON interview_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_session 
  ON interview_responses(interview_session_id);

-- interview_sessions
CREATE INDEX IF NOT EXISTS idx_interview_sessions_project 
  ON interview_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_stakeholder 
  ON interview_sessions(stakeholder_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_user 
  ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer 
  ON projects(customer_id);

-- question_assignments
CREATE INDEX IF NOT EXISTS idx_question_assignments_project 
  ON question_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_question_assignments_session 
  ON question_assignments(interview_session_id);

-- questions
CREATE INDEX IF NOT EXISTS idx_questions_project 
  ON questions(project_id);

-- stakeholders
CREATE INDEX IF NOT EXISTS idx_stakeholders_project 
  ON stakeholders(project_id);

-- storage_usage
CREATE INDEX IF NOT EXISTS idx_storage_usage_user 
  ON storage_usage(user_id);

-- subscription_requests
CREATE INDEX IF NOT EXISTS idx_subscription_requests_user 
  ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status 
  ON subscription_requests(status);

-- users
CREATE INDEX IF NOT EXISTS idx_users_customer 
  ON users(customer_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- interview_responses: timestamp for sorting
CREATE INDEX IF NOT EXISTS idx_interview_responses_created 
  ON interview_responses(created_at DESC);

-- interview_sessions: status and timestamp for filtering
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status 
  ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created 
  ON interview_sessions(created_at DESC);

-- stakeholders: email for lookups
CREATE INDEX IF NOT EXISTS idx_stakeholders_email 
  ON stakeholders(email);

-- questions: category for filtering
CREATE INDEX IF NOT EXISTS idx_questions_category 
  ON questions(category);

-- access_codes: active status for validation
CREATE INDEX IF NOT EXISTS idx_access_codes_active 
  ON access_codes(is_active, expires_at);

-- admin_activity_log: timestamp and admin for auditing
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user 
  ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created 
  ON admin_activity_log(created_at DESC);
