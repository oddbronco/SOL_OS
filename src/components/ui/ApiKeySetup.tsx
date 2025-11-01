import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { useOpenAI } from '../../hooks/useOpenAI';
import { useTheme } from '../../contexts/ThemeContext';

interface ApiKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { isDark } = useTheme();
  const { apiKey, hasApiKey, saving, error, saveApiKey, validateApiKey } = useOpenAI();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Reset input when modal opens or apiKey changes
  React.useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey);
      setValidationError('');
    }
  }, [isOpen, apiKey]);

  const handleSave = async () => {
    setValidationError('');

    if (inputKey && !validateApiKey(inputKey)) {
      setValidationError('Invalid API key format. OpenAI API keys start with "sk-" and are longer than 20 characters.');
      return;
    }

    const success = await saveApiKey(inputKey);
    if (success) {
      // Refresh the API key status immediately
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB is updated
      onSuccess?.();
      onClose();
    }
  };

  const handleClear = async () => {
    const success = await saveApiKey('');
    if (success) {
      setInputKey('');
      onSuccess?.();
    }
  };

  const openOpenAISettings = () => {
    window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="OpenAI API Key Setup" size="lg">
      <div className="space-y-6">
        {/* Info Card */}
        <Card className={`${
          isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start space-x-3">
            <Key className={`h-5 w-5 mt-0.5 ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <div>
              <h4 className={`font-medium ${
                isDark ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Why do you need an OpenAI API key?
              </h4>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-blue-200' : 'text-blue-700'
              }`}>
                Your API key enables AI-powered features like automatic transcription, 
                intelligent question generation, and document creation. The key is stored 
                securely and only used for your requests.
              </p>
            </div>
          </div>
        </Card>

        {/* Current Status */}
        {hasApiKey && (
          <Card className={`${
            isDark ? 'bg-green-900/20 border-primary-500/30' : 'bg-primary-50 border-green-200'
          }`}>
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${
                isDark ? 'text-primary-400' : 'text-primary-600'
              }`} />
              <div>
                <p className={`font-medium ${
                  isDark ? 'text-primary-300' : 'text-primary-800'
                }`}>
                  API Key Configured
                </p>
                <p className={`text-sm ${
                  isDark ? 'text-green-200' : 'text-primary-700'
                }`}>
                  All AI features are available and ready to use.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              OpenAI API Key
            </label>
            <Button
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={openOpenAISettings}
              className="text-blue-600 hover:text-blue-700"
            >
              Get API Key
            </Button>
          </div>

          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setValidationError('');
              }}
              placeholder="sk-..."
              className="pr-10"
              error={validationError || error || undefined}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {validationError && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          <p className={`text-xs ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Your API key is encrypted and stored securely. It's only used to make requests on your behalf.
          </p>
        </div>

        {/* Instructions */}
        <Card className={`${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <h4 className={`font-medium mb-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            How to get your OpenAI API key:
          </h4>
          <ol className={`text-sm space-y-2 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <li>1. Visit <button 
              onClick={openOpenAISettings}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              OpenAI's API Keys page
            </button></li>
            <li>2. Sign in to your OpenAI account (or create one)</li>
            <li>3. Click "Create new secret key"</li>
            <li>4. Copy the key and paste it above</li>
            <li>5. Make sure you have credits in your OpenAI account</li>
          </ol>
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {hasApiKey && (
              <Button
                variant="outline"
                onClick={handleClear}
                loading={saving}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Remove API Key
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!inputKey.trim() || inputKey === apiKey}
            >
              {hasApiKey ? 'Update API Key' : 'Save API Key'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};