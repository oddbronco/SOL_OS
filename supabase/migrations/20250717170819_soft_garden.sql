/*
  # Initial Schema Setup

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `agency_id` (text, references auth.users)
      - `name` (text)
      - `industry` (text)
      - `email` (text)
      - `phone` (text, optional)
      - `website` (text, optional)
      - `contact_person` (text)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `projects`
      - `id` (uuid, primary key)
      - `agency_id` (text, references auth.users)
      - `client_id` (uuid, references clients.id)
      - `name` (text)
      - `description` (text, optional)
      - `status` (text)
      - `progress` (integer)
      - `due_date` (date)
      - `transcript` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `stakeholders`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects.id)
      - `name` (text)
      - `email` (text)
      - `role` (text)
      - `department` (text)
      - `status` (text)
      - `mentioned_context` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `questions`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects.id)
      - `text` (text)
      - `category` (text)
      - `target_roles` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `documents`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects.id)
      - `title` (text)
      - `type` (text)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own agency data
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL,
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

-- Create projects table with foreign key to clients
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Setup' CHECK (status IN ('Setup', 'Transcript Processing', 'Stakeholder Outreach', 'Gathering Responses', 'Document Generation', 'Complete')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date date NOT NULL,
  transcript text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
);

-- Create stakeholders table with foreign key to projects
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  department text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'responded', 'completed')),
  mentioned_context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_project_stakeholder FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Create questions table with foreign key to projects
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  text text NOT NULL,
  category text NOT NULL,
  target_roles text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_project_question FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Create documents table with foreign key to projects
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_project_document FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Users can read own clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = agency_id);

CREATE POLICY "Users can insert own clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = agency_id);

CREATE POLICY "Users can update own clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = agency_id);

CREATE POLICY "Users can delete own clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = agency_id);

-- Create policies for projects
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = agency_id);

CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = agency_id);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = agency_id);

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = agency_id);

-- Create policies for stakeholders
CREATE POLICY "Users can read stakeholders from own projects"
  ON stakeholders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = stakeholders.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert stakeholders to own projects"
  ON stakeholders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = stakeholders.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update stakeholders in own projects"
  ON stakeholders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = stakeholders.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete stakeholders from own projects"
  ON stakeholders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = stakeholders.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

-- Create policies for questions
CREATE POLICY "Users can read questions from own projects"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = questions.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert questions to own projects"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = questions.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update questions in own projects"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = questions.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete questions from own projects"
  ON questions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = questions.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

-- Create policies for documents
CREATE POLICY "Users can read documents from own projects"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = documents.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert documents to own projects"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = documents.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update documents in own projects"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = documents.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete documents from own projects"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = documents.project_id 
      AND projects.agency_id = auth.uid()::text
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients (agency_id);
CREATE INDEX IF NOT EXISTS idx_projects_agency_id ON projects (agency_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects (client_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders (project_id);
CREATE INDEX IF NOT EXISTS idx_questions_project_id ON questions (project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents (project_id);