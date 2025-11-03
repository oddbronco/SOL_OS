/*
  # Add Project Introduction Videos

  1. New Table: `project_intro_videos`
    - `id` (uuid, primary key)
    - `project_id` (uuid, foreign key to projects)
    - `title` (text) - Name/title of the video
    - `description` (text) - Optional description
    - `video_url` (text) - URL to the video (uploaded to storage or external)
    - `video_type` (text) - 'upload' or 'external' (YouTube, Vimeo, etc.)
    - `duration_seconds` (integer) - Video duration
    - `thumbnail_url` (text) - Optional thumbnail image
    - `is_active` (boolean) - Whether this video is currently active
    - `created_by` (uuid, foreign key to users)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. New Columns in `interview_sessions`
    - `intro_video_watched` (boolean, default false) - Track if stakeholder watched intro
    - `intro_video_watched_at` (timestamptz) - When they watched it

  3. Security
    - Enable RLS on project_intro_videos table
    - Allow authenticated users to view videos for projects they own
    - Allow anonymous users to view videos (for stakeholder interviews)
    - Only project owners can create/update videos
*/

-- Create project_intro_videos table
CREATE TABLE IF NOT EXISTS project_intro_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'upload' CHECK (video_type IN ('upload', 'external')),
  duration_seconds integer,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_intro_videos_project ON project_intro_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_intro_videos_active ON project_intro_videos(project_id, is_active);

-- Add columns to interview_sessions for tracking video views
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'intro_video_watched'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN intro_video_watched boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_sessions' AND column_name = 'intro_video_watched_at'
  ) THEN
    ALTER TABLE interview_sessions ADD COLUMN intro_video_watched_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE project_intro_videos ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view videos for their projects
CREATE POLICY "Users can view intro videos for their projects"
  ON project_intro_videos
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Policy: Anonymous users can view active intro videos (for stakeholder interviews)
CREATE POLICY "Anonymous users can view active intro videos"
  ON project_intro_videos
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Policy: Project owners can insert intro videos
CREATE POLICY "Project owners can create intro videos"
  ON project_intro_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Policy: Project owners can update intro videos
CREATE POLICY "Project owners can update intro videos"
  ON project_intro_videos
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Policy: Project owners can delete intro videos
CREATE POLICY "Project owners can delete intro videos"
  ON project_intro_videos
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_intro_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS trigger_update_project_intro_videos_updated_at ON project_intro_videos;
CREATE TRIGGER trigger_update_project_intro_videos_updated_at
  BEFORE UPDATE ON project_intro_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_project_intro_videos_updated_at();

-- Comments for documentation
COMMENT ON TABLE project_intro_videos IS 'Stores introduction videos for projects that stakeholders see before interviews';
COMMENT ON COLUMN project_intro_videos.video_type IS 'Type of video: upload (stored in Supabase) or external (YouTube, Vimeo, etc.)';
COMMENT ON COLUMN project_intro_videos.is_active IS 'Only one video should be active per project at a time';
COMMENT ON COLUMN interview_sessions.intro_video_watched IS 'Tracks whether the stakeholder watched the intro video';
COMMENT ON COLUMN interview_sessions.intro_video_watched_at IS 'Timestamp when stakeholder watched the intro video';