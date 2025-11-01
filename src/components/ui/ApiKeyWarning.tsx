import React from 'react';
import { AlertTriangle, Key, ExternalLink } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { useTheme } from '../../contexts/ThemeContext';

interface ApiKeyWarningProps {
  onSetupClick: () => void;
  className?: string;
}

export const ApiKeyWarning: React.FC<ApiKeyWarningProps> = ({ 
  onSetupClick, 
  className = '' 
}) => {
  const { isDark } = useTheme();

  const openOpenAISettings = () => {
    window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
  };

  return (
    <Card className={`border-yellow-200 ${
      isDark ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50'
    } ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isDark ? 'bg-yellow-900/50' : 'bg-yellow-100'
        }`}>
          <AlertTriangle className={`h-4 w-4 ${
            isDark ? 'text-yellow-400' : 'text-yellow-600'
          }`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${
            isDark ? 'text-yellow-300' : 'text-yellow-800'
          }`}>
            OpenAI API Key Required
          </h4>
          <p className={`text-sm mt-1 ${
            isDark ? 'text-yellow-200' : 'text-yellow-700'
          }`}>
            AI features like question generation, transcription, and document creation require an OpenAI API key.
          </p>
          
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              icon={Key}
              onClick={onSetupClick}
              className={`${
                isDark 
                  ? 'border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/30' 
                  : 'border-yellow-300 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Set Up API Key
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              icon={ExternalLink}
              onClick={openOpenAISettings}
              className={`${
                isDark 
                  ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20' 
                  : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Get API Key
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};