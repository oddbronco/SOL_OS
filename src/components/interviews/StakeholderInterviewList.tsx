import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  Plus,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  Clock,
  Play,
  History,
  Calendar,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { InterviewSession } from '../../hooks/useInterviews';
import { useTheme } from '../../contexts/ThemeContext';

interface StakeholderInterviewListProps {
  stakeholder: any;
  sessions: InterviewSession[];
  onCreateNewInterview: (stakeholder: any, interviewName: string, interviewType: string) => void;
  onAssignQuestions: (stakeholder: any, session: InterviewSession) => void;
  onViewSession: (session: InterviewSession) => void;
}

export const StakeholderInterviewList: React.FC<StakeholderInterviewListProps> = ({
  stakeholder,
  sessions,
  onCreateNewInterview,
  onAssignQuestions,
  onViewSession
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(sessions.length <= 1); // Auto-expand if only one or no sessions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInterviewName, setNewInterviewName] = useState('');
  const [newInterviewType, setNewInterviewType] = useState('kickoff');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Play;
      case 'pending': return Clock;
      default: return MessageSquare;
    }
  };

  const handleCreateInterview = () => {
    if (!newInterviewName.trim()) {
      alert('Please enter an interview name');
      return;
    }
    onCreateNewInterview(stakeholder, newInterviewName, newInterviewType);
    setShowCreateModal(false);
    setNewInterviewName('');
    setNewInterviewType('kickoff');
  };

  // Sort sessions by creation date, newest first
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const interviewTypeOptions = [
    { value: 'kickoff', label: 'Kickoff Interview' },
    { value: 'technical', label: 'Technical Deep Dive' },
    { value: 'followup', label: 'Follow-up Interview' },
    { value: 'change_request', label: 'Change Request' },
    { value: 'post_project', label: 'Post-Project Review' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
      <Card className={isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}>
        <div className="space-y-4">
          {/* Stakeholder Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1 rounded hover:bg-gray-100 ${isDark ? 'hover:bg-gray-700' : ''}`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>

              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stakeholder.name}
                </h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stakeholder.role} • {stakeholder.department}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {sessions.length} {sessions.length === 1 ? 'Interview' : 'Interviews'}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {sessions.filter(s => s.status === 'completed').length} completed
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => setShowCreateModal(true)}
                >
                  New Interview
                </Button>
              </div>
            </div>
          </div>

          {/* Interview Sessions List */}
          {isExpanded && (
            <div className="space-y-3 pl-9">
              {sortedSessions.length === 0 ? (
                <div className={`text-center py-6 border-2 border-dashed rounded-lg ${
                  isDark ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  <MessageSquare className={`h-8 w-8 mx-auto mb-2 ${
                    isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No interviews yet
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3"
                  >
                    Create First Interview
                  </Button>
                </div>
              ) : (
                sortedSessions.map((session, index) => {
                  const StatusIcon = getStatusIcon(session.status);
                  const isLatest = index === 0;

                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-4 ${
                        isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                      } ${isLatest ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {session.interview_name || `Interview ${index + 1}`}
                            </h5>

                            {session.interview_type && (
                              <Badge variant="info" className="text-xs">
                                {session.interview_type.replace('_', ' ')}
                              </Badge>
                            )}

                            <Badge variant={getStatusColor(session.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {session.status.replace('_', ' ')}
                            </Badge>

                            {isLatest && (
                              <Badge variant="success" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {new Date(session.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <MessageSquare className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {session.answered_questions || 0} / {session.total_questions || 0} questions
                              </span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${session.completion_percentage || 0}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {session.completion_percentage || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={MessageSquare}
                            onClick={() => onAssignQuestions(stakeholder, session)}
                          />

                          <Button
                            size="sm"
                            variant="outline"
                            icon={ExternalLink}
                            onClick={() => onViewSession(session)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Create New Interview Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewInterviewName('');
          setNewInterviewType('kickoff');
        }}
        title={`Create New Interview - ${stakeholder.name}`}
      >
        <div className="space-y-4">
          <div>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create a new interview session for this stakeholder. Each interview has its own unique link and tracks responses separately.
            </p>
          </div>

          <Input
            label="Interview Name"
            value={newInterviewName}
            onChange={(e) => setNewInterviewName(e.target.value)}
            placeholder="e.g., Initial Discovery, Follow-up Round 2"
            required
          />

          <Select
            label="Interview Type"
            value={newInterviewType}
            onChange={(e) => setNewInterviewType(e.target.value)}
            options={interviewTypeOptions}
          />

          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h5 className={`font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
              What happens next?
            </h5>
            <ul className={`text-sm space-y-1 list-disc list-inside ${
              isDark ? 'text-blue-200' : 'text-blue-700'
            }`}>
              <li>A new interview session with unique link will be created</li>
              <li>You can assign specific questions to this interview</li>
              <li>Stakeholder responses are tracked separately per interview</li>
              <li>All past interviews remain accessible in the history</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setNewInterviewName('');
                setNewInterviewType('kickoff');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInterview} icon={Plus}>
              Create Interview
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
