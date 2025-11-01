/*
  # Fix Notification Triggers User ID Issue

  1. Database Functions
    - Update trigger functions to properly handle user_id
    - Add fallback logic for when auth.uid() is not available
    - Use project owner as notification recipient

  2. Security
    - Maintain RLS policies
    - Ensure proper user context
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_notify_project_update ON projects;
DROP TRIGGER IF EXISTS trigger_notify_stakeholder_response ON stakeholders;

-- Drop existing functions
DROP FUNCTION IF EXISTS notify_on_project_update();
DROP FUNCTION IF EXISTS notify_on_stakeholder_response();

-- Create improved project update notification function
CREATE OR REPLACE FUNCTION notify_on_project_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    project_owner_id uuid;
    notification_user_id uuid;
BEGIN
    -- Get the project owner from the agency_id (which should be user_id)
    -- First try to get from auth context
    notification_user_id := auth.uid();
    
    -- If no auth context, use the agency_id as user_id (assuming agency_id is user_id)
    IF notification_user_id IS NULL THEN
        notification_user_id := NEW.agency_id::uuid;
    END IF;
    
    -- Only create notification if we have a valid user_id and status actually changed
    IF notification_user_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            notification_user_id,
            'project_update',
            'Project Status Updated',
            'Project "' || NEW.name || '" status changed to ' || NEW.status,
            jsonb_build_object(
                'project_id', NEW.id,
                'project_name', NEW.name,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create improved stakeholder response notification function
CREATE OR REPLACE FUNCTION notify_on_stakeholder_response()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    project_owner_id uuid;
    project_name text;
    notification_user_id uuid;
BEGIN
    -- Only notify when status changes to 'responded' or 'completed'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('responded', 'completed') THEN
        -- Get project details and owner
        SELECT p.name, p.agency_id::uuid
        INTO project_name, project_owner_id
        FROM projects p
        WHERE p.id = NEW.project_id;
        
        -- Use project owner as notification recipient
        notification_user_id := project_owner_id;
        
        -- Only create notification if we have a valid user_id
        IF notification_user_id IS NOT NULL THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                data
            ) VALUES (
                notification_user_id,
                'stakeholder_response',
                'Stakeholder Response Received',
                NEW.name || ' has ' || NEW.status || ' for project "' || project_name || '"',
                jsonb_build_object(
                    'project_id', NEW.project_id,
                    'project_name', project_name,
                    'stakeholder_id', NEW.id,
                    'stakeholder_name', NEW.name,
                    'status', NEW.status
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_notify_project_update
    AFTER UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_project_update();

CREATE TRIGGER trigger_notify_stakeholder_response
    AFTER UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_stakeholder_response();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_on_project_update() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_stakeholder_response() TO authenticated;