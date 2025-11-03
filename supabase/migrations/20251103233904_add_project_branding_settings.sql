-- Add Project Branding Settings
--
-- Adds branding columns to projects table:
-- - brand_logo_url: URL to uploaded logo
-- - brand_primary_color: Primary brand color (hex code)
-- - brand_secondary_color: Secondary brand color (hex code)
-- - brand_text_color: Text color for branded elements (hex code)
--
-- Creates storage bucket for project logos

-- Add branding columns to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'brand_logo_url'
  ) THEN
    ALTER TABLE projects ADD COLUMN brand_logo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'brand_primary_color'
  ) THEN
    ALTER TABLE projects ADD COLUMN brand_primary_color text DEFAULT '#3B82F6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'brand_secondary_color'
  ) THEN
    ALTER TABLE projects ADD COLUMN brand_secondary_color text DEFAULT '#10B981';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'brand_text_color'
  ) THEN
    ALTER TABLE projects ADD COLUMN brand_text_color text DEFAULT '#FFFFFF';
  END IF;
END $$;

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos to their project folders
CREATE POLICY "Project owners can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their project logos
CREATE POLICY "Project owners can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their project logos
CREATE POLICY "Project owners can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow public to view logos (for stakeholder interviews)
CREATE POLICY "Public can view project logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-logos');

-- Comments
COMMENT ON COLUMN projects.brand_logo_url IS 'URL to project logo for branded stakeholder experience';
COMMENT ON COLUMN projects.brand_primary_color IS 'Primary brand color in hex format (e.g., #3B82F6)';
COMMENT ON COLUMN projects.brand_secondary_color IS 'Secondary brand color in hex format';
COMMENT ON COLUMN projects.brand_text_color IS 'Text color for branded elements in hex format';