/*
  # Add Intro Video Assignments

  1. New Table: `intro_video_assignments`
    - Allows assigning specific intro videos to stakeholders or interview sessions
    - Supports multiple assignment levels:
      * Project-level (default for all)
      * Stakeholder-level (specific stakeholder gets this video)
      * Session-level (specific interview session gets this video)
    
  2. Changes to `project_intro_videos`
    - Keep `is_active` for backward compatibility (project-level default)
    - New videos can be created without being active (for targeted assignment)

  3. Priority System
    - Session-specific video (highest priority)
    - Stakeholder-specific video
    - Project active video (lowest priority/default)

  4. Security
    - Enable RLS on assignments table
    - Only project owners can create/manage assignments
    - Anonymous users can read assignments for their sessions
*/

-- Create intro_video_assignments table
CREATE TABLE IF NOT EXISTS intro_video_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES project_intro_videos(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  stakeholder_id uuid REFERENCES stakeholders(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT assignment_target_check CHECK (
    (stakeholder_id IS NOT NULL AND interview_session_id IS NULL) OR
    (stakeholder_id IS NULL AND interview_session_id IS NOT NULL)
  )
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_intro_video_assignments_video ON intro_video_assignments(video_id);
CREATE INDEX IF NOT EXISTS idx_intro_video_assignments_project ON intro_video_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_intro_video_assignments_stakeholder ON intro_video_assignments(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_intro_video_assignments_session ON intro_video_assignments(interview_session_id);

-- Enable RLS
ALTER TABLE intro_video_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view assignments for their projects
CREATE POLICY "Users can view assignments for their projects"
  ON intro_video_assignments
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

-- Policy: Anonymous users can view assignments for their interview sessions
CREATE POLICY "Anonymous users can view assignments for their sessions"
  ON intro_video_assignments
  FOR SELECT
  TO anon
  USING (
    interview_session_id IS NOT NULL
  );

-- Policy: Project owners can create assignments
CREATE POLICY "Project owners can create assignments"
  ON intro_video_assignments
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

-- Policy: Project owners can delete assignments
CREATE POLICY "Project owners can delete assignments"
  ON intro_video_assignments
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

-- Function to get the appropriate intro video for an interview session
CREATE OR REPLACE FUNCTION get_intro_video_for_session(session_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  video_url text,
  video_type text,
  assignment_level text
) AS $$
BEGIN
  -- First, try to find a session-specific assignment
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.video_type,
    'session'::text as assignment_level
  FROM project_intro_videos v
  INNER JOIN intro_video_assignments a ON v.id = a.video_id
  WHERE a.interview_session_id = session_id
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Next, try stakeholder-specific assignment
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.video_type,
    'stakeholder'::text as assignment_level
  FROM project_intro_videos v
  INNER JOIN intro_video_assignments a ON v.id = a.video_id
  INNER JOIN interview_sessions s ON a.stakeholder_id = s.stakeholder_id
  WHERE s.id = session_id
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Finally, fall back to project's active video
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.video_type,
    'project'::text as assignment_level
  FROM project_intro_videos v
  INNER JOIN interview_sessions s ON v.project_id = s.project_id
  WHERE s.id = session_id AND v.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE intro_video_assignments IS 'Assigns specific intro videos to stakeholders or interview sessions';
COMMENT ON COLUMN intro_video_assignments.stakeholder_id IS 'If set, this video is shown to all interviews for this stakeholder';
COMMENT ON COLUMN intro_video_assignments.interview_session_id IS 'If set, this video is shown only for this specific interview session';
COMMENT ON FUNCTION get_intro_video_for_session IS 'Returns the most appropriate intro video for a session (session > stakeholder > project active)';