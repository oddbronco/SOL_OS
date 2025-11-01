/*
  # Create Storage Bucket for Interview Files

  1. Storage Setup
    - Create `interview-files` bucket for audio/video uploads
    - Enable public access for file sharing
    - Set appropriate file size and type limits

  2. Security
    - Allow authenticated users to upload files
    - Enable public read access for interview links
    - Set file size limits and allowed mime types
*/

-- Create the interview-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-files',
  'interview-files', 
  true,
  52428800, -- 50MB limit
  ARRAY[
    'audio/webm',
    'audio/mp4', 
    'audio/mpeg',
    'audio/wav',
    'video/webm',
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for interview files
CREATE POLICY "Authenticated users can upload interview files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'interview-files');

CREATE POLICY "Public read access for interview files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'interview-files');

CREATE POLICY "Users can update their own interview files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'interview-files');

CREATE POLICY "Users can delete their own interview files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'interview-files');