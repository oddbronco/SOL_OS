import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Building2, FolderOpen, FileText, Calendar, Download, RefreshCw, MessageSquare, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  totalProjects: number;
  totalStakeholders: number;
  totalDocuments: number;
  totalQuestions: number;
  avgProjectCompletion: number;
  newUsersThisMonth: number;
  newProjectsThisMonth: number;
  completedProjects: number;
  activeProjects: number;
}

interface UsageByPlan {
  plan: string;
  userCount: number;
  projectCount: number;
  avgCompletion: number;
  revenue: number;
}

interface GrowthData {
  date: string;
  users: number;
  projects: number;
  companies: number;
}

export const PlatformAnalytics: React.FC = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    totalProjects: 0,
    totalStakeholders: 0,
    totalDocuments: 0,
    totalQuestions: 0,
    avgProjectCompletion: 0,
    newUsersThisMonth: 0,
    newProjectsThisMonth: 0,
    completedProjects: 0,
    activeProjects: 0
  });
  const [usageByPlan, setUsageByPlan] = useState<UsageByPlan[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading platform analytics...');

      // Calculate date range
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Load all data in parallel
      const [
        authUsersResult,
        usersResult,
        companiesResult,
        projectsResult,
        stakeholdersResult,
        documentsResult,
        questionsResult,
        subscriptionPlansResult
      ] = await Promise.all([
        supabase.auth.admin.listUsers(),
        supabase.from('users').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('stakeholders').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('questions').select('*'),
        supabase.from('subscription_plans').select('*')
      ]);

      const authUsers = authUsersResult.data?.users || [];
      const users = usersResult.data || [];
      const companies = companiesResult.data || [];
      const projects = projectsResult.data || [];
      const stakeholders = stakeholdersResult.data || [];
      const documents = documentsResult.data || [];
      const questions = questionsResult.data || [];
      const subscriptionPlans = subscriptionPlansResult.data || [];

      // Calculate stats
      const totalUsers = authUsers.length;
      const activeUsers = authUsers.filter(u => u.email_confirmed_at).length;
      const newUsersThisMonth = authUsers.filter(u => new Date(u.created_at) > monthAgo).length;
      const newProjectsThisMonth = projects.filter(p => new Date(p.created_at) > monthAgo).length;
      const completedProjects = projects.filter(p => p.status === 'Complete').length;
      const activeProjects = projects.filter(p => p.status !== 'Complete').length;
      const avgProjectCompletion = projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
        : 0;

      setStats({
        totalUsers,
        activeUsers,
        totalCompanies: companies.length,
        totalProjects: projects.length,
        totalStakeholders: stakeholders.length,
        totalDocuments: documents.length,
        totalQuestions: questions.length,
        avgProjectCompletion,
        newUsersThisMonth,
        newProjectsThisMonth,
        completedProjects,
        activeProjects
      });

      // Calculate usage by plan
      const planUsage = subscriptionPlans.map(plan => {
        const planUsers = users.filter(u => (u.subscription_plan || 'starter') === plan.plan_code);
        const planProjects = projects.filter(p => {
          const projectUser = users.find(u => u.id === p.user_id);
          return (projectUser?.subscription_plan || 'starter') === plan.plan_code;
        });

        const avgCompletion = planProjects.length > 0
          ? Math.round(planProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / planProjects.length)
          : 0;

        return {
          plan: plan.plan_name,
          userCount: planUsers.length,
          projectCount: planProjects.length,
          avgCompletion,
          revenue: planUsers.length * (plan.price_monthly || 0)
        };
      });

      setUsageByPlan(planUsage);

      // Calculate growth data for the last 30 days
      const growthData: GrowthData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        const usersUpToDate = authUsers.filter(u => new Date(u.created_at) <= date).length;
        const projectsUpToDate = projects.filter(p => new Date(p.created_at) <= date).length;
        const companiesUpToDate = companies.filter(c => new Date(c.created_at) <= date).length;

        growthData.push({
          date: dateStr,
          users: usersUpToDate,
          projects: projectsUpToDate,
          companies: companiesUpToDate
        });
      }

      setGrowthData(growthData);
      console.log('✅ Analytics loaded successfully');
    } catch (error) {
      console.error('💥 Failed to load analytics:', error);
      // Don't show alert on load - just log the error
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', stats.totalUsers],
      ['Active Users', stats.activeUsers],
      ['Total Companies', stats.totalCompanies],
      ['Total Projects', stats.totalProjects],
      ['Active Projects', stats.activeProjects],
      ['Completed Projects', stats.completedProjects],
      ['Total Stakeholders', stats.totalStakeholders],
      ['Total Documents', stats.totalDocuments],
      ['Total Questions', stats.totalQuestions],
      ['Avg Project Completion', `${stats.avgProjectCompletion}%`],
      ['New Users This Month', stats.newUsersThisMonth],
      ['New Projects This Month', stats.newProjectsThisMonth],
      ['', ''],
      ['Usage by Plan', ''],
      ['Plan', 'Users', 'Projects', 'Avg Completion', 'Monthly Revenue'],
      ...usageByPlan.map(plan => [plan.plan, plan.userCount, plan.projectCount, `${plan.avgCompletion}%`, `$${plan.revenue}`])
    ];

    const csvContent = csvData.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
          />
          <Button variant="outline" icon={RefreshCw} onClick={loadAnalytics} loading={loading}>
            Refresh
          </Button>
        </div>
        <Button variant="outline" icon={Download} onClick={exportAnalytics}>
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card padding="sm" className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-xs text-primary-600 mt-1">+{stats.newUsersThisMonth} this month</div>
        </Card>

        <Card padding="sm" className="text-center">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-primary-500" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</div>
          <div className="text-sm text-gray-600">Companies</div>
          <div className="text-xs text-blue-600 mt-1">{stats.activeUsers} active users</div>
        </Card>

        <Card padding="sm" className="text-center">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
          <div className="text-sm text-gray-600">Projects</div>
          <div className="text-xs text-primary-600 mt-1">+{stats.newProjectsThisMonth} this month</div>
        </Card>

        <Card padding="sm" className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalStakeholders}</div>
          <div className="text-sm text-gray-600">Stakeholders</div>
          <div className="text-xs text-blue-600 mt-1">{stats.avgProjectCompletion}% avg completion</div>
        </Card>

        <Card padding="sm" className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</div>
          <div className="text-sm text-gray-600">Documents</div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalQuestions} questions</div>
        </Card>
      </div>

      {/* Usage by Plan */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Usage by Subscription Plan</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>

        <div className="space-y-4">
          {usageByPlan.map((planData) => (
            <div key={planData.plan} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant={planData.plan.toLowerCase().includes('enterprise') ? 'error' : planData.plan.toLowerCase().includes('pro') ? 'success' : 'info'}>
                    {planData.plan.toUpperCase()}
                  </Badge>
                  <span className="font-medium text-gray-900">{planData.userCount} users</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">{planData.projectCount} projects</div>
                  <div className="text-xs text-gray-500">{planData.avgCompletion}% avg completion</div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">{planData.userCount}</div>
                  <div className="text-gray-600">Users</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">{planData.projectCount}</div>
                  <div className="text-gray-600">Projects</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">{planData.avgCompletion}%</div>
                  <div className="text-gray-600">Completion</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">${planData.revenue}</div>
                  <div className="text-gray-600">Monthly Revenue</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Growth Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="font-medium text-gray-900">{stats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="font-medium text-gray-900">{stats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New This Month</span>
              <span className="font-medium text-primary-600">+{stats.newUsersThisMonth}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}% activation rate
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Projects</span>
              <span className="font-medium text-gray-900">{stats.totalProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Projects</span>
              <span className="font-medium text-blue-600">{stats.activeProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed Projects</span>
              <span className="font-medium text-primary-600">{stats.completedProjects}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.avgProjectCompletion}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {stats.avgProjectCompletion}% average completion rate
            </div>
          </div>
        </Card>
      </div>

      {/* Content & Engagement Stats */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Content & Engagement</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalStakeholders}</div>
            <div className="text-sm text-gray-600">Total Stakeholders</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalProjects > 0 ? Math.round(stats.totalStakeholders / stats.totalProjects) : 0} avg per project
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalProjects > 0 ? Math.round(stats.totalQuestions / stats.totalProjects) : 0} avg per project
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</div>
            <div className="text-sm text-gray-600">Generated Documents</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalProjects > 0 ? Math.round(stats.totalDocuments / stats.totalProjects) : 0} avg per project
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgProjectCompletion}%</div>
            <div className="text-sm text-gray-600">Avg Completion</div>
            <div className="text-xs text-gray-500 mt-1">
              Platform-wide average
            </div>
          </div>
        </div>
      </Card>

      {/* Revenue Summary */}
      {usageByPlan.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Summary</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-900">
                ${usageByPlan.reduce((sum, plan) => sum + plan.revenue, 0)}
              </div>
              <div className="text-sm text-primary-700">Monthly Recurring Revenue</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">
                ${usageByPlan.reduce((sum, plan) => sum + plan.revenue, 0) * 12}
              </div>
              <div className="text-sm text-blue-700">Annual Recurring Revenue</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">
                ${Math.round(usageByPlan.reduce((sum, plan) => sum + plan.revenue, 0) / Math.max(stats.totalUsers, 1))}
              </div>
              <div className="text-sm text-purple-700">Average Revenue Per User</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};