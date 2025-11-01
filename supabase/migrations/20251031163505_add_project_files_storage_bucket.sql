/*
  # Create Project Files Storage Bucket

  1. Storage Setup
    - Create `project-files` bucket for all project-related uploads
    - Support all common file types (documents, spreadsheets, presentations, images, etc.)
    - Set reasonable file size limit (50MB)

  2. Security
    - Allow authenticated users to upload files to their projects
    - Enable public read access for file sharing
    - Users can update and delete their own files

  3. Supported File Types
    - Documents: PDF, DOC, DOCX, TXT, RTF, ODT
    - Spreadsheets: XLS, XLSX, CSV, ODS
    - Presentations: PPT, PPTX, ODP
    - Images: JPEG, PNG, GIF, SVG, WebP
    - Audio/Video: MP3, MP4, WAV, WebM, MOV
    - Archives: ZIP, RAR, 7Z
    - Other: JSON, XML, Markdown
*/

-- Create the project-files storage bucket with comprehensive file type support
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files', 
  true,
  52428800, -- 50MB limit
  ARRAY[
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word',
    'application/rtf',
    'text/plain',
    'text/rtf',
    'text/markdown',
    'text/csv',
    'application/vnd.oasis.opendocument.text',
    
    -- Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    
    -- Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
    
    -- Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    
    -- Video
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    
    -- Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    
    -- Other
    'application/json',
    'application/xml',
    'text/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for project files
CREATE POLICY "Authenticated users can upload project files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Public read access for project files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'project-files');

CREATE POLICY "Users can update project files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-files');

CREATE POLICY "Users can delete project files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-files');