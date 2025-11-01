/*
  # Add Multiple Output Format Support to Document Templates

  1. Changes
    - Add `supported_formats` column as TEXT[] to store multiple format options
    - Migrate existing `output_format` values to `supported_formats` array
    - Keep `output_format` as the default/primary format for backward compatibility

  2. Notes
    - Templates can now specify which output formats they support
    - Generation UI will only show formats that the template supports
    - Default to all formats if none specified for backward compatibility
*/

-- Add supported_formats column
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS supported_formats TEXT[];

-- Migrate existing output_format to supported_formats array
UPDATE document_templates 
SET supported_formats = ARRAY[output_format]
WHERE supported_formats IS NULL AND output_format IS NOT NULL;

-- Set default to all formats for templates without specified format
UPDATE document_templates 
SET supported_formats = ARRAY['markdown', 'txt', 'pdf', 'docx', 'csv', 'json']
WHERE supported_formats IS NULL OR array_length(supported_formats, 1) IS NULL;
