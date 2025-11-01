import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const { isDark } = useTheme();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className={`inline-block align-bottom rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:p-6 ${sizeClasses[size]} ${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className={`rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isDark 
                  ? 'bg-gray-800 text-gray-400 hover:text-white' 
                  : 'bg-white text-gray-500 hover:text-gray-700'
              }`}
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {title && (
            <div className="mb-4">
              <h3 className={`text-lg leading-6 font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h3>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
};