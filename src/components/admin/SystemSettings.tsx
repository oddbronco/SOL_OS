import React, { useState, useEffect } from 'react';
import { Database, Save, RefreshCw, AlertTriangle, CheckCircle, Settings, Shield, Globe, Bell, Key } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface SystemConfig {
  maintenance_mode: boolean;
  new_registrations_enabled: boolean;
  email_notifications_enabled: boolean;
  max_file_size_mb: number;
  max_recording_minutes: number;
  storage_bucket_file_size_limit_mb: number;
  estimated_recording_bitrate_kbps: number;
  api_rate_limit_per_hour: number;
  interview_rate_limiting_enabled: boolean;
  default_subscription_plan: string;
  platform_name: string;
  support_email: string;
  terms_url: string;
  privacy_url: string;
  openai_enabled: boolean;
  auto_transcription_enabled: boolean;
  ai_question_generation_enabled: boolean;
  document_generation_enabled: boolean;
}

interface SystemStats {
  database_status: 'healthy' | 'warning' | 'error';
  storage_status: 'healthy' | 'warning' | 'error';
  api_status: 'healthy' | 'warning' | 'error';
  total_storage_used_mb: number;
  total_api_calls_today: number;
  active_sessions: number;
}

export const SystemSettings: React.FC = () => {
  const { isDark } = useTheme();
  const [config, setConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    new_registrations_enabled: true,
    email_notifications_enabled: true,
    max_file_size_mb: 100,
    max_recording_minutes: 30,
    storage_bucket_file_size_limit_mb: 200,
    estimated_recording_bitrate_kbps: 128,
    api_rate_limit_per_hour: 1000,
    interview_rate_limiting_enabled: true,
    default_subscription_plan: 'starter',
    platform_name: 'SOL Project OS',
    support_email: 'support@solprojectos.com',
    terms_url: 'https://solprojectos.com/terms',
    privacy_url: 'https://solprojectos.com/privacy',
    openai_enabled: true,
    auto_transcription_enabled: true,
    ai_question_generation_enabled: true,
    document_generation_enabled: true
  });
  const [systemStats, setSystemStats] = useState<SystemStats>({
    database_status: 'healthy',
    storage_status: 'healthy',
    api_status: 'healthy',
    total_storage_used_mb: 0,
    total_api_calls_today: 0,
    active_sessions: 0
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    loadSystemConfig();
    loadSystemStats();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      console.log('⚙️ Loading system configuration...');

      const savedConfig = localStorage.getItem('system_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
        console.log('✅ System config loaded from localStorage');
      } else {
        console.log('ℹ️ Using default system config');
      }
    } catch (error) {
      console.error('💥 Failed to load system config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      console.log('📊 Loading system stats...');

      // Get storage usage from file_storage table
      const { data: storageData } = await supabase
        .from('file_storage')
        .select('file_size');

      const totalStorageUsed = storageData?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;

      // Get active sessions (users who signed in today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: activeUsers } = await supabase.auth.admin.listUsers();
      const activeSessions = activeUsers?.users.filter(user => 
        user.last_sign_in_at && new Date(user.last_sign_in_at) > today
      ).length || 0;

      setSystemStats({
        database_status: 'healthy',
        storage_status: totalStorageUsed > 1000000000 ? 'warning' : 'healthy', // 1GB warning
        api_status: 'healthy',
        total_storage_used_mb: Math.round(totalStorageUsed / 1024 / 1024),
        total_api_calls_today: Math.floor(Math.random() * 500) + 100, // Mock data
        active_sessions: activeSessions
      });

      console.log('✅ System stats loaded');
    } catch (error) {
      console.error('💥 Failed to load system stats:', error);
    }
  };

  const saveSystemConfig = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving system configuration...');

      const { data: { user } } = await supabase.auth.getUser();

      localStorage.setItem('system_config', JSON.stringify(config));

      await supabase
        .from('admin_activity_log')
        .insert({
          admin_user_id: user?.id,
          action: 'system_config_update',
          details: {
            updated_config: config,
            timestamp: new Date().toISOString()
          }
        });

      setLastSaved(new Date().toISOString());
      console.log('✅ System config saved to localStorage');
      alert('System configuration saved successfully!');
    } catch (error) {
      console.error('💥 Failed to save system config:', error);
      alert('Failed to save system configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      setConfig({
        maintenance_mode: false,
        new_registrations_enabled: true,
        email_notifications_enabled: true,
        max_file_size_mb: 100,
        max_recording_minutes: 30,
        storage_bucket_file_size_limit_mb: 200,
        estimated_recording_bitrate_kbps: 128,
        api_rate_limit_per_hour: 1000,
        interview_rate_limiting_enabled: true,
        default_subscription_plan: 'starter',
        platform_name: 'SOL Project OS',
        support_email: 'support@solprojectos.com',
        terms_url: 'https://solprojectos.com/terms',
        privacy_url: 'https://solprojectos.com/privacy',
        openai_enabled: true,
        auto_transcription_enabled: true,
        ai_question_generation_enabled: true,
        document_generation_enabled: true
      });
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-6 w-6 text-primary-500" />;
      case 'warning': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'bg-primary-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${config.maintenance_mode ? 'bg-red-500' : 'bg-primary-500'}`} />
          <span className={`font-medium ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Platform Status: {config.maintenance_mode ? 'Maintenance Mode' : 'Operational'}
          </span>
          {config.maintenance_mode && (
            <Badge variant="warning">Maintenance Active</Badge>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {new Date(lastSaved).toLocaleString()}
            </span>
          )}
          <Button variant="outline" onClick={loadSystemConfig} loading={loading} icon={RefreshCw}>
            Refresh
          </Button>
          <Button onClick={saveSystemConfig} loading={saving} icon={Save}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>System Health</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`p-4 rounded-lg border ${getStatusColor(systemStats.database_status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Database</div>
                <div className="text-sm text-gray-600">PostgreSQL</div>
              </div>
              {getStatusIcon(systemStats.database_status)}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${getStatusColor(systemStats.storage_status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Storage</div>
                <div className="text-sm text-gray-600">{systemStats.total_storage_used_mb} MB used</div>
              </div>
              {getStatusIcon(systemStats.storage_status)}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${getStatusColor(systemStats.api_status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">API</div>
                <div className="text-sm text-gray-600">{systemStats.total_api_calls_today} calls today</div>
              </div>
              {getStatusIcon(systemStats.api_status)}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">Active Sessions</div>
              <div className="text-sm text-blue-700">Users active today</div>
            </div>
            <div className="text-2xl font-bold text-blue-900">{systemStats.active_sessions}</div>
          </div>
        </div>
      </Card>

      {/* Platform Configuration */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Platform Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Platform Name"
              value={config.platform_name}
              onChange={(e) => setConfig({ ...config, platform_name: e.target.value })}
              placeholder="SOL Project OS"
            />
            <Input
              label="Support Email"
              type="email"
              value={config.support_email}
              onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
              placeholder="support@speak.com"
            />
            <Input
              label="Terms of Service URL"
              value={config.terms_url}
              onChange={(e) => setConfig({ ...config, terms_url: e.target.value })}
              placeholder="https://speak.com/terms"
            />
            <Input
              label="Privacy Policy URL"
              value={config.privacy_url}
              onChange={(e) => setConfig({ ...config, privacy_url: e.target.value })}
              placeholder="https://speak.com/privacy"
            />
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Platform Controls</h4>
              <label className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Maintenance Mode
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.maintenance_mode}
                    onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  {config.maintenance_mode && (
                    <Badge variant="warning" size="sm">Active</Badge>
                  )}
                </div>
              </label>
              
              <label className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  New User Registrations
                </span>
                <input
                  type="checkbox"
                  checked={config.new_registrations_enabled}
                  onChange={(e) => setConfig({ ...config, new_registrations_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Notifications
                </span>
                <input
                  type="checkbox"
                  checked={config.email_notifications_enabled}
                  onChange={(e) => setConfig({ ...config, email_notifications_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* System Limits */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-5 w-5 text-primary-600" />
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>System Limits & Security</h3>
        </div>

        <div className="space-y-4">
          <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Storage & Recording Limits
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Input
              label="Storage Bucket File Size Limit (MB)"
              type="number"
              value={config.storage_bucket_file_size_limit_mb}
              onChange={(e) => setConfig({ ...config, storage_bucket_file_size_limit_mb: parseInt(e.target.value) || 200 })}
              min="10"
              max="5000"
              helperText="Maximum size per file upload to storage (prevents failed uploads)"
            />
            <Input
              label="Estimated Recording Bitrate (kbps)"
              type="number"
              value={config.estimated_recording_bitrate_kbps}
              onChange={(e) => setConfig({ ...config, estimated_recording_bitrate_kbps: parseInt(e.target.value) || 128 })}
              min="32"
              max="512"
              helperText="Used to calculate recording time limits and show time remaining"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Input
            label="Max File Size (MB)"
            type="number"
            value={config.max_file_size_mb}
            onChange={(e) => setConfig({ ...config, max_file_size_mb: parseInt(e.target.value) || 100 })}
            min="1"
            max="1000"
            helperText="File size limit enforced in subscription plans"
          />
          <Input
            label="Max Recording Length (Minutes)"
            type="number"
            value={config.max_recording_minutes}
            onChange={(e) => setConfig({ ...config, max_recording_minutes: parseInt(e.target.value) || 30 })}
            min="1"
            max="120"
            helperText="Recording time limit per session in subscription plans"
          />
          <Input
            label="API Rate Limit (per hour)"
            type="number"
            value={config.api_rate_limit_per_hour}
            onChange={(e) => setConfig({ ...config, api_rate_limit_per_hour: parseInt(e.target.value) || 1000 })}
            min="100"
            max="10000"
          />
        </div>

        <div className="pt-6 border-t border-gray-200">
          <h4 className={`font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Interview Security
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-900' : 'text-gray-900'}`}>
                  Interview Rate Limiting
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Limit password attempts to 10 per hour per IP address. Disable for testing purposes only.
                </p>
              </div>
              <div className="flex items-center space-x-3 ml-4">
                <input
                  type="checkbox"
                  checked={config.interview_rate_limiting_enabled}
                  onChange={(e) => setConfig({ ...config, interview_rate_limiting_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                {config.interview_rate_limiting_enabled ? (
                  <Badge variant="success" size="sm">Enabled</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Disabled</Badge>
                )}
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* AI Features */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Key className="h-5 w-5 text-purple-600" />
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>AI Features</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                OpenAI Integration Enabled
              </span>
              <input
                type="checkbox"
                checked={config.openai_enabled}
                onChange={(e) => setConfig({ ...config, openai_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Auto Transcription
              </span>
              <input
                type="checkbox"
                checked={config.auto_transcription_enabled}
                onChange={(e) => setConfig({ ...config, auto_transcription_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                disabled={!config.openai_enabled}
              />
            </label>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                AI Question Generation
              </span>
              <input
                type="checkbox"
                checked={config.ai_question_generation_enabled}
                onChange={(e) => setConfig({ ...config, ai_question_generation_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                disabled={!config.openai_enabled}
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Document Generation
              </span>
              <input
                type="checkbox"
                checked={config.document_generation_enabled}
                onChange={(e) => setConfig({ ...config, document_generation_enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                disabled={!config.openai_enabled}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Subscription Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-5 w-5 text-primary-600" />
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Subscription Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Input
            label="Default Subscription Plan"
            value={config.default_subscription_plan}
            onChange={(e) => setConfig({ ...config, default_subscription_plan: e.target.value })}
            placeholder="starter"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              New User Default Settings
            </label>
            <p className="text-xs text-gray-500">
              New users will be assigned the default subscription plan and trial status
            </p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border border-red-200 rounded-lg bg-white">
            <div>
              <h4 className="font-medium text-red-900">Reset to Default Settings</h4>
              <p className="text-sm text-red-700">
                This will reset all system settings to their default values. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="text-red-600 border-red-300 hover:bg-red-50 flex-shrink-0"
            >
              Reset to Defaults
            </Button>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border border-red-200 rounded-lg bg-white">
            <div>
              <h4 className="font-medium text-red-900">Enable Maintenance Mode</h4>
              <p className="text-sm text-red-700">
                This will prevent all users from accessing the platform except administrators.
              </p>
            </div>
            <label className="flex items-center flex-shrink-0">
              <input
                type="checkbox"
                checked={config.maintenance_mode}
                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                className="mr-2 h-4 w-4 text-red-600 rounded border-gray-300"
              />
              <span className="text-sm text-red-700">
                {config.maintenance_mode ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
};