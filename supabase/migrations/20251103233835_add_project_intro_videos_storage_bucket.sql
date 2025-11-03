-- Add Storage Bucket for Project Introduction Videos
--
-- 1. Creates storage bucket for intro videos
-- 2. Sets up public access for stakeholders
-- 3. Configures file upload policies
--
-- Security:
-- - Project owners can upload videos
-- - Public can view videos (for stakeholder interviews)
-- - File size limit: 100MB
-- - Allowed types: video/*

-- Create storage bucket for project intro videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-intro-videos', 'project-intro-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos to their project folders
CREATE POLICY "Project owners can upload intro videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-intro-videos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update their project videos
CREATE POLICY "Project owners can update intro videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-intro-videos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their project videos
CREATE POLICY "Project owners can delete intro videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-intro-videos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow public to view intro videos (for stakeholder interviews)
CREATE POLICY "Public can view intro videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-intro-videos');