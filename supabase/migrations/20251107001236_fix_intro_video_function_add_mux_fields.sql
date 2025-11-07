/*
  # Fix Intro Video Function - Add Mux Fields
  
  Updates the get_intro_video_for_session function to return Mux playback fields
  that are needed for HLS video streaming.
  
  ## Changes
  
  1. Add mux_playback_id, mux_asset_id, and mux_status to function return type
  2. Update all SELECT statements in the function to include these fields
  
  This ensures the frontend can properly initialize HLS.js for Mux-transcoded videos.
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_intro_video_for_session(uuid);

-- Recreate with additional Mux fields
CREATE OR REPLACE FUNCTION get_intro_video_for_session(session_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  video_url text,
  video_type text,
  assignment_level text,
  mux_playback_id text,
  mux_asset_id text,
  mux_status text
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
    'session'::text as assignment_level,
    v.mux_playback_id,
    v.mux_asset_id,
    v.mux_status
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
    'stakeholder'::text as assignment_level,
    v.mux_playback_id,
    v.mux_asset_id,
    v.mux_status
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
    'project'::text as assignment_level,
    v.mux_playback_id,
    v.mux_asset_id,
    v.mux_status
  FROM project_intro_videos v
  INNER JOIN interview_sessions s ON v.project_id = s.project_id
  WHERE s.id = session_id
    AND v.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_intro_video_for_session IS 'Returns the most appropriate intro video for a session with Mux streaming fields (session > stakeholder > project active)';
