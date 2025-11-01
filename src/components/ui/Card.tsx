import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  padding = 'md',
  onClick
}) => {
  const { isDark } = useTheme();

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`rounded-xl shadow-sm border ${paddingClasses[padding]} ${className} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${
        isDark 
          ? 'border-gray-300' 
          : 'bg-white border-gray-200'
      }`}
      style={{
        backgroundColor: isDark ? '#f6f4ef' : '#f6f4ef',
        color: isDark ? '#2b2b2b' : '#2b2b2b'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};