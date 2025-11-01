import React from 'react';
import {
  Home,
  Building2,
  FolderOpen,
  Settings,
  LogOut,
  Crown,
  Shield,
  BookOpen,
  FileText
} from 'lucide-react';
import { User } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';

import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: User;
  metrics: {
    totalProjects: number;
    totalStakeholders: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, user, metrics }) => {
  const { signOut } = useAuth();

  // Debug logging for master admin status
  console.log('🔍 Sidebar Debug:', {
    userId: user.id,
    role: user.role,
    isMasterAdmin: user.isMasterAdmin,
    customer_id: user.customer_id,
    userMetadata: user
  });

  // Base menu items for all users
  const baseMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Building2, label: 'Clients', path: '/clients' },
    { icon: FolderOpen, label: 'Projects', path: '/projects' },
    { icon: BookOpen, label: 'Question Libraries', path: '/collections' },
    { icon: FileText, label: 'Document Templates', path: '/templates' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Add platform admin menu item only for master admins (software owner)
  const menuItems = (user?.isMasterAdmin || user?.role === 'master_admin')
    ? [...baseMenuItems, { icon: Shield, label: 'Platform Admin', path: '/admin' }]
    : baseMenuItems;
  
  console.log('🎯 Menu items:', menuItems.map(m => m.label));

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r min-h-full border-gray-200"
    style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Logo */}
      <div className="flex items-center justify-center h-24 border-b px-6 border-gray-200">
        <img
          src="https://cdn.prod.website-files.com/5f90af0ff6ef7c0d8b8e7e58/690639382791a6aa3f64d980_Untitled%20design%20(1).png"
          alt="Speak"
          className="h-20 w-auto max-w-full object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div 
        className="px-4 py-4 border-t flex-shrink-0 border-gray-200"
        style={{
          backgroundColor: '#ffffff',
          minHeight: 'auto'
        }}
      >
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="h-4 w-4 text-primary-500" />
            <Badge variant={user.subscription.status === 'active' ? 'success' : 'warning'}>
              {user.subscription.plan}
            </Badge>
          </div>
          <div className={`text-xs ${
            'text-gray-500'
          }`}>
            {metrics.totalProjects}/{user.subscription.maxProjects} projects • {metrics.totalStakeholders}/{user.subscription.maxStakeholders} stakeholders
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {user.fullName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-900">
              {user.fullName}
            </p>
            <p className="text-xs truncate text-gray-500">
              {user.companyName}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-primary-50 hover:text-primary-700"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
};