import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Edit, Mail, Phone, Building2, Calendar, Linkedin, MapPin, User, Globe } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface PlatformStakeholder {
  id: string;
  project_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  seniority?: string;
  experience_years?: number;
  interview_password?: string;
  status: 'pending' | 'invited' | 'responded' | 'completed';
  mentioned_context?: string;
  created_at: string;
  updated_at: string;
  project?: {
    name: string;
    client_id: string;
  };
  client_company?: string;
  project_owner?: string;
  // Extended fields
  linkedin_url?: string;
  mobile_phone?: string;
  company?: string;
  location?: string;
  bio?: string;
}

export const AllStakeholders: React.FC = () => {
  const { isDark } = useTheme();
  const [stakeholders, setStakeholders] = useState<PlatformStakeholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<PlatformStakeholder | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    mobile_phone: '',
    seniority: '',
    experience_years: 0,
    linkedin_url: '',
    company: '',
    location: '',
    bio: '',
    status: 'pending' as 'pending' | 'invited' | 'responded' | 'completed',
    mentioned_context: ''
  });

  useEffect(() => {
    loadStakeholders();
  }, []);

  const loadStakeholders = async () => {
    try {
      setLoading(true);
      console.log('👥 Loading all stakeholders...');

      // Get stakeholders with project and client information
      const { data: stakeholdersData, error: stakeholdersError } = await supabase
        .from('stakeholders')
        .select('*')
        .order('created_at', { ascending: false });

      if (stakeholdersError) {
        console.error('❌ Stakeholders error:', stakeholdersError);
        throw stakeholdersError;
      }

      // Get project and client data for each stakeholder
      const stakeholdersWithData = await Promise.all(
        (stakeholdersData || []).map(async (stakeholder) => {
          let projectData = null;
          let clientData = null;
          let ownerData = null;

          try {
            // Get project data
            const { data: project } = await supabase
              .from('projects')
              .select('name, client_id, user_id')
              .eq('id', stakeholder.project_id)
              .single();

            if (project) {
              projectData = project;

              // Get client data
              const { data: client } = await supabase
                .from('clients')
                .select('name')
                .eq('id', project.client_id)
                .single();

              clientData = client;

              // Get project owner data
              const { data: owner } = await supabase
                .from('users')
                .select('full_name, email')
                .eq('id', project.user_id)
                .single();

              ownerData = owner;
            }
          } catch (error) {
            console.warn('⚠️ Could not load related data for stakeholder:', stakeholder.id);
          }

          return {
            ...stakeholder,
            project: projectData,
            client_company: clientData?.name || 'Unknown Company',
            project_owner: ownerData?.full_name || 'Unknown User'
          };
        })
      );

      setStakeholders(stakeholdersWithData);
      console.log('✅ Loaded stakeholders:', stakeholdersWithData.length);
    } catch (error) {
      console.error('💥 Failed to load stakeholders:', error);
      // Don't show alert on load - just log the error
    } finally {
      setLoading(false);
    }
  };

  const handleEditStakeholder = (stakeholder: PlatformStakeholder) => {
    setSelectedStakeholder(stakeholder);
    setEditData({
      name: stakeholder.name,
      email: stakeholder.email,
      role: stakeholder.role,
      department: stakeholder.department,
      phone: stakeholder.phone || '',
      mobile_phone: stakeholder.mobile_phone || '',
      seniority: stakeholder.seniority || '',
      experience_years: stakeholder.experience_years || 0,
      linkedin_url: stakeholder.linkedin_url || '',
      company: stakeholder.company || '',
      location: stakeholder.location || '',
      bio: stakeholder.bio || '',
      status: stakeholder.status,
      mentioned_context: stakeholder.mentioned_context || ''
    });
    setShowEditModal(true);
  };

  const handleSaveStakeholder = async () => {
    if (!selectedStakeholder) return;

    try {
      setLoading(true);
      console.log('💾 Updating stakeholder:', selectedStakeholder.id);

      const { error } = await supabase
        .from('stakeholders')
        .update({
          ...editData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStakeholder.id);

      if (error) {
        console.error('❌ Update stakeholder error:', error);
        throw error;
      }

      console.log('✅ Stakeholder updated successfully');
      await loadStakeholders();
      setShowEditModal(false);
      setSelectedStakeholder(null);
      alert('Stakeholder updated successfully!');
    } catch (error) {
      console.error('💥 Failed to update stakeholder:', error);
      alert('Failed to update stakeholder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStakeholders = stakeholders.filter(stakeholder => {
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (stakeholder.client_company && stakeholder.client_company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (stakeholder.project?.name && stakeholder.project.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || stakeholder.status === statusFilter;
    const matchesRole = roleFilter === 'all' || stakeholder.role === roleFilter;
    const matchesCompany = companyFilter === 'all' || stakeholder.client_company === companyFilter;
    
    return matchesSearch && matchesStatus && matchesRole && matchesCompany;
  });

  const uniqueRoles = [...new Set(stakeholders.map(s => s.role))].sort();
  const uniqueCompanies = [...new Set(stakeholders.map(s => s.client_company))].sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'responded': return 'info';
      case 'invited': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const totalStakeholders = stakeholders.length;
  const completedStakeholders = stakeholders.filter(s => s.status === 'completed').length;
  const activeStakeholders = stakeholders.filter(s => ['invited', 'responded'].includes(s.status)).length;
  const pendingStakeholders = stakeholders.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalStakeholders}</div>
          <div className="text-sm text-gray-600">Total Stakeholders</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-primary-600">{completedStakeholders}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-orange-600">{activeStakeholders}</div>
          <div className="text-sm text-gray-600">Active</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-gray-600">{pendingStakeholders}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search stakeholders..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'invited', label: 'Invited' },
                { value: 'responded', label: 'Responded' },
                { value: 'completed', label: 'Completed' }
              ]}
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Roles' },
                ...uniqueRoles.map(role => ({ value: role, label: role }))
              ]}
            />
            <Select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Companies' },
                ...uniqueCompanies.map(company => ({ value: company, label: company }))
              ]}
            />
            <Button variant="outline" icon={Filter} onClick={loadStakeholders} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Stakeholders Table - Responsive */}
      <Card padding="sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stakeholder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project & Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStakeholders.map((stakeholder) => (
                <tr key={stakeholder.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">
                            {stakeholder.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          <span className="truncate">{stakeholder.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {stakeholder.seniority && `${stakeholder.seniority} • `}
                          {stakeholder.experience_years && `${stakeholder.experience_years} years exp`}
                        </div>
                        {stakeholder.location && (
                          <div className="text-xs text-gray-400 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {stakeholder.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{stakeholder.role}</div>
                    <div className="text-sm text-gray-500">{stakeholder.department}</div>
                    <div className="text-xs text-gray-400 flex items-center mt-1">
                      <Building2 className="h-3 w-3 mr-1" />
                      <span className="truncate">{stakeholder.client_company}</span>
                    </div>
                    {stakeholder.company && (
                      <div className="text-xs text-gray-400">
                        Company: {stakeholder.company}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{stakeholder.email}</span>
                      </div>
                      {stakeholder.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{stakeholder.phone}</span>
                        </div>
                      )}
                      {stakeholder.mobile_phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{stakeholder.mobile_phone} (mobile)</span>
                        </div>
                      )}
                      {stakeholder.linkedin_url && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Linkedin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <a href={stakeholder.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate">
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <Badge variant={getStatusColor(stakeholder.status)} size="sm">
                        {stakeholder.status}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        <div className="truncate">Project: {stakeholder.project?.name || 'Unknown'}</div>
                        <div className="truncate">Owner: {stakeholder.project_owner}</div>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(stakeholder.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Edit}
                      onClick={() => handleEditStakeholder(stakeholder)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredStakeholders.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className={`h-12 w-12 mx-auto mb-4 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <h4 className={`text-lg font-medium mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            No stakeholders found
          </h4>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {loading && stakeholders.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading stakeholders...</p>
        </div>
      )}

      {/* Edit Stakeholder Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStakeholder(null);
        }}
        title={`Edit Stakeholder - ${selectedStakeholder?.name}`}
        size="xl"
      >
        {selectedStakeholder && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Basic Information</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="John Smith"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="john@company.com"
                  required
                />
              </div>
            </div>

            {/* Role & Experience */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Role & Experience</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Role"
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  placeholder="Product Manager"
                  required
                />
                <Input
                  label="Department"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  placeholder="Product"
                  required
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <Input
                  label="Seniority"
                  value={editData.seniority}
                  onChange={(e) => setEditData({ ...editData, seniority: e.target.value })}
                  placeholder="Senior, Mid, Junior, Lead, Director"
                />
                <Input
                  label="Experience (Years)"
                  type="number"
                  value={editData.experience_years}
                  onChange={(e) => setEditData({ ...editData, experience_years: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
                <Select
                  label="Status"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'invited', label: 'Invited' },
                    { value: 'responded', label: 'Responded' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Contact Information</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
                <Input
                  label="Mobile Phone"
                  value={editData.mobile_phone}
                  onChange={(e) => setEditData({ ...editData, mobile_phone: e.target.value })}
                  placeholder="+1 (555) 987-6543"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Input
                  label="LinkedIn URL"
                  value={editData.linkedin_url}
                  onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
                <Input
                  label="Location"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            {/* Company & Context */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Company & Context</h4>
              <Input
                label="Company"
                value={editData.company}
                onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                placeholder="Acme Corp"
                className="mb-4"
              />
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Bio / Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Additional information about this stakeholder..."
                />
              </div>

              <div className="space-y-2 mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Context from Transcript
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={editData.mentioned_context}
                  onChange={(e) => setEditData({ ...editData, mentioned_context: e.target.value })}
                  placeholder="Context from where this stakeholder was mentioned..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStakeholder(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStakeholder}
                loading={loading}
                disabled={!editData.name || !editData.email || !editData.role}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};