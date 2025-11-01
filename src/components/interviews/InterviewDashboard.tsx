import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  Play,
  ExternalLink,
  Plus,
  FileText,
  Upload,
  Video,
  Mic,
  Eye
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Project } from '../../hooks/useSupabaseData';
import { InterviewSession } from '../../hooks/useInterviews';
import { useTheme } from '../../contexts/ThemeContext';
import { StakeholderInterviewList } from './StakeholderInterviewList';
// Note: We no longer use the old URL format

interface InterviewDashboardProps {
  project: Project | null;
  stakeholders: any[];
  questions: any[];
  interviewSessions: InterviewSession[];
  onAssignQuestions: (stakeholder: any, session?: InterviewSession) => void;
  onAnswerQuestions: (stakeholder: any) => void;
  onCreateSession: (stakeholder: any, interviewName?: string, interviewType?: string) => void;
  onRefresh: () => void;
}

export const InterviewDashboard: React.FC<InterviewDashboardProps> = ({
  project,
  stakeholders,
  questions,
  interviewSessions,
  onAssignQuestions,
  onAnswerQuestions,
  onCreateSession,
  onRefresh
}) => {
  const { isDark } = useTheme();
  const [showInterviewLinkModal, setShowInterviewLinkModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);

  // Get all sessions for a stakeholder
  const getStakeholderSessions = (stakeholderId: string): InterviewSession[] => {
    return interviewSessions.filter(session => session.stakeholder_id === stakeholderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Generate interview link using session token
  const generateInterviewLink = (sessionToken: string, password?: string) => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5173'
      : 'https://interviews.speakprojects.com';
    return `${baseUrl}/i/${sessionToken}${password ? `?pwd=${password}` : ''}`;
  };

  const copyInterviewLink = (session: InterviewSession, password?: string) => {
    if (!session.session_token) {
      alert('This session does not have a token yet. Please refresh and try again.');
      return;
    }
    const link = generateInterviewLink(session.session_token, password);
    navigator.clipboard.writeText(link);
    alert('Interview link copied to clipboard!');
  };

  const handleViewSession = (session: InterviewSession) => {
    setSelectedSession(session);
    setShowInterviewLinkModal(true);
  };

  const overallProgress = stakeholders.length > 0 
    ? Math.round(interviewSessions.reduce((sum, session) => sum + session.completion_percentage, 0) / stakeholders.length)
    : 0;

  const completedInterviews = interviewSessions.filter(s => s.status === 'completed').length;
  const inProgressInterviews = interviewSessions.filter(s => s.status === 'in_progress').length;

  return (
    <div className="p-6 space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedInterviews}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressInterviews}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Stakeholder Interview Status */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Interview Progress</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {stakeholders.map((stakeholder) => {
            const sessions = getStakeholderSessions(stakeholder.id);

            return (
              <StakeholderInterviewList
                key={stakeholder.id}
                stakeholder={stakeholder}
                sessions={sessions}
                onCreateNewInterview={(stk, name, type) => onCreateSession(stk, name, type)}
                onAssignQuestions={onAssignQuestions}
                onViewSession={handleViewSession}
              />
            );
          })}
        </div>

        {stakeholders.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No stakeholders yet</h4>
            <p className="text-gray-600">Add stakeholders to start conducting interviews</p>
          </div>
        )}
      </Card>

      {/* Interview Session Details Modal */}
      <Modal
        isOpen={showInterviewLinkModal}
        onClose={() => {
          setShowInterviewLinkModal(false);
          setSelectedSession(null);
        }}
        title={`Interview Link - ${selectedSession?.stakeholder?.name}`}
        size="lg"
      >
        {selectedSession && (
          <div className="space-y-6">
            {/* Stakeholder Info */}
            <Card className={`${
              isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${
                    isDark ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    {selectedSession.stakeholder?.name}
                  </h4>
                  <p className={`text-sm ${
                    isDark ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    {selectedSession.stakeholder?.role} • {selectedSession.stakeholder?.department}
                  </p>
                  <p className={`text-xs ${
                    isDark ? 'text-blue-200' : 'text-blue-600'
                  }`}>
                    {selectedSession.stakeholder?.email}
                  </p>
                </div>
                <Badge variant={getStatusColor(selectedSession.status)}>
                  {selectedSession.status.replace('_', ' ')}
                </Badge>
              </div>
            </Card>

            {/* Session Info */}
            <Card className={`${
              isDark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${
                    isDark ? 'text-green-300' : 'text-green-900'
                  }`}>Session Details</h4>
                  <p className={`text-sm ${
                    isDark ? 'text-green-200' : 'text-green-700'
                  }`}>
                    Status: {selectedSession.status} • Progress: {selectedSession.completion_percentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    isDark ? 'text-green-300' : 'text-green-900'
                  }`}>
                    {selectedSession.completion_percentage}%
                  </p>
                  <p className={`text-xs ${
                    isDark ? 'text-green-200' : 'text-green-700'
                  }`}>
                    Complete
                  </p>
                </div>
              </div>
            </Card>

            {/* Interview Password */}
            <div className="space-y-4">
              <h4 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Interview Password</h4>
              <div className="flex items-center space-x-3">
                <Input
                  value={stakeholders.find(s => s.id === selectedSession.stakeholder_id)?.interview_password || 'Loading...'}
                  readOnly
                  className="flex-1 font-mono text-lg text-center"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const password = stakeholders.find(s => s.id === selectedSession.stakeholder_id)?.interview_password;
                    if (password) {
                      navigator.clipboard.writeText(password);
                      alert('Password copied to clipboard!');
                    }
                  }}
                >
                  Copy Password
                </Button>
              </div>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Share this password with the stakeholder along with the interview link
              </p>
            </div>

            {/* Interview Link */}
            <div className="space-y-4">
              <h4 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Interview Link</h4>
              <div className="flex items-center space-x-3">
                <Input
                  value={selectedSession.session_token ? generateInterviewLink(selectedSession.session_token, stakeholders.find(s => s.id === selectedSession.stakeholder_id)?.interview_password) : 'Generating token...'}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => copyInterviewLink(selectedSession, stakeholders.find(s => s.id === selectedSession.stakeholder_id)?.interview_password)}
                  disabled={!selectedSession.session_token}
                >
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  icon={ExternalLink}
                  onClick={() => selectedSession.session_token && window.open(generateInterviewLink(selectedSession.session_token, stakeholders.find(s => s.id === selectedSession.stakeholder_id)?.interview_password), '_blank')}
                  disabled={!selectedSession.session_token}
                >
                  Open
                </Button>
              </div>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Share this link and password with the stakeholder to conduct their interview
              </p>
            </div>

            {/* Progress Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Progress Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{selectedSession.answered_questions}</p>
                  <p className="text-sm text-gray-600">Answered</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{selectedSession.total_questions}</p>
                  <p className="text-sm text-gray-600">Total Questions</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInterviewLinkModal(false);
                  setSelectedSession(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => onAnswerQuestions(selectedSession.stakeholder)}
              >
                Answer Questions
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};