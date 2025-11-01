import React, { useState } from 'react';
import { Plus, TrendingUp, Users, Clock, CheckCircle, ArrowRight, Calendar, Target, Zap, BarChart3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
  onNavigate: (path: string) => void;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalClients: number;
    totalStakeholders: number;
    avgCompletion: number;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNavigate, metrics }) => {
  const { projects } = useSupabaseData();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Get recent projects (last 5)
  const recentProjects = projects.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'success';
      case 'Document Generation': return 'success';
      case 'Gathering Responses': return 'info';
      case 'Stakeholder Outreach': return 'warning';
      case 'Transcript Processing': return 'info';
      case 'Setup': return 'default';
      default: return 'default';
    }
  };

  const quickActions = [
    {
      title: 'Create New Project',
      description: 'Start a new stakeholder discovery project',
      icon: Plus,
      action: () => onNavigate('/projects'),
      color: 'bg-primary-500'
    },
    {
      title: 'Add Client',
      description: 'Add a new client to your portfolio',
      icon: Users,
      action: () => onNavigate('/clients'),
      color: 'bg-primary-500'
    },
    {
      title: 'View Analytics',
      description: 'See detailed project insights',
      icon: BarChart3,
      action: () => onNavigate('/analytics'),
      color: 'bg-primary-500'
    }
  ];

  const isDark = false;

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#f0f4f8'
    }}>
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200"
      style={{
        backgroundColor: '#f0f4f8'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-600">Welcome back! Here's what's happening with your projects.</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              icon={Plus}
              onClick={() => onNavigate('/projects')}
              className="hover:bg-primary-700"
            >
              New Project
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Projects"
            value={metrics.totalProjects}
            change={metrics.totalProjects > 0 ? `+${metrics.totalProjects} this month` : 'Get started'}
            changeType="positive"
            icon={Target}
            iconColor="text-primary-500"
          />
          <StatsCard
            title="Active Projects"
            value={metrics.activeProjects}
            change={`${metrics.completedProjects} completed`}
            changeType="positive"
            icon={Clock}
            iconColor="text-primary-500"
          />
          <StatsCard
            title="Total Clients"
            value={metrics.totalClients}
            change={metrics.totalClients > 0 ? 'Growing portfolio' : 'Add your first client'}
            changeType="positive"
            icon={Users}
            iconColor="text-primary-500"
          />
          <StatsCard
            title="Avg Completion"
            value={`${metrics.avgCompletion}%`}
            change={metrics.avgCompletion > 75 ? 'Excellent progress' : 'Keep going!'}
            changeType={metrics.avgCompletion > 75 ? 'positive' : 'neutral'}
            icon={CheckCircle}
            iconColor="text-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Recent Projects</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigate('/projects')}
                  className="hover:bg-primary-50 hover:border-green-300 hover:text-primary-700"
                >
                  View All
                </Button>
              </div>
              
              {recentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-medium mb-2 text-gray-900">No projects yet</h4>
                  <p className="mb-4 text-gray-600">Create your first project to get started</p>
                  <Button 
                    onClick={() => onNavigate('/projects')}
                    className="hover:bg-primary-700"
                  >
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        isDark 
                          ? 'border-gray-600 hover:border-gray-500' 
                          : 'border-gray-200 hover:bg-white'
                      }`}
                      style={{
                        backgroundColor: isDark ? '#ffffff' : '#f9fafb',
                        color: isDark ? '#2b2b2b' : '#111827'
                      }}
                      onClick={() => onSelectProject(project.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {project.name}
                            {project.isDemo && <Badge variant="info" className="ml-2 text-xs">Demo</Badge>}
                          </h4>
                          <p className="text-sm text-gray-600">{project.client}</p>
                          {project.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-gray-900">{project.progress}%</span>
                        </div>
                        <div className="w-full rounded-full h-2 bg-gray-200">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="text-gray-600">{project.stakeholders_count || 0} stakeholders</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span className="text-gray-600">{new Date(project.dueDate || project.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <Zap className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className="w-full flex items-center p-3 rounded-lg border transition-all hover:shadow-sm hover:border-green-300 border-gray-200 hover:bg-primary-50"
                      style={{
                        backgroundColor: '#f9fafb',
                        color: '#111827'
                      }}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${action.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{action.title}</p>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Activity Feed */}
            <ActivityFeed activities={[]} />
          </div>
        </div>
      </div>
    </div>
  );
};