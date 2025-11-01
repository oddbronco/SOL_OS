import React, { useState } from 'react';
import { Plus, Search, Filter, UserPlus, Upload, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StakeholderTable } from '../components/stakeholders/StakeholderTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { mockStakeholders } from '../data/mockData';
import { Stakeholder } from '../types';
import { openAIService } from '../services/openai';
import { useTheme } from '../contexts/ThemeContext';

export const Stakeholders: React.FC = () => {
  const { isDark } = useTheme();
  const [stakeholders, setStakeholders] = useState(mockStakeholders);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const handleInviteStakeholder = (stakeholder: Stakeholder) => {
    setStakeholders(prev => 
      prev.map(s => 
        s.id === stakeholder.id 
          ? { ...s, status: 'invited' as const }
          : s
      )
    );
  };

  const handleRemoveStakeholder = (stakeholder: Stakeholder) => {
    setStakeholders(prev => prev.filter(s => s.id !== stakeholder.id));
  };

  const handleUploadResponse = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowResponseModal(true);
  };

  const handleFileUpload = async (file: File) => {
    setResponseFile(file);
    setLoading(true);
    
    try {
      let content = '';
      
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        content = await openAIService.transcribeAudio(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        content = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
      
      setResponseText(content);
    } catch (error) {
      console.error('Failed to process file:', error);
      alert('Failed to process file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponse = () => {
    if (!selectedStakeholder || !responseText) return;
    
    // Update stakeholder status to completed
    setStakeholders(prev => 
      prev.map(s => 
        s.id === selectedStakeholder.id 
          ? { ...s, status: 'completed' as const }
          : s
      )
    );
    
    console.log('Saved response for:', selectedStakeholder.name, responseText);
    setShowResponseModal(false);
    setResponseFile(null);
    setResponseText('');
  };
  const filteredStakeholders = stakeholders.filter(stakeholder => {
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || stakeholder.status === statusFilter;
    const matchesRole = roleFilter === 'all' || stakeholder.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'invited', label: 'Invited' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  const uniqueRoles = [...new Set(stakeholders.map(s => s.role))];
  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    ...uniqueRoles.map(role => ({ value: role, label: role }))
  ];

  const getStatusCount = (status: string) => {
    return stakeholders.filter(s => s.status === status).length;
  };

  const getStatusIcon = (status: Stakeholder['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-primary-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'invited':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  return (
    <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        title="Stakeholders" 
        subtitle={`${stakeholders.length} total stakeholders`}
        actions={
          <Button icon={Plus}>
            Add Stakeholder
          </Button>
        }
      />
      
      <div className="p-6">
        {/* Filters */}
        <div className={`rounded-lg shadow-sm border p-4 mb-6 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search stakeholders..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
            />
            <Button variant="outline" icon={Filter} size="sm">
              More Filters
            </Button>
          </div>
        </div>

        {/* Stakeholder Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stakeholders</p>
                <p className="text-2xl font-bold text-gray-900">{stakeholders.length}</p>
              </div>
              <div className="flex items-center space-x-1">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <Badge variant="info">{stakeholders.length}</Badge>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{getStatusCount('pending')}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon('pending')}
                <Badge variant="default">Pending</Badge>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{getStatusCount('in_progress')}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon('in_progress')}
                <Badge variant="warning">Active</Badge>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{getStatusCount('completed')}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon('completed')}
                <Badge variant="success">Done</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Stakeholders Table */}
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stakeholder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStakeholders.map((stakeholder) => (
                  <tr key={stakeholder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={stakeholder.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
                            alt={stakeholder.name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {stakeholder.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {stakeholder.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stakeholder.role}</div>
                      <div className="text-sm text-gray-500">{stakeholder.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(stakeholder.status)}
                        <Badge variant={stakeholder.status === 'completed' ? 'success' : stakeholder.status === 'in_progress' ? 'info' : stakeholder.status === 'invited' ? 'warning' : 'default'}>
                          {stakeholder.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              stakeholder.status === 'completed' ? 'bg-primary-600' : 
                              stakeholder.status === 'in_progress' ? 'bg-blue-600' : 
                              stakeholder.status === 'invited' ? 'bg-yellow-600' : 'bg-gray-400'
                            }`}
                            style={{ 
                              width: stakeholder.status === 'completed' ? '100%' : 
                                     stakeholder.status === 'in_progress' ? '60%' : 
                                     stakeholder.status === 'invited' ? '30%' : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {stakeholder.status === 'completed' ? '100%' : 
                           stakeholder.status === 'in_progress' ? '60%' : 
                           stakeholder.status === 'invited' ? '30%' : '0%'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        {stakeholder.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInviteStakeholder(stakeholder)}
                          >
                            Invite
                          </Button>
                        )}
                        {(stakeholder.status === 'invited' || stakeholder.status === 'in_progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Upload}
                            onClick={() => handleUploadResponse(stakeholder)}
                          >
                            Upload Response
                          </Button>
                        )}
                        {stakeholder.status === 'completed' && (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {filteredStakeholders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No stakeholders found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Response Modal */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        title={`Upload Response - ${selectedStakeholder?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="audio/*,video/*,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              id="response-upload"
            />
            <label htmlFor="response-upload" className="cursor-pointer">
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Upload stakeholder response
                  </p>
                  <p className="text-sm text-gray-500">
                    Audio, video, or text files supported
                  </p>
                </div>
              </div>
            </label>
          </div>
          
          {responseFile && (
            <Card className="bg-primary-50 border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary-900">{responseFile.name}</p>
                  <p className="text-sm text-primary-700">File uploaded successfully</p>
                </div>
              </div>
            </Card>
          )}
          {responseText && (
            <div className="space-y-4">
              <Card>
                <h4 className="font-medium text-gray-900 mb-3">Response Content</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{responseText}</p>
                </div>
              </Card>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowResponseModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveResponse}
                  icon={CheckCircle}
                >
                  Save Response
                </Button>
              </div>
            </div>
          )}
          </div>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Processing response...</p>
            </div>
          )}
      </Modal>
    </div>
  );
};