/*
  # Add CSV Output Format

  1. Changes
    - Update `document_templates.output_format` constraint to include 'csv'
    - Update `document_run_files.file_type` to support 'csv' files
  
  2. Details
    - Drop existing CHECK constraint on document_templates.output_format
    - Add new CHECK constraint including 'csv' option
    - Adds support for CSV format in document generation
*/

-- Drop the existing constraint on document_templates
ALTER TABLE document_templates
DROP CONSTRAINT IF EXISTS document_templates_output_format_check;

-- Add new constraint with CSV support
ALTER TABLE document_templates
ADD CONSTRAINT document_templates_output_format_check 
CHECK (output_format IN ('markdown', 'docx', 'txt', 'pdf', 'csv'));