import React from 'react';
import { Calendar, Users, Clock, MoreVertical, Send, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onSendInvites?: (project: Project) => void;
  onGenerateQuestions?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onSelect, 
  onSendInvites,
  onGenerateQuestions 
}) => {
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'on_hold':
        return 'warning';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const completionRate = Math.round((project.metrics.completed_responses / project.metrics.total_stakeholders) * 100) || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 cursor-pointer" onClick={() => onSelect(project)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getPriorityColor(project.priority)}>
            {project.priority}
          </Badge>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 cursor-pointer" onClick={() => onSelect(project)}>
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor(project.status)}>
            {project.status.replace('_', ' ')}
          </Badge>
          <span className="text-sm font-medium text-gray-900">
            {completionRate}% Complete
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(project.timeline.expected_end_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{project.metrics.total_stakeholders} stakeholders</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{project.metrics.avg_response_time_minutes}m avg</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(project.status === 'draft' || project.status === 'planning') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {onGenerateQuestions && (
              <Button
                variant="outline"
                size="sm"
                icon={MessageSquare}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateQuestions(project);
                }}
              >
                Generate Questions
              </Button>
            )}
            {onSendInvites && (
              <Button
                variant="outline"
                size="sm"
                icon={Send}
                onClick={(e) => {
                  e.stopPropagation();
                  onSendInvites(project);
                }}
              >
                Send Invites
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};