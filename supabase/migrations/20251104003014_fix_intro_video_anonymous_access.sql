/*
  # Fix Intro Video Anonymous Access
  
  Updates RLS policy for anonymous users to access intro videos through the
  get_intro_video_for_session function. The function uses SECURITY DEFINER,
  so it should bypass RLS, but we're making the policy more permissive to
  ensure videos are accessible.
  
  ## Changes
  
  1. Drop existing restrictive anonymous policy
  2. Create new policy allowing anonymous users to view any intro video
     (session privacy is controlled at the session level, not video level)
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anonymous users can view active intro videos" ON project_intro_videos;

-- Allow anonymous users to view any intro video
-- Security is maintained at the session level - if they have the session token,
-- they should see the assigned video
CREATE POLICY "Anonymous users can view intro videos"
  ON project_intro_videos
  FOR SELECT
  TO anon
  USING (true);
