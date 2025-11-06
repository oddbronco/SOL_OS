import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Video } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface CloudConvertKeySetupProps {
  cloudConvertKey: string;
  hasCloudConvertKey: boolean;
  onSave: (key: string) => Promise<boolean>;
  onClose: () => void;
}

export const CloudConvertKeySetup: React.FC<CloudConvertKeySetupProps> = ({
  cloudConvertKey,
  hasCloudConvertKey,
  onSave,
  onClose
}) => {
  const [inputKey, setInputKey] = useState(cloudConvertKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const success = await onSave(inputKey.trim());
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave('');
      setInputKey('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const openCloudConvertDashboard = () => {
    window.open('https://cloudconvert.com/dashboard/api/v2/keys', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Video className="h-5 w-5 mt-0.5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-800">
              Automatic Video Conversion
            </h4>
            <p className="text-sm mt-1 text-blue-700">
              CloudConvert automatically converts videos to MP4 for universal browser compatibility.
              Videos recorded in Chrome (WebM) will work perfectly in Safari, mobile, and all browsers.
            </p>
            <div className="mt-3 space-y-1 text-xs text-blue-600">
              <p>✓ <strong>Free Tier:</strong> 25 conversions/day (750/month)</p>
              <p>✓ <strong>Speed:</strong> 10-30 seconds typical</p>
              <p>✓ <strong>Quality:</strong> Professional FFmpeg-based conversion</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      {hasCloudConvertKey && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                API Key Configured
              </p>
              <p className="text-sm text-green-700">
                Automatic video conversion is enabled.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* API Key Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            CloudConvert API Key
          </label>
          <Button
            variant="ghost"
            size="sm"
            icon={ExternalLink}
            onClick={openCloudConvertDashboard}
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
              setError('');
            }}
            placeholder="eyJ0eXAi..."
            className="pr-10"
            error={error || undefined}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Your API key is stored securely and only used to convert your videos.
        </p>
      </div>

      {/* Instructions */}
      <Card className="bg-gray-50 border-gray-200">
        <h4 className="font-medium mb-3 text-gray-900">
          How to get your CloudConvert API key:
        </h4>
        <ol className="text-sm space-y-2 text-gray-600">
          <li>1. Visit{' '}
            <button
              onClick={openCloudConvertDashboard}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              CloudConvert Dashboard
            </button>
          </li>
          <li>2. Sign up for a free account (no credit card required)</li>
          <li>3. Go to Dashboard → API → API Keys</li>
          <li>4. Click "Create New API Key"</li>
          <li>5. Copy the key (starts with "eyJ...") and paste it above</li>
        </ol>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="font-medium text-sm text-gray-900 mb-2">Free Tier Benefits:</h5>
          <ul className="text-xs space-y-1 text-gray-600">
            <li>• 25 video conversions per day</li>
            <li>• Up to 1 GB file size per conversion</li>
            <li>• Professional quality MP4 output</li>
            <li>• Perfect for small to medium teams</li>
          </ul>
        </div>
      </Card>

      {/* Optional: Not required warning */}
      <Card className="bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Optional Feature</p>
            <p className="mt-1">
              CloudConvert is optional. Without it, videos will work in the browser they're recorded in,
              but may not work in all browsers (e.g., Chrome WebM won't play in Safari).
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <div>
          {hasCloudConvertKey && (
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
            disabled={!inputKey.trim() || inputKey === cloudConvertKey}
          >
            {hasCloudConvertKey ? 'Update API Key' : 'Save API Key'}
          </Button>
        </div>
      </div>
    </div>
  );
};
