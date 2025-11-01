import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();

  return (
    <div className="space-y-1">
      {label && (
        <label className={`block text-sm font-medium ${
          isDark ? 'text-gray-200' : 'text-gray-700'
        }`}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`} />
        )}
        <input
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 
            focus:border-primary-500 transition-colors
            ${Icon ? 'pl-10' : ''}
            ${error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' + (isDark ? ' bg-red-900/20' : ' bg-red-50') 
              : ''
            }
            ${isDark 
              ? 'border-gray-600 placeholder-gray-400 focus:border-primary-400 text-white' 
              : 'border-gray-300 placeholder-gray-500 text-gray-900'
            }
            ${className}
          `}
          style={{
            backgroundColor: isDark ? '#2b2b2b' : '#f6f4ef',
            color: isDark ? '#f6f4ef' : '#2b2b2b'
          }}
          {...props}
        />
      </div>
      {error && (
        <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
      )}
      {helperText && !error && (
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{helperText}</p>
      )}
    </div>
  );
};