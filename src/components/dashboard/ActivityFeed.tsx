import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ActivityItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const { isDark } = useTheme();

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'project_created':
        return 'info';
      case 'stakeholder_invited':
        return 'warning';
      case 'response_submitted':
        return 'success';
      case 'document_generated':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 py-2">
              <div className="flex-shrink-0">
                <Badge variant={getActivityColor(activity.type)} size="sm">
                  {activity.type.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {activity.title}
                </p>
                <p className={`text-sm line-clamp-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {activity.description}
                </p>
                <p className={`text-xs mt-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-400'
                }`}>
                  {new Date(activity.timestamp).toLocaleDateString()} • {activity.user}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};