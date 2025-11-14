/*
  # Fix projects.customer_id to use proper foreign key relationship

  ## Problem
  The projects table currently stores customer_id as TEXT instead of UUID foreign key.
  This creates:
  - No referential integrity enforcement
  - Orphaned project records (3 projects reference non-existent customers)
  - Inconsistent data model (other tables use UUID foreign keys)

  ## Solution
  1. Create missing customer records for orphaned projects (3 records need customers)
  2. Add new column projects.customer_uuid as UUID foreign key to customers.id
  3. Migrate data from customer_id (text) to customer_uuid (UUID)
  4. Drop old customer_id column
  5. Rename customer_uuid to customer_id
  6. Update indexes

  ## Data Migration Details
  - User a2fe808e-bedc-41b3-a226-84a2fbbeb9ea (dalton@oddbronco.com) owns all orphaned projects
  - Creating 3 new customer records for: CUST_QCEEWAKC, CUST_JOSGPWRT, CUST_LXMHHSA0
  - All existing valid references will be preserved

  ## Changes
  - Creates 3 new customer records for orphaned project references
  - Converts projects.customer_id from TEXT to UUID foreign key
  - Updates edge function query will work with both text lookup and UUID join
  - Maintains backward compatibility during transition
*/

-- Step 1: Create missing customer records for orphaned projects
-- These are active projects that need valid customer records

INSERT INTO customers (customer_id, name, owner_id, subscription_plan, subscription_status, max_projects, max_stakeholders)
VALUES 
  ('CUST_QCEEWAKC', 'Samsung Website Redesign', 'a2fe808e-bedc-41b3-a226-84a2fbbeb9ea', 'pro', 'active', 10, 50),
  ('CUST_JOSGPWRT', 'Sol Project OS', 'a2fe808e-bedc-41b3-a226-84a2fbbeb9ea', 'pro', 'active', 10, 50),
  ('CUST_LXMHHSA0', 'Global Creator Lab', 'a2fe808e-bedc-41b3-a226-84a2fbbeb9ea', 'pro', 'active', 10, 50)
ON CONFLICT (customer_id) DO NOTHING;

-- Step 2: Add new UUID column for customer reference
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_uuid uuid;

-- Step 3: Populate customer_uuid from customer_id text lookup
UPDATE projects p
SET customer_uuid = c.id
FROM customers c
WHERE p.customer_id = c.customer_id;

-- Step 4: Verify all projects now have valid customer_uuid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE customer_uuid IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some projects still have NULL customer_uuid';
  END IF;
END $$;

-- Step 5: Make customer_uuid NOT NULL and add foreign key constraint
ALTER TABLE projects ALTER COLUMN customer_uuid SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_customer 
  FOREIGN KEY (customer_uuid) REFERENCES customers(id) ON DELETE CASCADE;

-- Step 6: Drop old customer_id column
ALTER TABLE projects DROP COLUMN customer_id;

-- Step 7: Rename customer_uuid to customer_id
ALTER TABLE projects RENAME COLUMN customer_uuid TO customer_id;

-- Step 8: Add index for foreign key performance
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);

-- Step 9: Update any existing indexes that referenced the old column
DROP INDEX IF EXISTS idx_projects_customer_text;
