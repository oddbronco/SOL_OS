import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-green-500'
}) => {
  const { isDark } = useTheme();

  const changeColors = {
    positive: isDark ? 'text-green-400' : 'text-green-600',
    negative: isDark ? 'text-red-400' : 'text-red-600',
    neutral: isDark ? 'text-gray-400' : 'text-gray-600'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconColor} ${
          isDark ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};