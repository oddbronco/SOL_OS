import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  plan_code: string;
  max_projects: number;
  max_stakeholders_per_project: number;
  max_questions_per_project: number;
  max_file_size_mb: number;
  max_recording_minutes: number;
  price_monthly: number;
  price_yearly: number;
  features: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const SubscriptionPlanManager: React.FC = () => {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plan_name: '',
    plan_code: '',
    max_projects: 3,
    max_stakeholders_per_project: 15,
    max_questions_per_project: 50,
    max_file_size_mb: 100,
    max_recording_minutes: 5,
    price_monthly: 0,
    price_yearly: 0,
    features: {
      ai_features: false,
      custom_branding: false,
      priority_support: false,
      advanced_analytics: false,
      white_label: false,
      api_access: false
    }
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('subscription_plans')
        .insert({
          ...formData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await loadPlans();
      setShowCreateModal(false);
      resetForm();
      alert('Plan created successfully!');
    } catch (error) {
      console.error('Error creating plan:', error);
      alert(`Failed to create plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      await loadPlans();
      setShowEditModal(false);
      setEditingPlan(null);
      resetForm();
      alert('Plan updated successfully!');
    } catch (error) {
      console.error('Error updating plan:', error);
      alert(`Failed to update plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      await loadPlans();
      alert('Plan deleted successfully!');
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(`Failed to delete plan: ${error.message}`);
    }
  };

  const handleToggleActive = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      await loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      alert(`Failed to update plan status: ${error.message}`);
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      plan_code: plan.plan_code,
      max_projects: plan.max_projects,
      max_stakeholders_per_project: plan.max_stakeholders_per_project,
      max_questions_per_project: plan.max_questions_per_project,
      max_file_size_mb: plan.max_file_size_mb,
      max_recording_minutes: plan.max_recording_minutes,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features || {
        ai_features: false,
        custom_branding: false,
        priority_support: false,
        advanced_analytics: false,
        white_label: false,
        api_access: false
      }
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      plan_name: '',
      plan_code: '',
      max_projects: 3,
      max_stakeholders_per_project: 15,
      max_questions_per_project: 50,
      max_file_size_mb: 100,
      max_recording_minutes: 5,
      price_monthly: 0,
      price_yearly: 0,
      features: {
        ai_features: false,
        custom_branding: false,
        priority_support: false,
        advanced_analytics: false,
        white_label: false,
        api_access: false
      }
    });
  };

  const renderPlanForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Plan Name"
          value={formData.plan_name}
          onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
          placeholder="Professional"
          required
        />
        <Input
          label="Plan Code"
          value={formData.plan_code}
          onChange={(e) => setFormData({ ...formData, plan_code: e.target.value.toLowerCase() })}
          placeholder="pro"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Max Projects"
          type="number"
          value={formData.max_projects}
          onChange={(e) => setFormData({ ...formData, max_projects: parseInt(e.target.value) || 0 })}
          min="1"
          required
        />
        <Input
          label="Max Stakeholders/Project"
          type="number"
          value={formData.max_stakeholders_per_project}
          onChange={(e) => setFormData({ ...formData, max_stakeholders_per_project: parseInt(e.target.value) || 0 })}
          min="1"
          required
        />
        <Input
          label="Max Questions/Project"
          type="number"
          value={formData.max_questions_per_project}
          onChange={(e) => setFormData({ ...formData, max_questions_per_project: parseInt(e.target.value) || 0 })}
          min="1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max File Size (MB)"
          type="number"
          value={formData.max_file_size_mb}
          onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) || 0 })}
          min="1"
          required
        />
        <Input
          label="Max Recording (Minutes)"
          type="number"
          value={formData.max_recording_minutes}
          onChange={(e) => setFormData({ ...formData, max_recording_minutes: parseInt(e.target.value) || 0 })}
          min="1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Monthly Price ($)"
          type="number"
          step="0.01"
          value={formData.price_monthly}
          onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
          min="0"
        />
        <Input
          label="Yearly Price ($)"
          type="number"
          step="0.01"
          value={formData.price_yearly}
          onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
          min="0"
        />
      </div>

      <div className="space-y-4">
        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Features</h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(formData.features).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setFormData({
                  ...formData,
                  features: { ...formData.features, [key]: e.target.checked }
                })}
                className="mr-2"
              />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Subscription Plans
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage subscription plans and pricing
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setShowCreateModal(true)}
        >
          Create Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`${
            !plan.is_active ? 'opacity-60' : ''
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.plan_name}
                </h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {plan.plan_code}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={plan.is_active ? 'success' : 'default'}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Projects</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.max_projects}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Stakeholders</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.max_stakeholders_per_project}/project
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Questions</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.max_questions_per_project}/project
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Recording</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.max_recording_minutes}min
                </span>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${plan.price_monthly}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                per month
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                icon={Edit}
                onClick={() => handleEditPlan(plan)}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleActive(plan.id, plan.is_active)}
                className="flex-1"
              >
                {plan.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={Trash2}
                onClick={() => handleDeletePlan(plan.id)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Plan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Subscription Plan"
        size="lg"
      >
        {renderPlanForm()}
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
            onClick={handleCreatePlan}
            loading={loading}
            disabled={!formData.plan_name || !formData.plan_code}
            icon={Save}
          >
            Create Plan
          </Button>
        </div>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPlan(null);
          resetForm();
        }}
        title={`Edit ${editingPlan?.plan_name} Plan`}
        size="lg"
      >
        {renderPlanForm()}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              setShowEditModal(false);
              setEditingPlan(null);
              resetForm();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePlan}
            loading={loading}
            disabled={!formData.plan_name || !formData.plan_code}
            icon={Save}
          >
            Update Plan
          </Button>
        </div>
      </Modal>
    </div>
  );
};