import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const { isDark } = useTheme();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-coral-400 text-white hover:bg-coral-500 active:bg-coral-600 focus:ring-coral-400 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]',
      secondary: 'bg-teal-400 text-white hover:bg-teal-500 active:bg-teal-600 focus:ring-teal-400 shadow-sm hover:shadow-md',
      outline: isDark
        ? 'border-2 border-slate-600 text-slate-300 hover:bg-teal-900/20 hover:border-teal-500 hover:text-teal-400 focus:ring-teal-500'
        : 'border-2 border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 focus:ring-teal-400',
      ghost: isDark
        ? 'text-slate-400 hover:text-teal-400 hover:bg-teal-900/20 focus:ring-teal-500'
        : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50 focus:ring-teal-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm'
    };
    return variants[variant];
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <button
      className={`${baseClasses} ${getVariantClasses()} ${sizeClasses[size]} ${className} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className={`animate-spin -ml-1 mr-2 ${iconSizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {Icon && !loading && iconPosition === 'left' && (
        <Icon className={`${iconSizeClasses[size]} ${children ? 'mr-2' : ''}`} />
      )}
      {children}
      {Icon && !loading && iconPosition === 'right' && (
        <Icon className={`${iconSizeClasses[size]} ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  );
};