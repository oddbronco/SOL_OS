import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Edit, Mail, Phone, Calendar, 
  Shield, CheckCircle, AlertCircle, Key, RefreshCw, 
  User, CreditCard, Trash2, Crown, Building2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface PlatformUser {
  id: string;
  customer_id: string;
  email: string;
  full_name: string;
  company_name?: string;
  role: string;
  is_master_admin?: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  projects_count?: number;
  subscription_plan?: string;
  subscription_status?: string;
  customer_company_name?: string;
}

export const UserManagement: React.FC = () => {
  const { isDark } = useTheme();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [editData, setEditData] = useState({
    full_name: '',
    company_name: '',
    role: '',
    phone: '',
    is_master_admin: false
  });
  
  const [subscriptionData, setSubscriptionData] = useState({
    plan: 'starter',
    status: 'active' as 'active' | 'trial' | 'cancelled'
  });
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('👥 Loading users...');

      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Users error:', error);
        setUsers([]);
        return;
      }

      // Get project counts
      const { data: projectCounts } = await supabase
        .from('projects')
        .select('user_id')
        .not('user_id', 'is', null);

      // Get customer subscription data for all users
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, owner_id, name, subscription_plan, subscription_status, max_projects, max_stakeholders');

      // Combine data
      const usersWithCounts = (usersData || []).map(user => {
        const customer = customersData?.find(c => c.owner_id === user.id || c.id === user.customer_id);
        return {
          ...user,
          projects_count: projectCounts?.filter(p => p.user_id === user.id).length || 0,
          subscription_plan: customer?.subscription_plan || 'starter',
          subscription_status: customer?.subscription_status || 'trial',
          customer_company_name: customer?.name
        };
      });

      setUsers(usersWithCounts);
      console.log('✅ Loaded users:', usersWithCounts.length);
    } catch (error) {
      console.error('💥 Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: PlatformUser) => {
    setSelectedUser(user);
    setEditData({
      full_name: user.full_name,
      company_name: user.company_name || '',
      role: user.role,
      phone: user.phone || '',
      is_master_admin: user.is_master_admin || false
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editData.full_name,
          company_name: editData.company_name,
          role: editData.role,
          phone: editData.phone,
          is_master_admin: editData.is_master_admin,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('💥 Failed to update user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionUpdate = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      console.log('🔄 Updating subscription for user:', selectedUser.id);

      // Get plan details from subscription_plans table
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_code', subscriptionData.plan)
        .single();

      if (planError) {
        console.error('❌ Error fetching plan details:', planError);
        throw new Error('Failed to fetch plan details');
      }

      // Find the user's customer record
      console.log('🔍 Looking for customer with:', {
        user_id: selectedUser.id,
        customer_id_from_user: selectedUser.customer_id
      });

      let customersData = null;
      let customerFetchError = null;

      // Try with customer_id first if it exists
      if (selectedUser.customer_id) {
        const result = await supabase
          .from('customers')
          .select('id')
          .eq('id', selectedUser.customer_id);
        customersData = result.data;
        customerFetchError = result.error;
        console.log('🔍 Lookup by customer_id:', { data: customersData, error: customerFetchError });
      }

      // If not found, try by owner_id
      if (!customersData || customersData.length === 0) {
        const result = await supabase
          .from('customers')
          .select('id')
          .eq('owner_id', selectedUser.id);
        customersData = result.data;
        customerFetchError = result.error;
        console.log('🔍 Lookup by owner_id:', { data: customersData, error: customerFetchError });
      }

      if (customerFetchError) {
        console.error('❌ Error fetching customer:', customerFetchError);
        throw new Error(`Failed to query customer: ${customerFetchError.message}`);
      }

      let customer = customersData?.[0];

      // If no customer exists, create one
      if (!customer) {
        console.log('📦 No customer found, creating one...');
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: selectedUser.company_name || `${selectedUser.full_name}'s Company`,
            owner_id: selectedUser.id,
            subscription_plan: 'starter',
            subscription_status: 'active',
            max_projects: 3,
            max_stakeholders: 15,
            billing_contact_email: selectedUser.email
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating customer:', createError);
          throw new Error('Failed to create customer record');
        }

        customer = newCustomer;

        // Update user with customer_id
        await supabase
          .from('users')
          .update({ customer_id: customer.id })
          .eq('id', selectedUser.id);

        // Create customer_users junction
        await supabase
          .from('customer_users')
          .insert({
            customer_id: customer.id,
            user_id: selectedUser.id,
            role: 'customer_admin',
            joined_at: new Date().toISOString()
          });

        console.log('✅ Customer created:', customer.id);
      }

      console.log('📦 Updating customer:', customer.id);

      // Update the customer's subscription
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          subscription_plan: planData.plan_code,
          subscription_status: subscriptionData.status,
          max_projects: planData.max_projects,
          max_stakeholders: planData.max_stakeholders_per_project,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (updateError) {
        console.error('❌ Error updating customer:', updateError);
        throw updateError;
      }

      console.log('✅ Customer subscription updated successfully');

      // Log subscription change
      await supabase
        .from('admin_activity_log')
        .insert({
          action: 'subscription_updated',
          target_user_id: selectedUser.id,
          details: {
            user_name: selectedUser.full_name,
            old_plan: selectedUser.subscription_plan,
            new_plan: subscriptionData.plan,
            old_status: selectedUser.subscription_status,
            new_status: subscriptionData.status,
            max_projects: planData.max_projects,
            max_stakeholders: planData.max_stakeholders_per_project
          }
        });

      await loadUsers();
      setShowSubscriptionModal(false);
      setSelectedUser(null);
      alert(`Subscription updated successfully! User now has ${planData.max_projects} project limit.`);
    } catch (error) {
      console.error('💥 Failed to update subscription:', error);
      alert(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Send password reset email instead of direct update
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        selectedUser.email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (resetError) {
        console.error('❌ Password reset error:', resetError);
        throw new Error(`Failed to send password reset: ${resetError.message}`);
      }

      console.log('✅ Password reset email sent to:', selectedUser.email);
      
      // Log password reset
      await supabase
        .from('admin_activity_log')
        .insert({
          action: 'password_reset_email_sent',
          target_user_id: selectedUser.id,
          details: {
            user_name: selectedUser.full_name,
            user_email: selectedUser.email,
            reset_by: 'admin',
            reset_method: 'email'
          }
        });

      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      alert(`Password reset email sent to ${selectedUser.email}! The user will receive an email with instructions to reset their password.`);
    } catch (error) {
      console.error('💥 Failed to reset password:', error);
      alert(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!selectedUser) return;

    if (emailData.newEmail !== emailData.confirmEmail) {
      alert('Email addresses do not match');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          email: emailData.newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log email update
      await supabase
        .from('admin_activity_log')
        .insert({
          action: 'email_updated',
          target_user_id: selectedUser.id,
          details: {
            user_name: selectedUser.full_name,
            old_email: selectedUser.email,
            new_email: emailData.newEmail
          }
        });

      await loadUsers();
      setShowEmailModal(false);
      setSelectedUser(null);
      alert('Email updated successfully!');
    } catch (error) {
      console.error('💥 Failed to update email:', error);
      alert('Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.id && user.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.customer_id && user.customer_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.email_confirmed_at) ||
      (statusFilter === 'pending' && !user.email_confirmed_at);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master_admin': return 'error';
      case 'customer_admin': return 'success';
      case 'project_manager': return 'info';
      case 'analyst': return 'warning';
      default: return 'default';
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.email_confirmed_at).length;
  const adminUsers = users.filter(u => u.is_master_admin || u.role === 'master_admin').length;

  return (
    <div className="space-y-6">
      {/* Clean Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-primary-600">{activeUsers}</div>
          <div className="text-sm text-gray-600">Active Users</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-600">{adminUsers}</div>
          <div className="text-sm text-gray-600">Admin Users</div>
        </Card>
      </div>

      {/* Clean Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'master_admin', label: 'Master Admin' },
              { value: 'customer_admin', label: 'Customer Admin' },
              { value: 'project_manager', label: 'Project Manager' },
              { value: 'analyst', label: 'Analyst' }
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' }
            ]}
          />
          <Button variant="outline" icon={RefreshCw} onClick={loadUsers} loading={loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Clean User Cards */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              {/* User Info - Left Side */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                    {user.is_master_admin && <Crown className="h-4 w-4 text-yellow-500" />}
                    <Badge variant={getRoleColor(user.role)} size="sm">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                    {user.company_name && (
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-3 w-3" />
                        <span>{user.company_name}</span>
                      </div>
                    )}
                    {!user.customer_id && (
                      <Badge variant="error" size="sm">No Customer</Badge>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - Right Side */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => handleEditUser(user)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={CreditCard}
                  onClick={() => {
                    setSelectedUser(user);
                    setSubscriptionData({
                      plan: user.subscription_plan || 'starter',
                      status: user.subscription_status as any || 'trial'
                    });
                    setShowSubscriptionModal(true);
                  }}
                >
                  Subscription
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Key}
                  onClick={() => {
                    setSelectedUser(user);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                    setShowPasswordModal(true);
                  }}
                >
                  Password
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Mail}
                  onClick={() => {
                    setSelectedUser(user);
                    setEmailData({ newEmail: '', confirmEmail: '' });
                    setShowEmailModal(true);
                  }}
                >
                  Email
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <Card className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium mb-2 text-gray-900">No users found</h4>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </Card>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title={`Edit User - ${selectedUser?.full_name}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Read-only System Fields */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">System Information (Read-Only)</h4>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={selectedUser?.id || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUser?.id || '');
                    alert('User ID copied!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer ID</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={selectedUser?.customer_id || 'No customer linked'}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-mono text-xs"
                />
                {selectedUser?.customer_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedUser?.customer_id || '');
                      alert('Customer ID copied!');
                    }}
                  >
                    Copy
                  </Button>
                )}
              </div>
            </div>

            {selectedUser?.customer_company_name && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Customer Company Name</label>
                <input
                  type="text"
                  value={selectedUser.customer_company_name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={selectedUser?.email || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
                <input
                  type="text"
                  value={selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subscription Plan</label>
                <input
                  type="text"
                  value={selectedUser?.subscription_plan?.toUpperCase() || 'N/A'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm capitalize"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <input
                  type="text"
                  value={selectedUser?.subscription_status?.toUpperCase() || 'N/A'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm capitalize"
                />
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">Editable Information</h4>

            <Input
              label="Full Name"
              value={editData.full_name}
              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
              required
            />
            <Input
              label="Company Name"
              value={editData.company_name}
              onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
            />
            <Input
              label="Phone"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            />
            <Select
              label="Role"
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              options={[
                { value: 'customer_admin', label: 'Customer Admin' },
                { value: 'project_manager', label: 'Project Manager' },
                { value: 'analyst', label: 'Analyst' },
                { value: 'master_admin', label: 'Master Admin' }
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editData.is_master_admin}
                onChange={(e) => setEditData({ ...editData, is_master_admin: e.target.checked })}
              />
              <label className="text-sm text-gray-700">Master Admin</label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} loading={loading}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          setSelectedUser(null);
        }}
        title={`Subscription - ${selectedUser?.full_name}`}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Plan"
            value={subscriptionData.plan}
            onChange={(e) => setSubscriptionData({ ...subscriptionData, plan: e.target.value })}
            options={[
              { value: 'starter', label: 'Starter (Free)' },
              { value: 'pro', label: 'Professional ($49/month)' },
              { value: 'enterprise', label: 'Enterprise ($199/month)' }
            ]}
          />
          <Select
            label="Status"
            value={subscriptionData.status}
            onChange={(e) => setSubscriptionData({ ...subscriptionData, status: e.target.value as any })}
            options={[
              { value: 'trial', label: 'Trial' },
              { value: 'active', label: 'Active' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowSubscriptionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscriptionUpdate} loading={loading}>
              Update Subscription
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUser(null);
          setPasswordData({ newPassword: '', confirmPassword: '' });
        }}
        title={`Send Password Reset - ${selectedUser?.full_name}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900">Password Reset Email</h4>
                <p className="text-sm text-blue-700">
                  This will send a password reset email to <strong>{selectedUser?.email}</strong>
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              The user will receive an email with a secure link to reset their password. 
              This is the recommended and secure way to reset passwords.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• User will get an email with reset instructions</li>
              <li>• Link expires in 24 hours for security</li>
              <li>• User can set their own new password</li>
              <li>• More secure than admin-set passwords</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} loading={loading}>
              Send Reset Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Update Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedUser(null);
        }}
        title={`Update Email - ${selectedUser?.full_name}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="New Email"
            type="email"
            value={emailData.newEmail}
            onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
            required
          />
          <Input
            label="Confirm Email"
            type="email"
            value={emailData.confirmEmail}
            onChange={(e) => setEmailData({ ...emailData, confirmEmail: e.target.value })}
            required
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailUpdate} loading={loading}>
              Update Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};