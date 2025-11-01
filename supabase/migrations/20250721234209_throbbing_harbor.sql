/*
  # Create notifications system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text, notification type)
      - `title` (text, notification title)
      - `message` (text, notification message)
      - `read` (boolean, read status)
      - `data` (jsonb, additional data)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `notifications` table
    - Add policies for users to manage their own notifications

  3. Functions
    - Function to create notifications
    - Trigger to auto-create notifications for certain events
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('stakeholder_response', 'project_update', 'system_alert', 'upgrade_request')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to notify project stakeholders
CREATE OR REPLACE FUNCTION notify_project_stakeholders(
  p_project_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify project owner
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    p.user_id,
    p_type,
    p_title,
    p_message,
    p_data || jsonb_build_object('projectId', p_project_id)
  FROM projects p
  WHERE p.id = p_project_id AND p.user_id IS NOT NULL;
  
  -- Could also notify agency members if needed
END;
$$;

-- Trigger function for stakeholder responses
CREATE OR REPLACE FUNCTION notify_on_stakeholder_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification when stakeholder status changes to 'responded' or 'completed'
  IF NEW.status IN ('responded', 'completed') AND OLD.status != NEW.status THEN
    PERFORM notify_project_stakeholders(
      NEW.project_id,
      'stakeholder_response',
      'New Stakeholder Response',
      NEW.name || ' has submitted their response',
      jsonb_build_object(
        'stakeholderId', NEW.id,
        'stakeholderName', NEW.name,
        'status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for stakeholder responses
DROP TRIGGER IF EXISTS trigger_notify_stakeholder_response ON stakeholders;
CREATE TRIGGER trigger_notify_stakeholder_response
  AFTER UPDATE ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_stakeholder_response();

-- Trigger function for project updates
CREATE OR REPLACE FUNCTION notify_on_project_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification when project status changes
  IF NEW.status != OLD.status THEN
    PERFORM create_notification(
      NEW.user_id,
      'project_update',
      'Project Status Updated',
      'Project "' || NEW.name || '" status changed to ' || NEW.status,
      jsonb_build_object(
        'projectId', NEW.id,
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for project updates
DROP TRIGGER IF EXISTS trigger_notify_project_update ON projects;
CREATE TRIGGER trigger_notify_project_update
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_project_update();