import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Edit, Mail, Phone, Globe, Calendar, 
  User, CreditCard, RefreshCw, Trash2, ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface Company {
  id: string;
  agency_id: string;
  name: string;
  industry: string;
  email: string;
  phone?: string;
  website?: string;
  contact_person: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  user_id?: string;
  projects_count?: number;
  stakeholders_count?: number;
  linkedin_url?: string;
  description?: string;
  company_size?: string;
  founded_year?: number;
  subscription_plan?: string;
  subscription_status?: string;
  owner?: {
    full_name: string;
    email: string;
  };
}

export const CompanyManagement: React.FC = () => {
  const { isDark } = useTheme();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    contact_person: '',
    linkedin_url: '',
    description: '',
    company_size: '',
    founded_year: 0,
    status: 'active' as 'active' | 'inactive'
  });
  
  const [subscriptionData, setSubscriptionData] = useState({
    plan: 'starter',
    status: 'active' as 'active' | 'trial' | 'cancelled'
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      console.log('🏢 Loading companies...');

      const { data: companiesData, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Companies error:', error);
        setCompanies([]);
        return;
      }

      // Get project counts
      const { data: projectCounts } = await supabase
        .from('projects')
        .select('client_id')
        .not('client_id', 'is', null);

      // Get stakeholder counts
      const { data: stakeholderCounts } = await supabase
        .from('stakeholders')
        .select('project_id')
        .not('project_id', 'is', null);

      const companiesWithData = (companiesData || []).map(company => {
        const projectCount = projectCounts?.filter(p => p.client_id === company.id).length || 0;
        const companyProjectIds = projectCounts?.filter(p => p.client_id === company.id).map(p => p.project_id) || [];
        const stakeholderCount = stakeholderCounts?.filter(s => companyProjectIds.includes(s.project_id)).length || 0;

        return {
          ...company,
          projects_count: projectCount,
          stakeholders_count: stakeholderCount,
          subscription_plan: 'starter',
          subscription_status: 'trial'
        };
      });

      setCompanies(companiesWithData);
      console.log('✅ Loaded companies:', companiesWithData.length);
    } catch (error) {
      console.error('💥 Failed to load companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditData({
      name: company.name,
      industry: company.industry,
      email: company.email,
      phone: company.phone || '',
      website: company.website || '',
      contact_person: company.contact_person,
      linkedin_url: company.linkedin_url || '',
      description: company.description || '',
      company_size: company.company_size || '',
      founded_year: company.founded_year || 0,
      status: company.status
    });
    setShowEditModal(true);
  };

  const handleSaveCompany = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('customers')
        .update({
          ...editData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      await loadCompanies();
      setShowEditModal(false);
      setSelectedCompany(null);
      alert('Company updated successfully!');
    } catch (error) {
      console.error('💥 Failed to update company:', error);
      alert('Failed to update company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionUpdate = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      
      // Log subscription change
      await supabase
        .from('admin_activity_log')
        .insert({
          action: 'company_subscription_updated',
          details: {
            company_id: selectedCompany.id,
            company_name: selectedCompany.name,
            old_plan: selectedCompany.subscription_plan,
            new_plan: subscriptionData.plan,
            old_status: selectedCompany.subscription_status,
            new_status: subscriptionData.status
          }
        });

      await loadCompanies();
      setShowSubscriptionModal(false);
      setSelectedCompany(null);
      alert('Company subscription updated successfully!');
    } catch (error) {
      console.error('💥 Failed to update subscription:', error);
      alert('Failed to update subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      await loadCompanies();
      alert('Company deleted successfully!');
    } catch (error) {
      console.error('💥 Failed to delete company:', error);
      alert('Failed to delete company. Please try again.');
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIndustry = industryFilter === 'all' || company.industry === industryFilter;
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    
    return matchesSearch && matchesIndustry && matchesStatus;
  });

  const uniqueIndustries = [...new Set(companies.map(c => c.industry))].sort();
  
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalProjects = companies.reduce((sum, c) => sum + (c.projects_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Clean Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalCompanies}</div>
          <div className="text-sm text-gray-600">Total Companies</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">{activeCompanies}</div>
          <div className="text-sm text-gray-600">Active Companies</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-600">{totalProjects}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </Card>
      </div>

      {/* Clean Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search companies..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Industries' },
              ...uniqueIndustries.map(industry => ({ value: industry, label: industry }))
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          <Button variant="outline" icon={RefreshCw} onClick={loadCompanies} loading={loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Clean Company Cards */}
      <div className="space-y-3">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="p-4">
            <div className="flex items-center justify-between">
              {/* Company Info - Left Side */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{company.name}</h4>
                    <Badge variant={company.status === 'active' ? 'success' : 'default'} size="sm">
                      {company.status}
                    </Badge>
                    <Badge variant="info" size="sm">
                      {company.industry}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{company.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{company.contact_person}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(company.created_at).toLocaleDateString()}</span>
                    </div>
                    <span>{company.projects_count || 0} projects</span>
                  </div>
                </div>
              </div>

              {/* Actions - Right Side */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => handleEditCompany(company)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={CreditCard}
                  onClick={() => {
                    setSelectedCompany(company);
                    setSubscriptionData({
                      plan: company.subscription_plan || 'starter',
                      status: company.subscription_status as any || 'trial'
                    });
                    setShowSubscriptionModal(true);
                  }}
                >
                  Subscription
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  onClick={() => handleDeleteCompany(company.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && !loading && (
        <Card className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h4 className="text-lg font-medium mb-2 text-gray-900">No companies found</h4>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </Card>
      )}

      {/* Edit Company Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCompany(null);
        }}
        title={`Edit Company - ${selectedCompany?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />
            <Input
              label="Industry"
              value={editData.industry}
              onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={editData.contact_person}
              onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            />
            <Input
              label="Website"
              value={editData.website}
              onChange={(e) => setEditData({ ...editData, website: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="LinkedIn URL"
              value={editData.linkedin_url}
              onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
            />
            <Input
              label="Company Size"
              value={editData.company_size}
              onChange={(e) => setEditData({ ...editData, company_size: e.target.value })}
              placeholder="1-10, 11-50, 51-200, 200+"
            />
          </div>
          
          <Input
            label="Founded Year"
            type="number"
            value={editData.founded_year}
            onChange={(e) => setEditData({ ...editData, founded_year: parseInt(e.target.value) || 0 })}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Company description..."
            />
          </div>
          
          <Select
            label="Status"
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany} loading={loading}>
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
          setSelectedCompany(null);
        }}
        title={`Subscription - ${selectedCompany?.name}`}
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
    </div>
  );
};