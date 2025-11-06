import React, { useState } from 'react';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Video } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface MuxKeySetupProps {
  muxTokenId: string;
  muxTokenSecret: string;
  hasMuxKey: boolean;
  onSave: (tokenId: string, tokenSecret: string) => Promise<boolean>;
  onClose: () => void;
}

export const MuxKeySetup: React.FC<MuxKeySetupProps> = ({
  muxTokenId,
  muxTokenSecret,
  hasMuxKey,
  onSave,
  onClose
}) => {
  const [inputTokenId, setInputTokenId] = useState(muxTokenId);
  const [inputTokenSecret, setInputTokenSecret] = useState(muxTokenSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (!inputTokenId.trim() || !inputTokenSecret.trim()) {
      setError('Both Token ID and Token Secret are required');
      return;
    }

    setSaving(true);

    try {
      const success = await onSave(inputTokenId.trim(), inputTokenSecret.trim());
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Mux credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave('', '');
      setInputTokenId('');
      setInputTokenSecret('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const openMuxDashboard = () => {
    window.open('https://dashboard.mux.com/settings/access-tokens', '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Video className="h-5 w-5 mt-0.5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-800">
              Professional Video Hosting with Mux
            </h4>
            <p className="text-sm mt-1 text-blue-700">
              Mux automatically transcodes videos to all formats, provides instant playback,
              and delivers through a global CDN. Works with any video format from any device.
            </p>
            <div className="mt-3 space-y-1 text-xs text-blue-600">
              <p>✓ <strong>Free Trial:</strong> $20 in credits (~600 minutes of video)</p>
              <p>✓ <strong>Speed:</strong> Instant playback, background processing</p>
              <p>✓ <strong>Quality:</strong> Adaptive streaming, up to 4K</p>
              <p>✓ <strong>Universal:</strong> Works on all devices and browsers</p>
            </div>
          </div>
        </div>
      </Card>

      {hasMuxKey && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Mux Configured
              </p>
              <p className="text-sm text-green-700">
                Professional video hosting is enabled.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Mux Access Token
          </label>
          <Button
            variant="ghost"
            size="sm"
            icon={ExternalLink}
            onClick={openMuxDashboard}
            className="text-blue-600 hover:text-blue-700"
          >
            Get Access Token
          </Button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Token ID
          </label>
          <Input
            type="text"
            value={inputTokenId}
            onChange={(e) => {
              setInputTokenId(e.target.value);
              setError('');
            }}
            placeholder="Enter Mux Token ID"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Token Secret
          </label>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={inputTokenSecret}
              onChange={(e) => {
                setInputTokenSecret(e.target.value);
                setError('');
              }}
              placeholder="Enter Mux Token Secret"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Your credentials are stored securely and only used to process your videos.
        </p>
      </div>

      <Card className="bg-gray-50 border-gray-200">
        <h4 className="font-medium mb-3 text-gray-900">
          How to get your Mux Access Token:
        </h4>
        <ol className="text-sm space-y-2 text-gray-600">
          <li>1. Visit{' '}
            <button
              onClick={openMuxDashboard}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Mux Dashboard
            </button>
          </li>
          <li>2. Sign up for a free account (includes $20 credit)</li>
          <li>3. Go to Settings → Access Tokens</li>
          <li>4. Click "Generate new token"</li>
          <li>5. Enable "Mux Video" permissions</li>
          <li>6. Copy both the Token ID and Token Secret</li>
        </ol>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="font-medium text-sm text-gray-900 mb-2">Pricing:</h5>
          <ul className="text-xs space-y-1 text-gray-600">
            <li>• $20 free credits (enough for testing)</li>
            <li>• ~$0.03 per minute of video (encoding + storage + streaming)</li>
            <li>• Automatic cold storage discounts (40-60% off)</li>
            <li>• No file size limits or format restrictions</li>
          </ul>
        </div>
      </Card>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <div>
          {hasMuxKey && (
            <Button
              variant="outline"
              onClick={handleClear}
              loading={saving}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Remove Credentials
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
            disabled={
              !inputTokenId.trim() ||
              !inputTokenSecret.trim() ||
              (inputTokenId === muxTokenId && inputTokenSecret === muxTokenSecret)
            }
          >
            {hasMuxKey ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </div>
      </div>
    </div>
  );
};
