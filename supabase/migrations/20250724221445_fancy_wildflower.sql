/*
  # Storage Cost Tracking

  1. New Tables
    - `storage_usage` - Track monthly storage usage per customer
    - `billing_reports` - Generate monthly billing reports

  2. Functions
    - Calculate storage costs automatically
    - Generate usage reports for billing

  3. Security
    - Enable RLS on storage tables
    - Only admins can view billing data
*/

-- Storage usage tracking table
CREATE TABLE IF NOT EXISTS storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- Format: '2025-01'
  storage_mb integer DEFAULT 0,
  bandwidth_mb integer DEFAULT 0,
  file_count integer DEFAULT 0,
  estimated_cost_usd numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, month_year)
);

-- Billing reports table
CREATE TABLE IF NOT EXISTS billing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  subscription_cost numeric(10,2) DEFAULT 0,
  storage_cost numeric(10,2) DEFAULT 0,
  bandwidth_cost numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, month_year)
);

-- Enable RLS
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Master admins can manage all storage usage"
  ON storage_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

CREATE POLICY "Master admins can manage all billing reports"
  ON billing_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_master_admin = true
    )
  );

-- Function to calculate storage costs
CREATE OR REPLACE FUNCTION calculate_storage_costs()
RETURNS void AS $$
DECLARE
  customer_record RECORD;
  current_month text;
  storage_mb integer;
  bandwidth_mb integer;
  file_count integer;
  storage_cost numeric(10,2);
  bandwidth_cost numeric(10,2);
  total_cost numeric(10,2);
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Loop through each customer
  FOR customer_record IN 
    SELECT id, customer_id FROM customers WHERE subscription_status = 'active'
  LOOP
    -- Calculate storage usage
    SELECT 
      COALESCE(SUM(file_size), 0) / (1024 * 1024), -- Convert to MB
      COUNT(*)
    INTO storage_mb, file_count
    FROM file_storage 
    WHERE user_id IN (
      SELECT user_id FROM customer_users 
      WHERE customer_id = customer_record.id
    );
    
    -- Estimate bandwidth (assume 2x storage for downloads/uploads)
    bandwidth_mb := storage_mb * 2;
    
    -- Calculate costs (Supabase pricing: $0.021/GB storage, $0.09/GB bandwidth)
    storage_cost := (storage_mb / 1024.0) * 0.021;
    bandwidth_cost := (bandwidth_mb / 1024.0) * 0.09;
    total_cost := storage_cost + bandwidth_cost;
    
    -- Insert or update usage record
    INSERT INTO storage_usage (
      customer_id, month_year, storage_mb, bandwidth_mb, 
      file_count, estimated_cost_usd
    ) VALUES (
      customer_record.id, current_month, storage_mb, bandwidth_mb,
      file_count, total_cost
    )
    ON CONFLICT (customer_id, month_year) 
    DO UPDATE SET
      storage_mb = EXCLUDED.storage_mb,
      bandwidth_mb = EXCLUDED.bandwidth_mb,
      file_count = EXCLUDED.file_count,
      estimated_cost_usd = EXCLUDED.estimated_cost_usd,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_usage_customer_month ON storage_usage(customer_id, month_year);
CREATE INDEX IF NOT EXISTS idx_billing_reports_customer_month ON billing_reports(customer_id, month_year);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_created ON file_storage(user_id, created_at);

-- Trigger to update storage usage when files are added/removed
CREATE OR REPLACE FUNCTION update_storage_usage_trigger()
RETURNS trigger AS $$
BEGIN
  -- Recalculate storage costs for the affected customer
  PERFORM calculate_storage_costs();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_usage_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON file_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage_trigger();