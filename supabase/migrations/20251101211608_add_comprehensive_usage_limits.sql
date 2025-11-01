/*
  # Add Comprehensive Usage Limits to Subscription Plans

  1. Changes
    - Add max_total_recording_minutes_per_month column (total monthly recording time across all projects)
    - Add max_total_storage_gb column (total storage quota for all files)
    - Add max_api_calls_per_month column (total API calls per month)
    - Add max_users_per_customer column (how many user accounts per customer)

  2. Notes
    - max_recording_minutes = per individual session/interview
    - max_total_recording_minutes_per_month = cumulative monthly limit
    - max_file_size_mb = per individual file
    - max_total_storage_gb = cumulative storage limit
*/

-- Add new comprehensive limit columns
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_total_recording_minutes_per_month integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS max_total_storage_gb integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_api_calls_per_month integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS max_users_per_customer integer DEFAULT 5;

-- Update existing plans with reasonable defaults
UPDATE subscription_plans 
SET 
  max_total_recording_minutes_per_month = CASE 
    WHEN plan_code = 'starter' THEN 60
    WHEN plan_code = 'pro' THEN 300
    WHEN plan_code = 'enterprise' THEN 1500
    ELSE 60
  END,
  max_total_storage_gb = CASE 
    WHEN plan_code = 'starter' THEN 5
    WHEN plan_code = 'pro' THEN 50
    WHEN plan_code = 'enterprise' THEN 500
    ELSE 5
  END,
  max_api_calls_per_month = CASE 
    WHEN plan_code = 'starter' THEN 5000
    WHEN plan_code = 'pro' THEN 50000
    WHEN plan_code = 'enterprise' THEN 500000
    ELSE 5000
  END,
  max_users_per_customer = CASE 
    WHEN plan_code = 'starter' THEN 3
    WHEN plan_code = 'pro' THEN 15
    WHEN plan_code = 'enterprise' THEN 100
    ELSE 3
  END
WHERE max_total_recording_minutes_per_month IS NULL;
