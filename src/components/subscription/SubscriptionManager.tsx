import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, AlertCircle, CheckCircle, X, Phone } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { User } from '../../hooks/useAuth';

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
}

interface SubscriptionManagerProps {
  user: User;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ user }) => {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentUsage, setCurrentUsage] = useState({
    projects: 0,
    stakeholders: 0,
    questions: 0
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlans();
    loadCurrentUsage();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadCurrentUsage = async () => {
    try {
      // Get current usage from projects, stakeholders, questions
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      const projectIds = projectsData?.map(p => p.id) || [];

      const [stakeholdersResult, questionsResult] = await Promise.all([
        projectIds.length > 0 
          ? supabase.from('stakeholders').select('id').in('project_id', projectIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from('questions').select('id').in('project_id', projectIds)
          : Promise.resolve({ data: [] })
      ]);

      setCurrentUsage({
        projects: projectsData?.length || 0,
        stakeholders: stakeholdersResult.data?.length || 0,
        questions: questionsResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const handleUpgradeRequest = async () => {
    if (!selectedPlan || !phoneNumber) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          request_type: 'upgrade',
          current_plan: user.subscription.plan,
          requested_plan: selectedPlan,
          contact_phone: phoneNumber,
          reason: `Upgrade request from ${user.subscription.plan} to ${selectedPlan}`
        });

      if (error) throw error;

      alert('Upgrade request submitted! Our team will contact you within 24 hours.');
      setShowUpgradeModal(false);
      setSelectedPlan('');
      setPhoneNumber('');
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      alert('Failed to submit upgrade request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelReason) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          request_type: 'cancel',
          current_plan: user.subscription.plan,
          reason: cancelReason
        });

      if (error) throw error;

      alert('Cancellation request submitted. We will process this within 24 hours and contact you with next steps.');
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      alert('Failed to submit cancellation request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.plan_code === user.subscription.plan);
  const isAtLimit = (current: number, max: number) => current >= max;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className={isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDark ? 'bg-blue-800' : 'bg-blue-100'
            }`}>
              <Crown className={`h-6 w-6 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-blue-300' : 'text-blue-900'
              }`}>
                {currentPlan?.plan_name || user.subscription.plan} Plan
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-blue-200' : 'text-blue-700'
              }`}>
                {currentPlan?.price_monthly ? `$${currentPlan.price_monthly}/month` : 'Free'}
              </p>
            </div>
          </div>
          <Badge variant="info" className="text-lg px-4 py-2">
            {user.subscription.status.toUpperCase()}
          </Badge>
        </div>
      </Card>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Projects</p>
              <p className={`text-2xl font-bold ${
                isAtLimit(currentUsage.projects, currentPlan?.max_projects || 3)
                  ? 'text-red-600' : isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {currentUsage.projects} / {currentPlan?.max_projects || user.subscription.maxProjects}
              </p>
            </div>
            {isAtLimit(currentUsage.projects, currentPlan?.max_projects || 3) && (
              <AlertCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div className={`w-full rounded-full h-2 mt-2 ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isAtLimit(currentUsage.projects, currentPlan?.max_projects || 3)
                  ? 'bg-red-500' : 'bg-primary-500'
              }`}
              style={{ 
                width: `${Math.min(100, (currentUsage.projects / (currentPlan?.max_projects || 3)) * 100)}%` 
              }}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Stakeholders</p>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {currentUsage.stakeholders}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Max {currentPlan?.max_stakeholders_per_project || user.subscription.maxStakeholders} per project
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-primary-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Questions</p>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {currentUsage.questions}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Max {currentPlan?.max_questions_per_project || user.subscription.maxQuestions} per project
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-primary-500" />
          </div>
        </Card>
      </div>

      {/* Plan Limits */}
      <Card>
        <h4 className={`font-medium mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Current Plan Limits</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Max Projects</p>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentPlan?.max_projects || user.subscription.maxProjects}
            </p>
          </div>
          <div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Stakeholders/Project</p>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentPlan?.max_stakeholders_per_project || user.subscription.maxStakeholders}
            </p>
          </div>
          <div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Questions/Project</p>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentPlan?.max_questions_per_project || user.subscription.maxQuestions}
            </p>
          </div>
          <div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Recording Limit</p>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentPlan?.max_recording_minutes || user.subscription.maxRecordingMinutes} minutes
            </p>
          </div>
        </div>
      </Card>

      {/* Available Plans */}
      <Card>
        <h4 className={`font-medium mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>Available Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.plan_code === user.subscription.plan;
            
            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 ${
                  isCurrent 
                    ? 'border-blue-500 bg-blue-50' 
                    : isDark ? 'border-gray-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className={`font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{plan.plan_name}</h5>
                  {isCurrent && <Badge variant="info">Current</Badge>}
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
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ${plan.price_monthly}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    per month
                  </p>
                </div>
                
                {!isCurrent && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan(plan.plan_code);
                      setShowUpgradeModal(true);
                    }}
                  >
                    Upgrade to {plan.plan_name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setShowCancelModal(true)}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Cancel Subscription
        </Button>
        
        <Button
          icon={TrendingUp}
          onClick={() => setShowUpgradeModal(true)}
        >
          Request Upgrade
        </Button>
      </div>

      {/* Upgrade Modal */}
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
              Upgrade Request Process
            </h4>
            <p className={`text-sm ${
              isDark ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Our team will contact you within 24 hours to process your upgrade and handle billing.
            </p>
          </div>

          <Select
            label="Select New Plan"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            options={[
              { value: '', label: 'Choose a plan...' },
              ...plans
                .filter(p => p.plan_code !== user.subscription.plan)
                .map(p => ({ 
                  value: p.plan_code, 
                  label: `${p.plan_name} - $${p.price_monthly}/month` 
                }))
            ]}
          />

          <Input
            label="Phone Number"
            type="tel"
            icon={Phone}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            required
          />

          <div className={`text-sm ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <p className="mb-2"><strong>Current Information:</strong></p>
            <ul className="space-y-1">
              <li>• Name: {user.fullName}</li>
              <li>• Email: {user.email}</li>
              <li>• Company: {user.companyName}</li>
              <li>• Current Plan: {user.subscription.plan}</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedPlan('');
                setPhoneNumber('');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgradeRequest}
              loading={loading}
              disabled={!selectedPlan || !phoneNumber}
            >
              Submit Upgrade Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
        title="Cancel Subscription"
        size="md"
      >
        <div className="space-y-6">
          <div className={`rounded-lg p-4 ${
            isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              <AlertCircle className={`h-5 w-5 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`} />
              <div>
                <h4 className={`font-medium ${
                  isDark ? 'text-red-300' : 'text-red-800'
                }`}>
                  Subscription Cancellation
                </h4>
                <p className={`text-sm ${
                  isDark ? 'text-red-200' : 'text-red-700'
                }`}>
                  Your cancellation will be processed within 24 hours. You'll retain access until your current billing period ends.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Reason for cancellation (optional)
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                isDark 
                  ? 'border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              style={{
                backgroundColor: isDark ? '#2b2b2b' : '#ffffff'
              }}
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Help us improve by sharing why you're canceling..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
              disabled={loading}
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelRequest}
              loading={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              Submit Cancellation Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};