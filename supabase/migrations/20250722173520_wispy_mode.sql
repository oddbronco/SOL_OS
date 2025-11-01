-- Fix RLS policies for all tables
-- This will ensure users can access their own data properly

-- Disable RLS temporarily to clean up
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can read stakeholders from own projects" ON stakeholders;
DROP POLICY IF EXISTS "Users can insert stakeholders to own projects" ON stakeholders;
DROP POLICY IF EXISTS "Users can update stakeholders in own projects" ON stakeholders;
DROP POLICY IF EXISTS "Users can delete stakeholders from own projects" ON stakeholders;

DROP POLICY IF EXISTS "Users can read questions from own projects" ON questions;
DROP POLICY IF EXISTS "Users can insert questions to own projects" ON questions;
DROP POLICY IF EXISTS "Users can update questions in own projects" ON questions;
DROP POLICY IF EXISTS "Users can delete questions from own projects" ON questions;

DROP POLICY IF EXISTS "Users can read documents from own projects" ON documents;
DROP POLICY IF EXISTS "Users can insert documents to own projects" ON documents;
DROP POLICY IF EXISTS "Users can update documents in own projects" ON documents;
DROP POLICY IF EXISTS "Users can delete documents from own projects" ON documents;

DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Re-enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies for clients
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (user_id = auth.uid());

-- Create simple, working policies for projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

-- Create policies for stakeholders (access through projects)
CREATE POLICY "Users can manage stakeholders in own projects" ON stakeholders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = stakeholders.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Create policies for questions (access through projects)
CREATE POLICY "Users can manage questions in own projects" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = questions.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Create policies for documents (access through projects)
CREATE POLICY "Users can manage documents in own projects" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = documents.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Create policies for users table
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_questions_project_id ON questions(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);