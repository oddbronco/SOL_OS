import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick
}) => {
  const { isDark } = useTheme();

  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const getVariantClasses = () => {
    if (isDark) {
      return {
        default: 'bg-slate-800 text-slate-300',
        secondary: 'bg-slate-700 text-slate-300 border border-slate-600',
        success: 'bg-teal-900/50 text-teal-400 border border-teal-500/30',
        warning: 'bg-lime-900/50 text-lime-400 border border-lime-500/30',
        error: 'bg-coral-900/50 text-coral-400 border border-coral-500/30',
        info: 'bg-lavender-900/50 text-lavender-400 border border-lavender-500/30'
      };
    } else {
      return {
        default: 'bg-slate-100 text-slate-700',
        secondary: 'bg-gray-100 text-gray-700 border border-gray-200',
        success: 'bg-teal-100 text-teal-800 border border-teal-200',
        warning: 'bg-lime-100 text-lime-800 border border-lime-200',
        error: 'bg-coral-100 text-coral-800 border border-coral-200',
        info: 'bg-lavender-100 text-lavender-800 border border-lavender-200'
      };
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span
      className={`${baseClasses} ${getVariantClasses()[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
};