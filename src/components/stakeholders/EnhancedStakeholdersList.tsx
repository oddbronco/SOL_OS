import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Edit,
  Eye,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Phone
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status?: string;
  phone?: string;
  location?: string;
  [key: string]: any;
}

interface InterviewSession {
  stakeholder_id: string;
  status: string;
  completion_percentage: number;
  [key: string]: any;
}

interface EnhancedStakeholdersListProps {
  stakeholders: Stakeholder[];
  interviewSessions: InterviewSession[];
  onEditStakeholder: (stakeholder: Stakeholder) => void;
  onViewInterview: (stakeholder: Stakeholder) => void;
}

export const EnhancedStakeholdersList: React.FC<EnhancedStakeholdersListProps> = ({
  stakeholders,
  interviewSessions,
  onEditStakeholder,
  onViewInterview
}) => {
  const { isDark } = useTheme();
  const [hoveredStakeholder, setHoveredStakeholder] = useState<string | null>(null);

  const getStakeholderStats = (stakeholder: Stakeholder) => {
    const sessions = interviewSessions.filter(s => s.stakeholder_id === stakeholder.id);
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const inProgressSessions = sessions.filter(s => s.status === 'in_progress').length;
    const avgProgress = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / sessions.length)
      : 0;

    let statusVariant: 'default' | 'warning' | 'info' | 'success' = 'default';
    let statusText = '';
    let statusIcon = Clock;

    if (sessions.length === 0) {
      statusVariant = 'default';
      statusText = 'No Interviews';
      statusIcon = Clock;
    } else if (completedSessions === sessions.length) {
      statusVariant = 'success';
      statusText = 'Complete';
      statusIcon = CheckCircle;
    } else if (inProgressSessions > 0 || completedSessions > 0) {
      statusVariant = 'info';
      statusText = 'In Progress';
      statusIcon = Activity;
    } else {
      statusVariant = 'warning';
      statusText = 'Pending';
      statusIcon = Clock;
    }

    return {
      totalSessions: sessions.length,
      completedSessions,
      inProgressSessions,
      avgProgress,
      statusVariant,
      statusText,
      statusIcon
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stakeholders.map((stakeholder) => {
        const stats = getStakeholderStats(stakeholder);
        const StatusIcon = stats.statusIcon;
        const isHovered = hoveredStakeholder === stakeholder.id;

        return (
          <div
            key={stakeholder.id}
            onMouseEnter={() => setHoveredStakeholder(stakeholder.id)}
            onMouseLeave={() => setHoveredStakeholder(null)}
            className={`rounded-xl border transition-all duration-300 overflow-hidden ${
              isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-md'
            } ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Header with Avatar */}
            <div className={`p-5 pb-4 border-b ${
              isDark ? 'border-gray-700' : 'border-gray-100'
            }`}>
              <div className="flex items-start gap-4 mb-3">
                {/* Simple Avatar */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                }`}>
                  <User className={`h-7 w-7 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-semibold mb-1.5 truncate ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stakeholder.name}
                  </h4>

                  <Badge variant={stats.statusVariant} className="text-xs">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {stats.statusText}
                  </Badge>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className={`h-3.5 w-3.5 flex-shrink-0 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm truncate ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {stakeholder.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm truncate ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {stakeholder.department}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className={`h-3.5 w-3.5 flex-shrink-0 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm truncate ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stakeholder.email}
                  </span>
                </div>

                {stakeholder.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className={`h-3.5 w-3.5 flex-shrink-0 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm truncate ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {stakeholder.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Interviews Count */}
                <div className="text-center">
                  <MessageSquare className={`h-5 w-5 mx-auto mb-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <div className={`text-lg font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.totalSessions}
                  </div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Interviews
                  </div>
                </div>

                {/* Completed Count */}
                <div className="text-center">
                  <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${
                    stats.completedSessions > 0
                      ? 'text-green-500'
                      : isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-lg font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.completedSessions}
                  </div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Complete
                  </div>
                </div>

                {/* Progress */}
                <div className="text-center">
                  <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${
                    stats.avgProgress === 100
                      ? 'text-green-500'
                      : stats.avgProgress > 0
                      ? isDark ? 'text-blue-400' : 'text-blue-600'
                      : isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-lg font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.avgProgress}%
                  </div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Progress
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {stats.totalSessions > 0 && (
                <div className="mb-4">
                  <div className={`h-1.5 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.avgProgress === 100
                          ? 'bg-green-500'
                          : stats.avgProgress > 0
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${stats.avgProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => onEditStakeholder(stakeholder)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Eye}
                  onClick={() => onViewInterview(stakeholder)}
                  className="flex-1"
                >
                  Interviews
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
