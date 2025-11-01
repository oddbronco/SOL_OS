import React, { useState } from 'react';
import { TrendingUp, Users, Clock, CheckCircle, BarChart3, PieChart, Calendar, Download, Filter } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatsCard } from '../components/dashboard/StatsCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useTheme } from '../contexts/ThemeContext';

export const Analytics: React.FC = () => {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState('30d');
  const [projectFilter, setProjectFilter] = useState('all');

  const responseRates = [
    { project: 'E-commerce Platform', rate: 85, trend: '+5%', responses: 24, total: 28 },
    { project: 'Mobile Banking App', rate: 72, trend: '+12%', responses: 18, total: 25 },
    { project: 'Data Analytics Dashboard', rate: 95, trend: '+2%', responses: 19, total: 20 }
  ];

  const stakeholderEngagement = [
    { name: 'Sarah Johnson', responses: 24, avgTime: '32m', status: 'active', completion: 100 },
    { name: 'Michael Chen', responses: 18, avgTime: '28m', status: 'active', completion: 85 },
    { name: 'Emily Rodriguez', responses: 12, avgTime: '45m', status: 'pending', completion: 60 },
    { name: 'David Park', responses: 8, avgTime: '22m', status: 'active', completion: 40 },
    { name: 'Lisa Wang', responses: 15, avgTime: '38m', status: 'completed', completion: 100 }
  ];

  const responseTimeData = [
    { day: 'Mon', avgTime: 28 },
    { day: 'Tue', avgTime: 32 },
    { day: 'Wed', avgTime: 25 },
    { day: 'Thu', avgTime: 38 },
    { day: 'Fri', avgTime: 42 },
    { day: 'Sat', avgTime: 35 },
    { day: 'Sun', avgTime: 30 }
  ];

  const projectCompletion = [
    { project: 'E-commerce Platform', completion: 78, stakeholders: 8, completed: 6 },
    { project: 'Mobile Banking App', completion: 45, stakeholders: 12, completed: 5 },
    { project: 'Data Analytics Dashboard', completion: 100, stakeholders: 6, completed: 6 },
    { project: 'CRM Integration', completion: 23, stakeholders: 15, completed: 3 }
  ];

  const exportData = () => {
    const csvData = [
      ['Project', 'Response Rate', 'Stakeholders', 'Completed', 'Avg Response Time'],
      ...responseRates.map(item => [
        item.project,
        `${item.rate}%`,
        item.total,
        item.responses,
        '35m'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        title="Analytics" 
        subtitle="Project insights and performance metrics"
        actions={
          <div className="flex space-x-3">
            <Button variant="outline" icon={Download} onClick={exportData}>
              Export Report
            </Button>
            <Button variant="outline" icon={Filter}>
              Advanced Filters
            </Button>
          </div>
        }
      />
      
      <div className="p-6">
        {/* Filters */}
        <div className={`rounded-lg shadow-sm border p-4 mb-6 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
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
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Projects' },
                { value: 'active', label: 'Active Projects' },
                { value: 'completed', label: 'Completed Projects' }
              ]}
            />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Avg Response Rate"
            value="84%"
            change="+6% from last month"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatsCard
            title="Active Stakeholders"
            value="32"
            change="+8 this week"
            changeType="positive"
            icon={Users}
            iconColor="text-primary-600"
          />
          <StatsCard
            title="Avg Response Time"
            value="35m"
            change="-3m from last week"
            changeType="positive"
            icon={Clock}
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Completion Rate"
            value="78%"
            change="+12% from last month"
            changeType="positive"
            icon={CheckCircle}
            iconColor="text-primary-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Response Rates by Project */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Response Rates by Project</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {responseRates.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{item.project}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{item.rate}%</span>
                      <Badge variant="success" size="sm">{item.trend}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{item.responses} of {item.total} responses</span>
                    <span>{item.rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stakeholder Engagement */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Stakeholder Engagement</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {stakeholderEngagement.map((stakeholder, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {stakeholder.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{stakeholder.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">{stakeholder.responses} responses</p>
                        <div className="w-16 bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              stakeholder.completion === 100 ? 'bg-primary-500' : 
                              stakeholder.completion >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${stakeholder.completion}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{stakeholder.avgTime}</p>
                    <Badge 
                      variant={
                        stakeholder.status === 'completed' ? 'success' : 
                        stakeholder.status === 'active' ? 'info' : 'warning'
                      }
                      size="sm"
                    >
                      {stakeholder.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Response Timeline Chart */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Response Time Trends</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Last 7 days</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2 px-4">
            {responseTimeData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-200 rounded-t-lg flex flex-col justify-end" style={{ height: '200px' }}>
                  <div 
                    className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 ease-out flex items-end justify-center pb-2"
                    style={{ height: `${(day.avgTime / 50) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">{day.avgTime}m</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Project Completion Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Completion Overview</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {projectCompletion.map((project, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{project.project}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {project.completed}/{project.stakeholders} stakeholders
                    </span>
                    <span className="text-sm font-medium text-gray-900">{project.completion}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      project.completion === 100 ? 'bg-primary-600' : 
                      project.completion >= 50 ? 'bg-blue-600' : 'bg-yellow-600'
                    }`}
                    style={{ width: `${project.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};