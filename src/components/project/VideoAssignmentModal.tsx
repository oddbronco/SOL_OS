import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { UserPlus, Users, Video as VideoIcon } from 'lucide-react';

interface VideoAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
  };
  projectId: string;
  stakeholders: Array<{ id: string; name: string; email: string }>;
  interviewSessions: Array<{ id: string; stakeholder_id: string; stakeholders: { name: string }; created_at: string }>;
  onAssignmentCreated: () => void;
}

export const VideoAssignmentModal: React.FC<VideoAssignmentModalProps> = ({
  isOpen,
  onClose,
  video,
  projectId,
  stakeholders,
  interviewSessions,
  onAssignmentCreated
}) => {
  const [assignmentType, setAssignmentType] = useState<'stakeholder' | 'session'>('stakeholder');
  const [selectedStakeholder, setSelectedStakeholder] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const assignment: any = {
        video_id: video.id,
        project_id: projectId,
        created_by: userData.user.id
      };

      if (assignmentType === 'stakeholder') {
        if (!selectedStakeholder) {
          setError('Please select a stakeholder');
          return;
        }
        assignment.stakeholder_id = selectedStakeholder;
      } else {
        if (!selectedSession) {
          setError('Please select an interview session');
          return;
        }
        assignment.interview_session_id = selectedSession;
      }

      const { error: insertError } = await supabase
        .from('intro_video_assignments')
        .insert(assignment);

      if (insertError) throw insertError;

      onAssignmentCreated();
      onClose();
      setSelectedStakeholder('');
      setSelectedSession('');
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setError(null);
        setSelectedStakeholder('');
        setSelectedSession('');
      }}
      title={`Assign "${video.title}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Card className="bg-red-50 border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </Card>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignment Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAssignmentType('stakeholder')}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                assignmentType === 'stakeholder'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Users className="h-6 w-6 mx-auto mb-2 text-gray-700" />
              <div className="font-medium text-sm">Stakeholder</div>
              <div className="text-xs text-gray-600 mt-1">All their interviews</div>
            </button>
            <button
              type="button"
              onClick={() => setAssignmentType('session')}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                assignmentType === 'session'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <VideoIcon className="h-6 w-6 mx-auto mb-2 text-gray-700" />
              <div className="font-medium text-sm">Specific Interview</div>
              <div className="text-xs text-gray-600 mt-1">One session only</div>
            </button>
          </div>
        </div>

        {assignmentType === 'stakeholder' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Stakeholder
            </label>
            <select
              value={selectedStakeholder}
              onChange={(e) => setSelectedStakeholder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Choose a stakeholder...</option>
              {stakeholders.map((stakeholder) => (
                <option key={stakeholder.id} value={stakeholder.id}>
                  {stakeholder.name} ({stakeholder.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This video will be shown in all interview sessions for this stakeholder
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Interview Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Choose an interview session...</option>
              {interviewSessions.map((session: any) => (
                <option key={session.id} value={session.id}>
                  {session.stakeholders?.name} - {new Date(session.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This video will be shown only in this specific interview session
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Assigning...' : 'Assign Video'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};