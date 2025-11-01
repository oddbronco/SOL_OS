/*
  # Add System-Wide Template Access

  1. Changes
    - Add policy to allow all authenticated users to view org-scoped templates with NULL customer_id
    - These are system/platform templates available to everyone
  
  2. Security
    - Only SELECT access for authenticated users
    - Templates must have scope='org' and customer_id IS NULL
    - Templates must be active
*/

-- Allow all authenticated users to view system-wide org templates
CREATE POLICY "Users can view system org templates"
  ON document_templates
  FOR SELECT
  TO authenticated
  USING (
    scope = 'org' 
    AND customer_id IS NULL 
    AND is_active = true
  );
