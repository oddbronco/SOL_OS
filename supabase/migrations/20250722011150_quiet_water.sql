/*
  # Add Agency Prompt Configuration System

  1. New Tables
    - `agency_prompt_configs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `agency_name` (text)
      - `prompts` (jsonb) - stores all custom prompts
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `agency_prompt_configs` table
    - Add policies for users to manage their own prompt configs
    - Add policy for master admins to manage all prompt configs
*/

CREATE TABLE IF NOT EXISTS agency_prompt_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  prompts jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agency_prompt_configs_user_id ON agency_prompt_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_prompt_configs_agency_name ON agency_prompt_configs(agency_name);

-- Enable RLS
ALTER TABLE agency_prompt_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own prompt configs"
  ON agency_prompt_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Master admins can manage all prompt configs"
  ON agency_prompt_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'is_master_admin')::boolean = true
    )
  );

-- Update trigger
CREATE OR REPLACE FUNCTION update_agency_prompt_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_prompt_configs_updated_at
  BEFORE UPDATE ON agency_prompt_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_prompt_configs_updated_at();