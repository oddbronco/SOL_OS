import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, Copy, Download, Upload } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface AccessCode {
  id: string;
  code: string;
  description: string;
  plan_id: string;
  max_uses: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  plan?: {
    plan_name: string;
    plan_code: string;
  };
}

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  plan_code: string;
  max_projects: number;
  max_stakeholders_per_project: number;
  max_questions_per_project: number;
}

export const AccessCodeManager: React.FC = () => {
  const { isDark } = useTheme();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    plan_id: '',
    max_uses: 1,
    expires_at: '',
    is_active: true
  });

  useEffect(() => {
    loadAccessCodes();
    loadPlans();
  }, []);

  const loadAccessCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('access_codes')
        .select(`
          *,
          plan:subscription_plans(plan_name, plan_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccessCodes(data || []);
    } catch (error) {
      console.error('Error loading access codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, plan_name, plan_code, max_projects, max_stakeholders_per_project, max_questions_per_project')
        .eq('is_active', true)
        .order('plan_name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCode = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('access_codes')
        .insert({
          ...formData,
          created_by: user?.id,
          expires_at: formData.expires_at || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await loadAccessCodes();
      setShowCreateModal(false);
      resetForm();
      alert('Access code created successfully!');
    } catch (error) {
      console.error('Error creating access code:', error);
      alert(`Failed to create access code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCode = async () => {
    if (!editingCode) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('access_codes')
        .update({
          ...formData,
          expires_at: formData.expires_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCode.id);

      if (error) throw error;

      await loadAccessCodes();
      setShowEditModal(false);
      setEditingCode(null);
      resetForm();
      alert('Access code updated successfully!');
    } catch (error) {
      console.error('Error updating access code:', error);
      alert(`Failed to update access code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this access code?')) return;

    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      await loadAccessCodes();
      alert('Access code deleted successfully!');
    } catch (error) {
      console.error('Error deleting access code:', error);
      alert(`Failed to delete access code: ${error.message}`);
    }
  };

  const handleToggleActive = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', codeId);

      if (error) throw error;
      await loadAccessCodes();
    } catch (error) {
      console.error('Error toggling access code:', error);
      alert(`Failed to toggle access code: ${error.message}`);
    }
  };

  const handleEditCode = (code: AccessCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description,
      plan_id: code.plan_id,
      max_uses: code.max_uses,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      is_active: code.is_active
    });
    setShowEditModal(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Access code copied to clipboard!');
  };

  const exportCodes = () => {
    const csvData = [
      ['Code', 'Description', 'Plan', 'Max Uses', 'Current Uses', 'Status', 'Expires'],
      ...accessCodes.map(code => [
        code.code,
        code.description,
        code.plan?.plan_name || '',
        code.max_uses,
        code.current_uses,
        code.is_active ? 'Active' : 'Inactive',
        code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'access-codes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      plan_id: '',
      max_uses: 1,
      expires_at: '',
      is_active: true
    });
  };

  const renderCodeForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            label="Access Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="SPEAK2025"
            required
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFormData({ ...formData, code: generateRandomCode() })}
          >
            Generate Random Code
          </Button>
        </div>
        <Select
          label="Subscription Plan"
          value={formData.plan_id}
          onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
          options={[
            { value: '', label: 'Select Plan' },
            ...plans.map(plan => ({ 
              value: plan.id, 
              label: `${plan.plan_name} (${plan.max_projects} projects, ${plan.max_stakeholders_per_project} stakeholders)` 
            }))
          ]}
          required
        />
      </div>

      <Input
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="For new enterprise clients"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max Uses"
          type="number"
          value={formData.max_uses}
          onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
          min="1"
          required
        />
        <Input
          label="Expires On (Optional)"
          type="date"
          value={formData.expires_at}
          onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="mr-2"
        />
        <label htmlFor="is_active" className={`text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Active (can be used for signups)
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Access Code Management
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Control who can sign up and assign subscription plans
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            icon={Download}
            onClick={exportCodes}
          >
            Export CSV
          </Button>
          <Button
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            Create Access Code
          </Button>
        </div>
      </div>

      {/* Access Codes List */}
      <div className="space-y-4">
        {accessCodes.map((code) => (
          <Card key={code.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  code.is_active ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <span className={`font-mono font-bold text-sm ${
                    code.is_active ? 'text-primary-600' : 'text-gray-400'
                  }`}>
                    {code.code.substring(0, 4)}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {code.code}
                    </h4>
                    <Badge variant={code.is_active ? 'success' : 'default'}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="info">
                      {code.plan?.plan_name}
                    </Badge>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {code.description}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>Uses: {code.current_uses}/{code.max_uses}</span>
                    {code.expires_at && (
                      <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                    )}
                    <span>Created: {new Date(code.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Copy}
                  onClick={() => copyCode(code.code)}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => handleEditCode(code)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(code.id, code.is_active)}
                >
                  {code.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  onClick={() => handleDeleteCode(code.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {accessCodes.length === 0 && (
        <div className="text-center py-12">
          <div className={`text-gray-500 ${isDark ? 'text-gray-400' : ''}`}>
            <Plus className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No access codes yet</p>
            <p className="text-sm">Create access codes to control signups</p>
          </div>
        </div>
      )}

      {/* Create Access Code Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Access Code"
        size="lg"
      >
        {renderCodeForm()}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateCode}
            loading={loading}
            disabled={!formData.code || !formData.plan_id}
            icon={Save}
          >
            Create Access Code
          </Button>
        </div>
      </Modal>

      {/* Edit Access Code Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCode(null);
          resetForm();
        }}
        title={`Edit Access Code: ${editingCode?.code}`}
        size="lg"
      >
        {renderCodeForm()}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              setShowEditModal(false);
              setEditingCode(null);
              resetForm();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateCode}
            loading={loading}
            disabled={!formData.code || !formData.plan_id}
            icon={Save}
          >
            Update Access Code
          </Button>
        </div>
      </Modal>
    </div>
  );
};