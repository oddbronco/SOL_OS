import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  MessageSquare,
  Edit,
  Eye,
  Users,
  CheckCircle,
  Clock,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Question {
  id: string;
  text: string;
  category: string;
  target_roles?: string[];
  [key: string]: any;
}

interface QuestionAssignment {
  question_id: string;
  stakeholder_id: string;
  [key: string]: any;
}

interface StakeholderResponse {
  question_id: string;
  stakeholder_id: string;
  [key: string]: any;
}

interface Stakeholder {
  id: string;
  name: string;
  [key: string]: any;
}

interface EnhancedQuestionsListProps {
  questions: Question[];
  questionAssignments: QuestionAssignment[];
  stakeholderResponses: StakeholderResponse[];
  stakeholders: Stakeholder[];
  onViewResponses: (question: Question) => void;
  onEditQuestion: (question: Question) => void;
}

export const EnhancedQuestionsList: React.FC<EnhancedQuestionsListProps> = ({
  questions,
  questionAssignments,
  stakeholderResponses,
  stakeholders,
  onViewResponses,
  onEditQuestion
}) => {
  const { isDark } = useTheme();
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);

  const toggleExpand = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const getQuestionStats = (question: Question) => {
    const assignments = questionAssignments.filter(qa => qa.question_id === question.id);
    const totalAssigned = assignments.length;
    const answeredCount = assignments.filter(qa => {
      const responses = stakeholderResponses.filter(sr =>
        sr.question_id === question.id &&
        sr.stakeholder_id === qa.stakeholder_id
      );
      return responses.length > 0;
    }).length;

    let statusVariant: 'default' | 'warning' | 'info' | 'success' = 'default';
    let statusText = '';
    let statusIcon = AlertCircle;

    if (totalAssigned === 0) {
      statusVariant = 'default';
      statusText = 'Not Assigned';
      statusIcon = AlertCircle;
    } else if (answeredCount === 0) {
      statusVariant = 'warning';
      statusText = `Pending`;
      statusIcon = Clock;
    } else if (answeredCount < totalAssigned) {
      statusVariant = 'info';
      statusText = `In Progress`;
      statusIcon = Activity;
    } else {
      statusVariant = 'success';
      statusText = `Complete`;
      statusIcon = CheckCircle;
    }

    const completionPercentage = totalAssigned > 0 ? Math.round((answeredCount / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      answeredCount,
      statusVariant,
      statusText,
      statusIcon,
      completionPercentage,
      assignments
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

  return (
    <div className="space-y-3">
      {questions.map((question) => {
        const stats = getQuestionStats(question);
        const StatusIcon = stats.statusIcon;
        const isExpanded = expandedQuestions.has(question.id);
        const isHovered = hoveredQuestion === question.id;
        const assignedStakeholders = stats.assignments
          .map(qa => stakeholders.find(s => s.id === qa.stakeholder_id))
          .filter(Boolean);

        return (
          <div
            key={question.id}
            onMouseEnter={() => setHoveredQuestion(question.id)}
            onMouseLeave={() => setHoveredQuestion(null)}
            className={`rounded-xl border transition-all duration-300 ${
              isHovered ? 'shadow-lg scale-[1.01]' : 'shadow-sm'
            } bg-gradient-to-br ${getStatusGradient(stats.statusVariant)}`}
          >
            {/* Main Question Card */}
            <div className="p-5">
              {/* Header Row */}
              <div className="flex items-start gap-4 mb-4">
                {/* Category Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  <MessageSquare className={`h-6 w-6 ${
                    stats.statusVariant === 'success'
                      ? 'text-green-600'
                      : stats.statusVariant === 'info'
                      ? 'text-blue-600'
                      : stats.statusVariant === 'warning'
                      ? 'text-yellow-600'
                      : 'text-gray-400'
                  }`} />
                </div>

                {/* Question Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="info" className="text-xs flex-shrink-0">
                      {question.category}
                    </Badge>
                    <Badge variant={stats.statusVariant} className="text-xs flex-shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {stats.statusText}
                    </Badge>
                    {stats.totalAssigned > 0 && (
                      <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {stats.answeredCount}/{stats.totalAssigned} responses
                      </span>
                    )}
                  </div>

                  <p className={`text-base leading-relaxed ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {question.text}
                  </p>

                  {/* Target Roles */}
                  {question.target_roles && question.target_roles.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Target className={`h-3.5 w-3.5 ${
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <span className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {question.target_roles.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={`flex gap-2 flex-shrink-0 transition-opacity duration-200 ${
                  isHovered ? 'opacity-100' : 'opacity-70'
                }`}>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    onClick={() => onViewResponses(question)}
                    className="shadow-sm hover:shadow-md flex-shrink-0"
                    title="View Responses"
                  >
                    {stats.answeredCount}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Edit}
                    onClick={() => onEditQuestion(question)}
                    className="shadow-sm hover:shadow-md flex-shrink-0"
                    title="Edit Question"
                  />
                  {stats.totalAssigned > 0 && (
                    <button
                      onClick={() => toggleExpand(question.id)}
                      className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                        isDark
                          ? 'hover:bg-gray-700 text-gray-400'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {stats.totalAssigned > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Response Progress
                    </span>
                    <span className={`font-bold ${
                      stats.completionPercentage === 100
                        ? 'text-green-600'
                        : stats.completionPercentage > 0
                        ? 'text-blue-600'
                        : isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {stats.completionPercentage}%
                    </span>
                  </div>

                  <div className={`h-2 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.completionPercentage === 100
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : stats.completionPercentage > 0
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : 'bg-gray-400'
                      }`}
                      style={{
                        width: `${stats.completionPercentage}%`,
                        boxShadow: stats.completionPercentage > 0
                          ? '0 0 10px rgba(59, 130, 246, 0.4)'
                          : 'none'
                      }}
                    >
                      {stats.completionPercentage > 10 && (
                        <div className="h-full w-full animate-pulse bg-white/20" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded Section - Assigned Stakeholders */}
              {isExpanded && stats.totalAssigned > 0 && (
                <div className={`mt-4 pt-4 border-t ${
                  isDark ? 'border-gray-700/50' : 'border-gray-200/50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className={`h-4 w-4 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Assigned to {assignedStakeholders.length} stakeholder{assignedStakeholders.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {assignedStakeholders.map((stakeholder) => {
                      const hasResponse = stakeholderResponses.some(
                        sr => sr.question_id === question.id && sr.stakeholder_id === stakeholder?.id
                      );

                      return stakeholder ? (
                        <div
                          key={stakeholder.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            isDark ? 'bg-gray-800/50' : 'bg-white/80'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            hasResponse ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className={`text-sm flex-1 ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {stakeholder.name}
                          </span>
                          {hasResponse && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hover Effect */}
            {isHovered && (
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: isDark
                    ? '0 0 20px rgba(59, 130, 246, 0.2)'
                    : '0 0 20px rgba(59, 130, 246, 0.15)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
