import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  size = 'md'
}) => {
  const { isDark } = useTheme();

  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const getVariantClasses = () => {
    if (isDark) {
      return {
        default: 'bg-gray-700 text-gray-300',
        success: 'bg-green-900/50 text-primary-400 border border-primary-500/30',
        warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30',
        error: 'bg-red-900/50 text-red-400 border border-red-500/30',
        info: 'bg-blue-900/50 text-blue-400 border border-blue-500/30'
      };
    } else {
      return {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-primary-100 text-primary-800 border border-green-200',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        error: 'bg-red-100 text-red-800 border border-red-200',
        info: 'bg-blue-100 text-blue-800 border border-blue-200'
      };
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span className={`${baseClasses} ${getVariantClasses()[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};