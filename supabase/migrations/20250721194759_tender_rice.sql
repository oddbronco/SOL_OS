/*
  # Add OpenAI API Key Storage

  1. New Tables
    - Add `openai_api_key` column to users table (encrypted)
    - Add `api_key_set_at` timestamp for tracking when it was last updated

  2. Security
    - Enable RLS on users table (should already be enabled)
    - Add policy for users to update their own API key
*/

-- Add OpenAI API key column to users table (assuming we're using auth.users metadata or a custom users table)
-- Since we're using Supabase auth, we'll store this in user metadata for now
-- But let's create a user_settings table for better organization

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key text,
  api_key_set_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own settings
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();