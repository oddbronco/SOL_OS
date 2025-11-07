import React, { useState, useRef } from 'react';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Video, Upload } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface MuxKeySetupProps {
  muxTokenId: string;
  muxTokenSecret: string;
  muxSigningKeyId: string;
  muxSigningKeyPrivate: string;
  appDomains: string[];
  hasMuxKey: boolean;
  onSave: (tokenId: string, tokenSecret: string, signingKeyId: string, signingKeyPrivate: string, appDomains: string[]) => Promise<boolean>;
  onClose: () => void;
}

export const MuxKeySetup: React.FC<MuxKeySetupProps> = ({
  muxTokenId,
  muxTokenSecret,
  muxSigningKeyId,
  muxSigningKeyPrivate,
  appDomains,
  hasMuxKey,
  onSave,
  onClose
}) => {
  const [inputTokenId, setInputTokenId] = useState(muxTokenId);
  const [inputTokenSecret, setInputTokenSecret] = useState(muxTokenSecret);
  const [inputSigningKeyId, setInputSigningKeyId] = useState(muxSigningKeyId);
  const [inputSigningKeyPrivate, setInputSigningKeyPrivate] = useState(muxSigningKeyPrivate);
  const [inputAppDomains, setInputAppDomains] = useState(appDomains.join(', '));
  const [showSecret, setShowSecret] = useState(false);
  const [showSigningKey, setShowSigningKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setError('');

    if (!inputTokenId.trim() || !inputTokenSecret.trim()) {
      setError('Both Token ID and Token Secret are required');
      return;
    }

    if (!inputSigningKeyId.trim() || !inputSigningKeyPrivate.trim()) {
      setError('Both Signing Key ID and Private Key are required');
      return;
    }

    // Parse domains from comma-separated input
    const domains = inputAppDomains
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domains.length === 0) {
      setError('At least one domain is required');
      return;
    }

    setSaving(true);

    try {
      const success = await onSave(
        inputTokenId.trim(),
        inputTokenSecret.trim(),
        inputSigningKeyId.trim(),
        inputSigningKeyPrivate.trim(),
        domains
      );
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
      await onSave('', '', '', '', []);
      setInputTokenId('');
      setInputTokenSecret('');
      setInputSigningKeyId('');
      setInputSigningKeyPrivate('');
      setInputAppDomains('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const openMuxDashboard = () => {
    window.open('https://dashboard.mux.com/settings/access-tokens', '_blank');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pem')) {
      setError('Please upload a .pem file');
      setUploadedFileName('');
      return;
    }

    try {
      const text = await file.text();
      const base64 = btoa(text);
      setInputSigningKeyPrivate(base64);
      setUploadedFileName(file.name);
      setError('');
    } catch (err) {
      setError('Failed to read file');
      setUploadedFileName('');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Mux Signing Key (Required for Secure Playback)
            </label>
            <Button
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open('https://dashboard.mux.com/settings/signing-keys', '_blank')}
              className="text-blue-600 hover:text-blue-700"
            >
              Get Signing Key
            </Button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Signing Key ID
            </label>
            <Input
              type="text"
              value={inputSigningKeyId}
              onChange={(e) => {
                setInputSigningKeyId(e.target.value);
                setError('');
              }}
              placeholder="Enter Mux Signing Key ID"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Private Key
            </label>
            <div className="flex space-x-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Upload}
                onClick={handleUploadClick}
                className="text-sm"
              >
                Upload .pem File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pem"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadedFileName ? (
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-md border border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    {uploadedFileName} uploaded
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-500 self-center">
                  or paste base64-encoded key below
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={inputSigningKeyPrivate}
                onChange={(e) => {
                  setInputSigningKeyPrivate(e.target.value);
                  setError('');
                }}
                placeholder="Upload a .pem file or paste base64-encoded private key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-xs pr-10 min-h-[100px]"
                style={{ fontFamily: 'monospace' }}
              />
              <button
                type="button"
                onClick={() => setShowSigningKey(!showSigningKey)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showSigningKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Allowed Domains (comma-separated)
            </label>
            <Input
              type="text"
              value={inputAppDomains}
              onChange={(e) => {
                setInputAppDomains(e.target.value);
                setError('');
              }}
              placeholder="interviews.solprojectos.com, solprojectos.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              These domains will be added to Mux playback restrictions automatically
            </p>
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
          Setup Instructions:
        </h4>

        <div className="mb-4">
          <h5 className="font-medium text-sm text-gray-900 mb-2">Step 1: Get Access Token</h5>
          <ol className="text-sm space-y-1 text-gray-600 ml-4">
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
        </div>

        <div>
          <h5 className="font-medium text-sm text-gray-900 mb-2">Step 2: Create Signing Key</h5>
          <ol className="text-sm space-y-1 text-gray-600 ml-4">
            <li>1. Visit{' '}
              <button
                onClick={() => window.open('https://dashboard.mux.com/settings/signing-keys', '_blank')}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Mux Signing Keys
              </button>
            </li>
            <li>2. Click "Create new signing key"</li>
            <li>3. Select "Video" as the key type</li>
            <li>4. Add your domain (e.g., interviews.solprojectos.com) to the playback restrictions</li>
            <li>5. Copy the Signing Key ID</li>
            <li>6. Download the Private Key .pem file (or copy the base64-encoded key)</li>
          </ol>
        </div>

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
              !inputSigningKeyId.trim() ||
              !inputSigningKeyPrivate.trim() ||
              (inputTokenId === muxTokenId &&
               inputTokenSecret === muxTokenSecret &&
               inputSigningKeyId === muxSigningKeyId &&
               inputSigningKeyPrivate === muxSigningKeyPrivate)
            }
          >
            {hasMuxKey ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </div>
      </div>
    </div>
  );
};
