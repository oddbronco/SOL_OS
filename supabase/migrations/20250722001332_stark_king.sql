/*
  # Add Additional Stakeholder Fields

  1. New Columns
    - `phone` (text, optional) - Phone number
    - `seniority` (text, optional) - Seniority level (Junior, Mid, Senior, etc.)
    - `experience_years` (integer, optional) - Years of experience

  2. Updates
    - Enhanced stakeholder information capture
    - Better contact information storage
*/

-- Add new columns to stakeholders table
DO $$
BEGIN
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'phone'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN phone text;
  END IF;

  -- Add seniority column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'seniority'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN seniority text;
  END IF;

  -- Add experience_years column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'experience_years'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN experience_years integer DEFAULT 0;
  END IF;
END $$;