import React, { useState } from 'react';
import { Save, User, Building2, CreditCard, Key, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ApiKeySetup } from '../components/ui/ApiKeySetup';
import { MuxKeySetup } from '../components/ui/MuxKeySetup';
import { SubscriptionManager } from '../components/subscription/SubscriptionManager';
import { useAuth } from '../hooks/useAuth';
import { useOpenAI } from '../hooks/useOpenAI';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { hasApiKey, loading: apiKeyLoading } = useOpenAI();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showMuxSetup, setShowMuxSetup] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [muxTokenId, setMuxTokenId] = useState('');
  const [muxTokenSecret, setMuxTokenSecret] = useState('');
  const [muxSigningKeyId, setMuxSigningKeyId] = useState('');
  const [muxSigningKeyPrivate, setMuxSigningKeyPrivate] = useState('');
  const [appDomains, setAppDomains] = useState<string[]>(['interviews.solprojectos.com', 'solprojectos.com']);
  const [hasMuxKey, setHasMuxKey] = useState(false);
  const [loadingMux, setLoadingMux] = useState(true);
  const isDark = false; // Always light mode
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    bio: ''
  });
  const [companyData, setCompanyData] = useState({
    companyName: user?.companyName || '',
    industry: '',
    companySize: '',
    website: '',
    description: ''
  });

  const planOptions = [
    { value: '', label: 'Select a plan' },
    { value: 'starter', label: 'Starter - 3 Projects, 15 Stakeholders' },
    { value: 'professional', label: 'Professional - 10 Projects, 50 Stakeholders' },
    { value: 'enterprise', label: 'Enterprise - Unlimited Projects & Stakeholders' }
  ];

  // Update profile data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: '',
        bio: ''
      });
      setCompanyData({
        companyName: user.companyName || '',
        industry: '',
        companySize: '',
        website: '',
        description: ''
      });
      loadMuxCredentials();
    }
  }, [user]);

  // Load Mux credentials
  const loadMuxCredentials = async () => {
    if (!user) return;

    setLoadingMux(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('mux_token_id, mux_token_secret, mux_signing_key_id, mux_signing_key_private, app_domains')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading Mux credentials:', error);
      }

      if (data?.mux_token_id && data?.mux_token_secret) {
        setMuxTokenId(data.mux_token_id);
        setMuxTokenSecret(data.mux_token_secret);
        setMuxSigningKeyId(data.mux_signing_key_id || '');
        setMuxSigningKeyPrivate(data.mux_signing_key_private || '');
        setAppDomains(data.app_domains || ['interviews.solprojectos.com', 'solprojectos.com']);
        setHasMuxKey(true);
      } else {
        setHasMuxKey(false);
      }
    } catch (err) {
      console.error('Error loading Mux credentials:', err);
    } finally {
      setLoadingMux(false);
    }
  };

  const saveAssemblyAIKey = async (apiKey: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          assemblyai_api_key: apiKey || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      if (error) throw error;
      alert('AssemblyAI API key saved successfully! You can now transcribe large video/audio files.');
      return true;
    } catch (err: any) {
      console.error('Error saving AssemblyAI key:', err);
      alert(err.message || 'Failed to save AssemblyAI key');
      return false;
    }
  };

 // Save Mux credentials
  const saveMuxCredentials = async (
    tokenId: string,
    tokenSecret: string,
    signingKeyId: string,
    signingKeyPrivate: string,
    domains: string[]
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          mux_token_id: tokenId || null,
          mux_token_secret: tokenSecret || null,
          mux_signing_key_id: signingKeyId || null,
          mux_signing_key_private: signingKeyPrivate || null,
          app_domains: domains.length > 0 ? domains : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMuxTokenId(tokenId);
      setMuxTokenSecret(tokenSecret);
      setMuxSigningKeyId(signingKeyId);
      setMuxSigningKeyPrivate(signingKeyPrivate);
      setAppDomains(domains);
      setHasMuxKey(!!(tokenId && tokenSecret && signingKeyId && signingKeyPrivate));

      // If all credentials are set, configure Mux playback restrictions
      if (tokenId && tokenSecret && signingKeyId && signingKeyPrivate && domains.length > 0) {
        console.log('🔒 Configuring Mux playback restrictions...');
        // VVVV THIS LINE IS THE FIX VVVV
        await configureMuxPlaybackRestrictions(signingKeyId, domains);
      }

      return true;
    } catch (err: any) {
      console.error('Error saving Mux credentials:', err);
      alert(err.message || 'Failed to save Mux credentials');
      return false;
    }
  };

  // Configure Mux playback restrictions
  // VVVV 1. ACCEPT THE DOMAINS ARRAY HERE VVVV
  const configureMuxPlaybackRestrictions = async (signingKeyId: string, domains: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${config.supabase.url}/functions/v1/configure-mux-playback-restrictions`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        // VVVV 2. SEND THE DOMAINS IN THE BODY VVVV
        body: JSON.stringify({ signingKeyId, domains: domains }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Mux playback restrictions configured:', result);
        alert('Mux playback restrictions configured successfully!');
      } else {
        const error = await response.json();
        console.error('Failed to configure playback restrictions:', error);
        alert(`Note: Mux credentials saved, but playback restrictions setup failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error configuring Mux playback restrictions:', error);
      // Don't fail the save operation
    }
  };


  const handleSaveChanges = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update auth metadata first (this is what the app reads)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName,
          company_name: companyData.companyName
        }
      });

      if (metadataError) {
        console.error('❌ Auth metadata update failed:', metadataError);
        throw metadataError;
      }

      console.log('✅ Auth metadata updated successfully');

      // Try to update users table (secondary, won't break if it fails)
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: profileData.fullName,
          company_name: companyData.companyName,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) {
        console.warn('⚠️ Users table update failed (non-critical):', profileError);
      }

      console.log('✅ Profile updated successfully');
      alert('Profile updated successfully!');

      // Small delay then reload to refresh auth context
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const handleUpgradePlan = async () => {
    if (!selectedPlan || !phoneNumber) return;
    
    setUpgradeLoading(true);
    try {
      // Insert upgrade request into admin activity log
      const { error } = await supabase
        .from('admin_activity_log')
        .insert({
          action: 'upgrade_plan_request',
          target_user_id: user?.id,
          details: {
            customer_name: user?.fullName,
            customer_id: user?.id,
            company_name: user?.companyName,
            email: user?.email,
            phone: phoneNumber,
            current_plan: user?.subscription?.plan,
            requested_plan: selectedPlan,
            current_projects: user?.subscription?.maxProjects,
            current_stakeholders: user?.subscription?.maxStakeholders,
            timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;

      // Show success message
      alert('Upgrade request submitted successfully! Our team will contact you soon.');
      
      // Reset form
      setShowUpgradeModal(false);
      setSelectedPlan('');
      setPhoneNumber('');
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      alert('Failed to submit upgrade request. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                placeholder="John Smith"
              />
              <Input
                label="Email Address"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="john@agency.com"
              />
            </div>
            
            <Input
              label="Phone Number"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <Input
              label="Company Name"
              value={companyData.companyName}
              onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
              placeholder="Your Agency Name"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Industry"
                value={companyData.industry}
                onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                placeholder="Digital Marketing"
              />
              <Input
                label="Company Size"
                value={companyData.companySize}
                onChange={(e) => setCompanyData({ ...companyData, companySize: e.target.value })}
                placeholder="10-50 employees"
              />
            </div>
            
            <Input
              label="Website"
              value={companyData.website}
              onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
              placeholder="https://youragency.com"
            />
            
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>Company Description</label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  isDark 
                    ? 'border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                style={{
                  backgroundColor: isDark ? '#2b2b2b' : '#ffffff'
                }}
                rows={4}
                value={companyData.description}
                onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                placeholder="Describe your company..."
              />
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-6">
            <SubscriptionManager user={user} />
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            {/* OpenAI Section */}
            <Card className={hasApiKey
              ? isDark ? 'bg-green-900/20 border-primary-500/30' : 'bg-primary-50 border-green-200'
              : isDark ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
            }>
              <div className="flex items-center">
                <Key className={`h-5 w-5 mr-2 ${
                  hasApiKey
                    ? isDark ? 'text-primary-400' : 'text-primary-600'
                    : isDark ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
                <p className={`text-sm ${
                  hasApiKey
                    ? isDark ? 'text-primary-300' : 'text-primary-800'
                    : isDark ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  {hasApiKey
                    ? 'OpenAI API key is configured. All AI features are available.'
                    : 'OpenAI API key is required for AI features like transcription and document generation.'
                  }
                </p>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  OpenAI API Key
                </h4>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {hasApiKey ? 'API key is configured and ready to use' : 'No API key configured'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowApiKeySetup(true)}
                loading={apiKeyLoading}
              >
                {hasApiKey ? 'Update API Key' : 'Set Up API Key'}
              </Button>
            </div>

            {/* AssemblyAI Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <Card className={isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}>
                <div className="flex items-center">
                  <Key className={`h-5 w-5 mr-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                    AssemblyAI transcribes large video/audio files over 25MB. Costs $0.015/minute. Optional but recommended for long meetings.
                  </p>
                </div>
              </Card>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AssemblyAI API Key (Optional)
                  </h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    For transcribing files larger than 25MB (OpenAI Whisper limit)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const key = prompt('Enter your AssemblyAI API key (get one free at assemblyai.com):');
                    if (key) saveAssemblyAIKey(key);
                  }}
                >
                  Configure AssemblyAI
                </Button>
              </div>
            </div>

            {/* Mux Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <Card className={hasMuxKey
                ? isDark ? 'bg-green-900/20 border-primary-500/30' : 'bg-primary-50 border-green-200'
                : isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
              }>
                <div className="flex items-center">
                  <Key className={`h-5 w-5 mr-2 ${
                    hasMuxKey
                      ? isDark ? 'text-primary-400' : 'text-primary-600'
                      : isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <p className={`text-sm ${
                    hasMuxKey
                      ? isDark ? 'text-primary-300' : 'text-primary-800'
                      : isDark ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    {hasMuxKey
                      ? 'Mux is configured. Professional video hosting with automatic transcoding is enabled.'
                      : 'Mux provides professional video hosting, automatic transcoding, and global CDN delivery.'
                    }
                  </p>
                </div>
              </Card>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <h4 className={`font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Mux Video API
                  </h4>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {hasMuxKey ? 'Credentials configured - $20 free credits included' : 'Upload videos in any format, works everywhere'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowMuxSetup(true)}
                  loading={loadingMux}
                >
                  {hasMuxKey ? 'Update Credentials' : 'Set Up Mux'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>AI Features</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span className="text-sm text-gray-700">Automatic transcription</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span className="text-sm text-gray-700">Question generation</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span className="text-sm text-gray-700">Document generation</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <span className="text-sm text-gray-700">Response analysis</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className={`font-medium ${
                'text-gray-900'
              }`}>Email Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">New stakeholder responses</span>
                  <input type="checkbox" className="ml-3" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Project status updates</span>
                  <input type="checkbox" className="ml-3" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Weekly summary reports</span>
                  <input type="checkbox" className="ml-3" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">System maintenance alerts</span>
                  <input type="checkbox" className="ml-3" />
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className={`font-medium ${
                'text-gray-900'
              }`}>Reminder Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Reminder Frequency"
                  defaultValue="3 days"
                  placeholder="3 days"
                />
                <Input
                  label="Reminder Time"
                  type="time"
                  defaultValue="14:00"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#f0f4f8'
    }}>
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200"
      style={{
        backgroundColor: '#f0f4f8'
      }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">Manage your account and preferences</p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1">
            <Card>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h3>
              </div>
              
              {renderTabContent()}
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <Button icon={Save} onClick={handleSaveChanges} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* API Key Setup Modal */}
      <ApiKeySetup
        isOpen={showApiKeySetup}
        onClose={() => setShowApiKeySetup(false)}
        onSuccess={() => {
          // Optionally show a success message or refresh data
        }}
      />

      {/* Mux Setup Modal */}
      <Modal
        isOpen={showMuxSetup}
        onClose={() => setShowMuxSetup(false)}
        title="Mux Video API Setup"
        size="lg"
      >
        <MuxKeySetup
          muxTokenId={muxTokenId}
          muxTokenSecret={muxTokenSecret}
          muxSigningKeyId={muxSigningKeyId}
          muxSigningKeyPrivate={muxSigningKeyPrivate}
          appDomains={appDomains}
          hasMuxKey={hasMuxKey}
          onSave={saveMuxCredentials}
          onClose={() => setShowMuxSetup(false)}
        />
      </Modal>

      {/* Upgrade Plan Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setSelectedPlan('');
          setPhoneNumber('');
        }}
        title="Request Plan Upgrade"
        size="md"
      >
        <div className="space-y-6">
          <div className={`rounded-lg p-4 ${
            isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className={`font-medium mb-2 ${
              isDark ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Current Plan: {user?.subscription.plan.toUpperCase()}
            </h4>
            <p className={`text-sm ${
              isDark ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Your upgrade request will be sent to our platform administrators who will contact you to process the change.
            </p>
          </div>

          <div className="space-y-4">
            <Select
              label="Select New Plan"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              options={planOptions}
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />

            <div className={`text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <p className="mb-2"><strong>Your Information:</strong></p>
              <ul className="space-y-1">
                <li>• Name: {user?.fullName}</li>
                <li>• Email: {user?.email}</li>
                <li>• Company: {user?.companyName}</li>
                <li>• Current Plan: {user?.subscription.plan}</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedPlan('');
                setPhoneNumber('');
              }}
              disabled={upgradeLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgradePlan}
              loading={upgradeLoading}
              disabled={!selectedPlan || !phoneNumber}
            >
              Submit Upgrade Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
