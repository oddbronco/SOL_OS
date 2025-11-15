/*
  # Add File Content Extraction System

  1. Schema Changes
    - Add `extracted_content` column to `project_uploads` for storing text content
    - Add `extraction_status` to track processing state (pending, processing, completed, failed)
    - Add `extraction_error` to store error messages if extraction fails
    - Add `content_type` to distinguish between text, video_transcript, audio_transcript, etc.
    - Add `word_count` for quick content size reference
    
  2. Purpose
    - Enable full-text extraction from all uploaded files
    - Store video/audio transcripts for LLM context
    - Make file content searchable and includable in document generation
    
  3. Processing Flow
    - Files uploaded → extraction_status = 'pending'
    - Edge function processes file → extracts text/transcribes media
    - Content stored in extracted_content → extraction_status = 'completed'
    - Available for {{uploads}} variable in document generation
*/

-- Add content extraction columns to project_uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_uploads' AND column_name = 'extracted_content'
  ) THEN
    ALTER TABLE project_uploads ADD COLUMN extracted_content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_uploads' AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE project_uploads ADD COLUMN extraction_status text DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'not_applicable'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_uploads' AND column_name = 'extraction_error'
  ) THEN
    ALTER TABLE project_uploads ADD COLUMN extraction_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_uploads' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE project_uploads ADD COLUMN content_type text CHECK (content_type IN ('text', 'video_transcript', 'audio_transcript', 'image_ocr', 'structured_data', 'binary'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_uploads' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE project_uploads ADD COLUMN word_count integer DEFAULT 0;
  END IF;
END $$;

-- Create index for fast content queries
CREATE INDEX IF NOT EXISTS idx_project_uploads_extraction_status 
  ON project_uploads(extraction_status);

CREATE INDEX IF NOT EXISTS idx_project_uploads_content_type 
  ON project_uploads(content_type);

-- Create full-text search index on extracted content
CREATE INDEX IF NOT EXISTS idx_project_uploads_content_search 
  ON project_uploads USING gin(to_tsvector('english', COALESCE(extracted_content, '')));

-- Function to auto-update word count when content changes
CREATE OR REPLACE FUNCTION update_upload_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.extracted_content IS NOT NULL THEN
    NEW.word_count := array_length(regexp_split_to_array(trim(NEW.extracted_content), '\s+'), 1);
  ELSE
    NEW.word_count := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain word count
DROP TRIGGER IF EXISTS trigger_update_upload_word_count ON project_uploads;
CREATE TRIGGER trigger_update_upload_word_count
  BEFORE INSERT OR UPDATE OF extracted_content
  ON project_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_word_count();

COMMENT ON COLUMN project_uploads.extracted_content IS 'Full text content extracted from the file (text, transcript, OCR, etc.)';
COMMENT ON COLUMN project_uploads.extraction_status IS 'Status of content extraction: pending, processing, completed, failed, not_applicable';
COMMENT ON COLUMN project_uploads.content_type IS 'Type of extracted content: text, video_transcript, audio_transcript, image_ocr, structured_data, binary';
COMMENT ON COLUMN project_uploads.word_count IS 'Number of words in extracted_content (auto-calculated)';
