import React, { useState } from 'react';
import { Users, Settings, Key, Crown, Shield, Database, Building2, BarChart3, FileText, Bell, Lock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SubscriptionPlanManager } from '../components/admin/SubscriptionPlanManager';
import { AccessCodeManager } from '../components/admin/AccessCodeManager';
import { SubscriptionRequestManager } from '../components/admin/SubscriptionRequestManager';
import { UserManagement } from '../components/admin/UserManagement';
import { CompanyManagement } from '../components/admin/CompanyManagement';
import { PlatformAnalytics } from '../components/admin/PlatformAnalytics';
import { AllStakeholders } from '../components/admin/AllStakeholders';
import { AllDocuments } from '../components/admin/AllDocuments';
import { InterviewSessionManager } from '../components/admin/InterviewSessionManager';
import { SystemSettings } from '../components/admin/SystemSettings';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

export const Admin: React.FC = () => {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('subscription-plans');
  const [accessChecked, setAccessChecked] = useState(false);

  // Wait for auth to fully load before checking access
  React.useEffect(() => {
    if (!loading) {
      setAccessChecked(true);
    }
  }, [loading]);

  // Show loading state while checking permissions
  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only allow master admins
  if (!user?.isMasterAdmin && user?.role !== 'master_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
      }}>
        <Card className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access the platform admin panel.</p>
        </Card>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'subscription-plans', 
      label: 'Plans', 
      icon: Crown,
      description: 'Manage subscription plans and pricing tiers',
      category: 'Billing & Plans'
    },
    { 
      id: 'access-codes', 
      label: 'Access Codes', 
      icon: Key,
      description: 'Control signup access and plan assignments',
      category: 'Billing & Plans'
    },
    { 
      id: 'subscription-requests', 
      label: 'Requests', 
      icon: Settings,
      description: 'Handle upgrade, downgrade, and cancellation requests',
      category: 'Billing & Plans'
    },
    { 
      id: 'users', 
      label: 'Users', 
      icon: Users,
      description: 'Manage user accounts and permissions',
      category: 'User Management'
    },
    { 
      id: 'companies', 
      label: 'Companies', 
      icon: Building2,
      description: 'View and manage client companies',
      category: 'User Management'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3,
      description: 'Platform-wide usage and performance metrics',
      category: 'Analytics & Reports'
    },
    { 
      id: 'stakeholders', 
      label: 'Stakeholders', 
      icon: Users,
      description: 'View all stakeholders across all projects',
      category: 'Analytics & Reports'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      description: 'View all generated documents across platform',
      category: 'Analytics & Reports'
    },
    {
      id: 'interview-sessions',
      label: 'Interview Sessions',
      icon: Lock,
      description: 'Manage interview session security and expiration',
      category: 'Security'
    },
    {
      id: 'system',
      label: 'System',
      icon: Database,
      description: 'Platform configuration and system settings',
      category: 'System'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'subscription-plans':
        return <SubscriptionPlanManager />;
      case 'access-codes':
        return <AccessCodeManager />;
      case 'subscription-requests':
        return <SubscriptionRequestManager />;
      case 'users':
        return <UserManagement />;
      case 'companies':
        return <CompanyManagement />;
      case 'analytics':
        return <PlatformAnalytics />;
      case 'stakeholders':
        return <AllStakeholders />;
      case 'documents':
        return <AllDocuments />;
      case 'interview-sessions':
        return <InterviewSessionManager />;
      case 'system':
        return <SystemSettings />;
      default:
        return <SubscriptionPlanManager />;
    }
  };

  // Group tabs by category
  const groupedTabs = tabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, typeof tabs>);

  return (
    <div className="min-h-screen flex" style={{
      backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
    }}>
      {/* Fixed Sidebar - Responsive Width */}
      <div className="w-80 xl:w-96 flex-shrink-0 border-r border-gray-200 overflow-y-auto" style={{
        backgroundColor: isDark ? '#2a2a2a' : '#f6f4ef'
      }}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="h-6 w-6 text-primary-600" />
            <h1 className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Platform Admin</h1>
          </div>
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>System administration and management</p>
          <div className="flex items-center space-x-2 mt-3">
            <Badge variant="success" className="flex items-center">
              <Crown className="h-3 w-3 mr-1" />
              Master Admin
            </Badge>
            <Badge variant="info" className="text-xs">
              {user.fullName}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4">
          {Object.entries(groupedTabs).map(([category, categoryTabs]) => (
            <div key={category} className="mb-6">
              <h3 className={`text-xs font-semibold mb-3 px-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>{category.toUpperCase()}</h3>
              <div className="space-y-1">
                {categoryTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-start p-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-600 text-white shadow-sm'
                          : isDark 
                            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{tab.label}</div>
                        <div className={`text-xs mt-1 leading-tight ${
                          activeTab === tab.id 
                            ? 'text-green-100' 
                            : isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Responsive */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content Header */}
        <div className="border-b px-6 py-4 border-gray-200 flex-shrink-0" style={{
          backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-full">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};