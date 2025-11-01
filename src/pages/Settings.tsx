import React, { useState } from 'react';
import { Save, User, Building2, CreditCard, Key, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ApiKeySetup } from '../components/ui/ApiKeySetup';
import { SubscriptionManager } from '../components/subscription/SubscriptionManager';
import { useAuth } from '../hooks/useAuth';
import { useOpenAI } from '../hooks/useOpenAI';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { hasApiKey, loading: apiKeyLoading } = useOpenAI();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    }
  }, [user]);

  const planOptions = [
    { value: 'pro', label: 'Pro Plan' },
    { value: 'enterprise', label: 'Enterprise Plan' }
  ];

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      console.log('💾 Saving profile changes...');
      
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
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  isDark 
                    ? 'border-gray-600 text-white placeholder-gray-400' 
                    : 'border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                style={{
                  backgroundColor: isDark ? '#2b2b2b' : '#f6f4ef'
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
            <Card className={hasApiKey 
              ? isDark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'
              : isDark ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
            }>
              <div className="flex items-center">
                <Key className={`h-5 w-5 mr-2 ${
                  hasApiKey 
                    ? isDark ? 'text-green-400' : 'text-green-600'
                    : isDark ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
                <p className={`text-sm ${
                  hasApiKey 
                    ? isDark ? 'text-green-300' : 'text-green-800'
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
      backgroundColor: '#e8e6e1'
    }}>
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200"
      style={{
        backgroundColor: '#e8e6e1'
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
                      ? 'bg-green-600 text-white'
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