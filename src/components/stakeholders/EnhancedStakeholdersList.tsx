import React, { useState } from 'react';
import { Card } from '../ui/Card';
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
  Phone,
  MapPin
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
      statusText = 'All Complete';
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

  const getStatusGradient = (statusVariant: string) => {
    switch (statusVariant) {
      case 'success':
        return isDark
          ? 'from-green-900/20 to-emerald-900/20 border-green-500/30'
          : 'from-green-50 to-emerald-50 border-green-200';
      case 'info':
        return isDark
          ? 'from-blue-900/20 to-indigo-900/20 border-blue-500/30'
          : 'from-blue-50 to-indigo-50 border-blue-200';
      case 'warning':
        return isDark
          ? 'from-yellow-900/20 to-orange-900/20 border-yellow-500/30'
          : 'from-yellow-50 to-orange-50 border-yellow-200';
      default:
        return isDark
          ? 'from-gray-800/50 to-gray-900/50 border-gray-700'
          : 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stakeholders.map((stakeholder, index) => {
        const stats = getStakeholderStats(stakeholder);
        const StatusIcon = stats.statusIcon;
        const isHovered = hoveredStakeholder === stakeholder.id;

        return (
          <div
            key={stakeholder.id}
            onMouseEnter={() => setHoveredStakeholder(stakeholder.id)}
            onMouseLeave={() => setHoveredStakeholder(null)}
            className={`rounded-xl border transition-all duration-300 ${
              isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-md'
            } bg-gradient-to-br ${getStatusGradient(stats.statusVariant)} overflow-hidden`}
          >
            {/* Header with Avatar */}
            <div className={`p-5 pb-4 ${
              isDark ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50' : 'bg-white/50'
            }`}>
              <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{
                    background: getAvatarGradient(index)
                  }}
                >
                  <User className="h-8 w-8 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-lg font-semibold mb-1 truncate ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stakeholder.name}
                  </h4>

                  <Badge variant={stats.statusVariant} className="text-xs mb-2">
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
            <div className="p-5 pt-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Interviews Count */}
                <div className={`text-center p-3 rounded-xl ${
                  isDark ? 'bg-gray-800/50' : 'bg-white/80'
                }`}>
                  <MessageSquare className={`h-5 w-5 mx-auto mb-1 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <div className={`text-xl font-bold ${
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
                <div className={`text-center p-3 rounded-xl ${
                  isDark ? 'bg-gray-800/50' : 'bg-white/80'
                }`}>
                  <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${
                    stats.completedSessions > 0
                      ? 'text-green-500'
                      : isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-xl font-bold ${
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
                <div className={`text-center p-3 rounded-xl ${
                  isDark ? 'bg-gray-800/50' : 'bg-white/80'
                }`}>
                  <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${
                    stats.avgProgress === 100
                      ? 'text-green-500'
                      : stats.avgProgress > 0
                      ? isDark ? 'text-blue-400' : 'text-blue-600'
                      : isDark ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-xl font-bold ${
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
                  <div className={`h-2 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.avgProgress === 100
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : stats.avgProgress > 0
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : 'bg-gray-400'
                      }`}
                      style={{
                        width: `${stats.avgProgress}%`,
                        boxShadow: stats.avgProgress > 0
                          ? '0 0 10px rgba(59, 130, 246, 0.4)'
                          : 'none'
                      }}
                    >
                      {stats.avgProgress > 10 && (
                        <div className="h-full w-full animate-pulse bg-white/20" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className={`flex gap-2 transition-opacity duration-200 ${
                isHovered ? 'opacity-100' : 'opacity-80'
              }`}>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => onEditStakeholder(stakeholder)}
                  className="flex-1 shadow-sm hover:shadow-md"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Eye}
                  onClick={() => onViewInterview(stakeholder)}
                  className="flex-1 shadow-sm hover:shadow-md"
                >
                  Interviews
                </Button>
              </div>
            </div>

            {/* Hover Effect */}
            {isHovered && (
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: isDark
                    ? '0 0 25px rgba(59, 130, 246, 0.25)'
                    : '0 0 25px rgba(59, 130, 246, 0.2)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
