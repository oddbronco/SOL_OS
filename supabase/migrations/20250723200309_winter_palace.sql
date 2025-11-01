/*
  # Add interview passwords for stakeholders

  1. Schema Changes
    - Add `interview_password` column to stakeholders table
    - Add function to generate random alphanumeric passwords
    - Add trigger to auto-generate passwords for new stakeholders

  2. Security
    - Passwords are 7 characters long
    - Alphanumeric only (A-Z, a-z, 0-9)
    - Unique per stakeholder
    - Can be manually modified by account owner
*/

-- Function to generate random 7-character alphanumeric password
CREATE OR REPLACE FUNCTION generate_interview_password()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add interview_password column to stakeholders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'interview_password'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN interview_password text;
  END IF;
END $$;

-- Update existing stakeholders with generated passwords
UPDATE stakeholders 
SET interview_password = generate_interview_password() 
WHERE interview_password IS NULL;

-- Set default for new stakeholders
ALTER TABLE stakeholders ALTER COLUMN interview_password SET DEFAULT generate_interview_password();

-- Create trigger to auto-generate passwords for new stakeholders
CREATE OR REPLACE FUNCTION set_stakeholder_interview_password()
RETURNS trigger AS $$
BEGIN
  IF NEW.interview_password IS NULL THEN
    NEW.interview_password := generate_interview_password();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_stakeholder_interview_password ON stakeholders;
CREATE TRIGGER trigger_set_stakeholder_interview_password
  BEFORE INSERT ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION set_stakeholder_interview_password();