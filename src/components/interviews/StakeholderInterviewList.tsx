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
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Mail,
  Briefcase,
  CircleDot,
  ArrowRight,
  Link2,
  TrendingUp,
  Activity
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
  const [isExpanded, setIsExpanded] = useState(sessions.length <= 1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInterviewName, setNewInterviewName] = useState('');
  const [newInterviewType, setNewInterviewType] = useState('kickoff');
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

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
      case 'in_progress': return Activity;
      case 'pending': return Clock;
      default: return CircleDot;
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'completed':
        return isDark
          ? 'from-green-900/30 to-emerald-900/30 border-green-500/40'
          : 'from-green-50 to-emerald-50 border-green-200';
      case 'in_progress':
        return isDark
          ? 'from-blue-900/30 to-indigo-900/30 border-blue-500/40'
          : 'from-blue-50 to-indigo-50 border-blue-200';
      case 'pending':
        return isDark
          ? 'from-yellow-900/30 to-orange-900/30 border-yellow-500/40'
          : 'from-yellow-50 to-orange-50 border-yellow-200';
      default:
        return isDark
          ? 'from-gray-800 to-gray-900 border-gray-700'
          : 'from-gray-50 to-gray-100 border-gray-200';
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

  // Calculate aggregate metrics
  const totalQuestions = sessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
  const answeredQuestions = sessions.reduce((sum, s) => sum + (s.answered_questions || 0), 0);
  const avgProgress = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / sessions.length)
    : 0;
  const completedCount = sessions.filter(s => s.status === 'completed').length;

  return (
    <>
      {/* Main Stakeholder Card with Glassmorphic Design */}
      <div
        className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
          isExpanded ? 'shadow-lg' : 'shadow-md hover:shadow-xl'
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`
        }}
      >
        {/* Animated Background Gradient */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)'
          }}
        />

        {/* Header Section */}
        <div className="p-5">
          <div className="flex items-center gap-4">
            {/* Expand/Collapse Button - Clickable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-50'
              } shadow-sm hover:shadow-md`}
            >
              {isExpanded ? (
                <ChevronUp className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              ) : (
                <ChevronDown className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              )}
            </button>

            {/* Avatar with Status Indicator - Clickable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="relative flex-shrink-0"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105`}
                style={{
                  background: isDark ? '#1e40af' : '#3b82f6'
                }}
              >
                <User className="h-7 w-7 text-white" />
              </div>
              {sessions.length > 0 && (
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 ${
                  isDark ? 'border-gray-800' : 'border-white'
                } ${
                  completedCount === sessions.length
                    ? 'bg-green-500'
                    : completedCount > 0
                    ? 'bg-blue-500'
                    : 'bg-yellow-500'
                }`} />
              )}
            </button>

            {/* Stakeholder Info - Clickable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className={`text-lg font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stakeholder.name}
                </h4>
                {completedCount === sessions.length && sessions.length > 0 && (
                  <Badge variant="success" className="text-xs flex-shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Complete
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Briefcase className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stakeholder.role}
                  </span>
                </div>
                {stakeholder.department && (
                  <>
                    <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
                    <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stakeholder.department}
                    </span>
                  </>
                )}
              </div>

              {stakeholder.email && (
                <div className="flex items-center gap-1.5 mt-1 text-xs">
                  <Mail className={`h-3 w-3 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <span className={`truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {stakeholder.email}
                  </span>
                </div>
              )}
            </button>

            {/* Quick Stats Cards - Desktop only */}
            <div className="hidden xl:flex items-center gap-3 flex-shrink-0">
              {/* Interviews Count */}
              <div className={`px-3 py-2 rounded-xl ${
                isDark ? 'bg-gray-800/50' : 'bg-white/80'
              } shadow-sm`}>
                <div className="flex items-center gap-2">
                  <MessageSquare className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div className="text-center">
                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {sessions.length}
                    </div>
                    <div className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Interview{sessions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className={`px-3 py-2 rounded-xl ${
                isDark ? 'bg-gray-800/50' : 'bg-white/80'
              } shadow-sm`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${
                    avgProgress === 100 ? (isDark ? 'text-green-400' : 'text-green-600') :
                    avgProgress > 0 ? (isDark ? 'text-blue-400' : 'text-blue-600') :
                    (isDark ? 'text-gray-500' : 'text-gray-400')
                  }`} />
                  <div className="text-center">
                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {avgProgress}%
                    </div>
                    <div className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Avg Progress
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button - Always visible */}
            <div className="flex-shrink-0">
              <Button
                size="sm"
                icon={Plus}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="whitespace-nowrap"
              >
                <span className="hidden sm:inline">New Interview</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          {/* Mobile Stats (shown when collapsed) */}
          {!isExpanded && (
            <div className="lg:hidden mt-4 flex gap-2">
              <div className={`flex-1 px-3 py-2 rounded-lg ${
                isDark ? 'bg-gray-800/50' : 'bg-white/80'
              }`}>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-0.5`}>Interviews</div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {sessions.length}
                </div>
              </div>
              <div className={`flex-1 px-3 py-2 rounded-lg ${
                isDark ? 'bg-gray-800/50' : 'bg-white/80'
              }`}>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-0.5`}>Progress</div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {avgProgress}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Sessions List */}
        {isExpanded && (
          <div className={`px-5 pb-5 space-y-3 border-t ${
            isDark ? 'border-gray-700/50' : 'border-gray-200/50'
          }`}>
            <div className="pt-4" />

            {sortedSessions.length === 0 ? (
              <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50/50'
              }`}>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <MessageSquare className={`h-8 w-8 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                </div>
                <h5 className={`text-base font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  No interviews yet
                </h5>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Create your first interview to get started
                </p>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowCreateModal(true)}
                  className="shadow-md"
                >
                  Create First Interview
                </Button>
              </div>
            ) : (
              sortedSessions.map((session, index) => {
                const StatusIcon = getStatusIcon(session.status);
                const isLatest = index === 0;
                const isHovered = hoveredSession === session.id;

                return (
                  <div
                    key={session.id}
                    onMouseEnter={() => setHoveredSession(session.id)}
                    onMouseLeave={() => setHoveredSession(null)}
                    className={`relative rounded-xl border transition-all duration-300 ${
                      isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-sm'
                    } bg-gradient-to-br ${getStatusGradient(session.status)}`}
                  >
                    {/* Latest Badge Ribbon */}
                    {isLatest && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="relative">
                          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <CircleDot className="h-3 w-3" />
                            Latest
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Session Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className={`text-base font-semibold ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                              {session.interview_name || `Interview ${sortedSessions.length - index}`}
                            </h5>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {session.interview_type && (
                              <Badge variant="default" className="text-xs">
                                {session.interview_type.replace('_', ' ')}
                              </Badge>
                            )}

                            <Badge variant={getStatusColor(session.status)} className="text-xs">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {session.status.replace('_', ' ')}
                            </Badge>

                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className={`h-3 w-3 ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {new Date(session.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className={`flex gap-1.5 ml-4 flex-shrink-0 transition-opacity duration-200 ${
                          isHovered ? 'opacity-100' : 'opacity-70'
                        }`}>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={MessageSquare}
                            onClick={() => onAssignQuestions(stakeholder, session)}
                            className="shadow-sm hover:shadow-md flex-shrink-0"
                            title="Assign Questions"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            icon={ExternalLink}
                            onClick={() => onViewSession(session)}
                            className="shadow-sm hover:shadow-md flex-shrink-0"
                            title="View Details"
                          />
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Progress
                          </span>
                          <span className={`text-xs ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {session.answered_questions || 0} / {session.total_questions || 0} questions
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative">
                          <div className={`h-2.5 rounded-full overflow-hidden ${
                            isDark ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                session.completion_percentage === 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : session.completion_percentage > 0
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  : 'bg-gray-400'
                              }`}
                              style={{
                                width: `${session.completion_percentage || 0}%`,
                                boxShadow: session.completion_percentage > 0
                                  ? '0 0 10px rgba(59, 130, 246, 0.4)'
                                  : 'none'
                              }}
                            >
                              {session.completion_percentage > 10 && (
                                <div className="h-full w-full animate-pulse bg-white/20" />
                              )}
                            </div>
                          </div>

                          {/* Percentage Badge */}
                          <div className={`absolute -top-8 right-0 px-2 py-1 rounded-md text-xs font-bold ${
                            session.completion_percentage === 100
                              ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                              : session.completion_percentage > 0
                              ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {session.completion_percentage || 0}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Border */}
                    {isHovered && (
                      <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          boxShadow: isDark
                            ? '0 0 20px rgba(59, 130, 246, 0.3)'
                            : '0 0 20px rgba(59, 130, 246, 0.2)'
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Create New Interview Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewInterviewName('');
          setNewInterviewType('kickoff');
        }}
        title={`Create New Interview`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Stakeholder Info Header */}
          <div className={`p-4 rounded-xl ${
            isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                  {stakeholder.name}
                </h4>
                <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                  {stakeholder.role} • {stakeholder.department}
                </p>
              </div>
            </div>
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

          <div className={`p-4 rounded-xl ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <h5 className={`font-medium mb-3 flex items-center gap-2 ${
              isDark ? 'text-gray-300' : 'text-gray-900'
            }`}>
              <ArrowRight className="h-4 w-4" />
              What happens next?
            </h5>
            <ul className={`text-sm space-y-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>A new interview session with unique link will be created</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You can assign specific questions to this interview</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Stakeholder responses are tracked separately per interview</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>All past interviews remain accessible in the history</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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
