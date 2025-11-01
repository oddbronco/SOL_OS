/*
  # Add JSON Output Format

  1. Changes
    - Update `document_templates.output_format` constraint to include 'json'
  
  2. Details
    - Drop existing CHECK constraint on document_templates.output_format
    - Add new CHECK constraint including 'json' option
    - Adds support for JSON format in document generation for structured data
*/

-- Drop the existing constraint on document_templates
ALTER TABLE document_templates
DROP CONSTRAINT IF EXISTS document_templates_output_format_check;

-- Add new constraint with JSON support
ALTER TABLE document_templates
ADD CONSTRAINT document_templates_output_format_check 
CHECK (output_format IN ('markdown', 'docx', 'txt', 'pdf', 'csv', 'json'));