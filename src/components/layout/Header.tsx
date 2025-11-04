import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  const { isDark } = useTheme();

  return (
    <div className={`border-b px-6 py-4 ${
      isDark
        ? 'bg-charcoal-900 border-charcoal-800'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className={`text-2xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-charcoal-900'
          }`}>{title}</h1>
          {subtitle && (
            <p className={`text-sm mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              placeholder="Search..."
              icon={Search}
              className="w-64"
            />
          </div>

          <NotificationDropdown />

          {actions}
        </div>
      </div>
    </div>
  );
};