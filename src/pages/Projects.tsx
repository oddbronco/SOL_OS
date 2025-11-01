import React, { useState } from 'react';
import { Plus, Search, FolderOpen, Users, Calendar, ArrowRight, Filter, X, Upload, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface ProjectsProps {
  onSelectProject: (projectId: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ onSelectProject }) => {
  const { projects, clients, addProject, addClient } = useSupabaseData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [returnToProjectModal, setReturnToProjectModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    dueDateFrom: '',
    dueDateTo: '',
    createdDateFrom: '',
    createdDateTo: '',
    sortBy: 'created_desc' as 'created_desc' | 'created_asc' | 'due_desc' | 'due_asc' | 'name_asc' | 'name_desc'
  });
  const [newProject, setNewProject] = useState({
    name: '',
    clientId: '',
    dueDate: ''
  });
  const [newClient, setNewClient] = useState({
    name: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    contact_person: ''
  });

  const handleAddClient = () => {
    const clientPromise = addClient({
      ...newClient,
      status: 'active' as const
    });
    
    clientPromise.then(client => {
      // If we came from project modal, select the new client and return
      if (returnToProjectModal && client) {
        setNewProject({ ...newProject, clientId: client.id });
        setReturnToProjectModal(false);
        setShowCreateModal(true);
      }
    });
    
    setNewClient({
      name: '',
      industry: '',
      email: '',
      phone: '',
      website: '',
      contact_person: ''
    });
    setShowClientModal(false);
  };

  const handleCreateProject = () => {
    const client = clients.find(c => c.id === newProject.clientId);
    if (!client) return;
    
    const projectPromise = addProject({
      client_id: client.id,
      name: newProject.name,
      due_date: newProject.dueDate
    });
    
    projectPromise.then(project => {
      if (project) {
        console.log('🎯 Navigating to project:', project.id);
        onSelectProject(project.id);
      }
    });
    
    setNewProject({ name: '', clientId: '', dueDate: '' });
    setShowCreateModal(false);
  };

  const handleCreateClientFromProject = () => {
    setReturnToProjectModal(true);
    setShowCreateModal(false);
    setShowClientModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate it's a valid export
      if (!data.metadata || !data.project || data.metadata.version !== '2.0') {
        alert('Invalid backup file. Please select a valid Clarity OS backup JSON file.');
        return;
      }

      setImportFile(file);
      setImportPreview(data);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please ensure it\'s a valid JSON file.');
    }
  };

  const handleImportProject = async () => {
    if (!importPreview) return;

    try {
      setImporting(true);

      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to import projects');
        return;
      }

      // Import project (remove old IDs to create new ones)
      const projectData = { ...importPreview.project };
      delete projectData.id;
      delete projectData.created_at;
      delete projectData.updated_at;

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          name: `${projectData.name} (Imported)`,
          customer_id: user.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Import stakeholders
      const stakeholderMap = new Map();
      for (const stakeholder of importPreview.stakeholders) {
        const oldId = stakeholder.id;
        delete stakeholder.id;
        delete stakeholder.created_at;
        delete stakeholder.updated_at;

        const { data: newStakeholder } = await supabase
          .from('stakeholders')
          .insert({ ...stakeholder, project_id: newProject.id })
          .select()
          .single();

        if (newStakeholder) stakeholderMap.set(oldId, newStakeholder.id);
      }

      // Import questions
      const questionMap = new Map();
      for (const question of importPreview.questions) {
        const oldId = question.id;
        delete question.id;
        delete question.created_at;
        delete question.updated_at;

        const { data: newQuestion } = await supabase
          .from('questions')
          .insert({ ...question, project_id: newProject.id })
          .select()
          .single();

        if (newQuestion) questionMap.set(oldId, newQuestion.id);
      }

      // Import interviews
      const interviewMap = new Map();
      for (const interview of importPreview.interviews) {
        const oldId = interview.id;
        delete interview.id;
        delete interview.created_at;
        delete interview.updated_at;

        // Map old stakeholder ID to new
        if (interview.stakeholder_id && stakeholderMap.has(interview.stakeholder_id)) {
          interview.stakeholder_id = stakeholderMap.get(interview.stakeholder_id);
        }

        const { data: newInterview } = await supabase
          .from('interview_sessions')
          .insert({ ...interview, project_id: newProject.id })
          .select()
          .single();

        if (newInterview) interviewMap.set(oldId, newInterview.id);
      }

      // Import responses
      for (const response of importPreview.responses) {
        delete response.id;
        delete response.created_at;

        // Map old IDs to new
        if (response.interview_id && interviewMap.has(response.interview_id)) {
          response.interview_id = interviewMap.get(response.interview_id);
        }
        if (response.question_id && questionMap.has(response.question_id)) {
          response.question_id = questionMap.get(response.question_id);
        }
        if (response.stakeholder_id && stakeholderMap.has(response.stakeholder_id)) {
          response.stakeholder_id = stakeholderMap.get(response.stakeholder_id);
        }

        await supabase
          .from('interview_responses')
          .insert({ ...response, project_id: newProject.id });
      }

      // Import question assignments
      for (const assignment of importPreview.question_assignments || []) {
        delete assignment.id;
        delete assignment.created_at;

        // Map old IDs
        if (assignment.stakeholder_id && stakeholderMap.has(assignment.stakeholder_id)) {
          assignment.stakeholder_id = stakeholderMap.get(assignment.stakeholder_id);
        }
        if (assignment.question_id && questionMap.has(assignment.question_id)) {
          assignment.question_id = questionMap.get(assignment.question_id);
        }

        await supabase
          .from('question_assignments')
          .insert({ ...assignment, project_id: newProject.id });
      }

      alert(`Project imported successfully! Name: ${newProject.name}`);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);

      // Reload projects or navigate to new project
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert(`Error importing project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

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

  const clearFilters = () => {
    setFilters({
      status: 'all',
      client: 'all',
      dueDateFrom: '',
      dueDateTo: '',
      createdDateFrom: '',
      createdDateTo: '',
      sortBy: 'created_desc'
    });
    setSearchTerm('');
  };

  const hasActiveFilters =
    searchTerm ||
    filters.status !== 'all' ||
    filters.client !== 'all' ||
    filters.dueDateFrom ||
    filters.dueDateTo ||
    filters.createdDateFrom ||
    filters.createdDateTo;

  const uniqueStatuses = [...new Set(projects.map(p => p.status))];
  const uniqueClients = [...new Set(projects.map(p => p.client))];

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filters.status === 'all' || project.status === filters.status;
      const matchesClient = filters.client === 'all' || project.client === filters.client;

      const projectDueDate = new Date(project.dueDate);
      const matchesDueDateFrom = !filters.dueDateFrom || projectDueDate >= new Date(filters.dueDateFrom);
      const matchesDueDateTo = !filters.dueDateTo || projectDueDate <= new Date(filters.dueDateTo);

      const projectCreatedDate = new Date(project.created_at);
      const matchesCreatedFrom = !filters.createdDateFrom || projectCreatedDate >= new Date(filters.createdDateFrom);
      const matchesCreatedTo = !filters.createdDateTo || projectCreatedDate <= new Date(filters.createdDateTo);

      return matchesSearch && matchesStatus && matchesClient &&
             matchesDueDateFrom && matchesDueDateTo &&
             matchesCreatedFrom && matchesCreatedTo;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'due_desc':
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        case 'due_asc':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#e8e6e1'
    }}>
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200"
      style={{
        backgroundColor: '#e8e6e1'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-gray-600">{projects.length} total projects</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              icon={Upload}
              onClick={() => setShowImportModal(true)}
            >
              Import Project
            </Button>
            <Button
              icon={Plus}
              onClick={() => setShowCreateModal(true)}
            >
              New Project
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search projects..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                icon={X}
                onClick={clearFilters}
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    ...uniqueStatuses.map(status => ({ value: status, label: status }))
                  ]}
                />

                <Select
                  label="Client"
                  value={filters.client}
                  onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                  options={[
                    { value: 'all', label: 'All Clients' },
                    ...uniqueClients.map(client => ({ value: client, label: client }))
                  ]}
                />

                <Select
                  label="Sort By"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                  options={[
                    { value: 'created_desc', label: 'Newest First' },
                    { value: 'created_asc', label: 'Oldest First' },
                    { value: 'due_desc', label: 'Due Date (Latest)' },
                    { value: 'due_asc', label: 'Due Date (Earliest)' },
                    { value: 'name_asc', label: 'Name (A-Z)' },
                    { value: 'name_desc', label: 'Name (Z-A)' }
                  ]}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Active Filters</label>
                  <div className="text-sm text-gray-600">
                    {filteredProjects.length} of {projects.length} projects
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Due Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.dueDateFrom}
                      onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.dueDateTo}
                      onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Created Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.createdDateFrom}
                      onChange={(e) => setFilters({ ...filters, createdDateFrom: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.createdDateTo}
                      onChange={(e) => setFilters({ ...filters, createdDateTo: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1 text-gray-900">
                      {project.name}
                      {project.isDemo && <Badge variant="info" className="ml-2 text-xs">Demo</Badge>}
                    </h3>
                    <p className="text-sm text-gray-600">{project.client}</p>
                    {project.description && (
                      <p className="text-xs mt-1 line-clamp-2 text-gray-500">{project.description}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>

              <div className="mb-4">
                <Badge variant={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{project.progress}%</span>
                </div>
                
                <div className="w-full rounded-full h-2 bg-gray-200">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{project.stakeholders_count} stakeholders</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No projects found</h3>
            <p className="mb-4 text-gray-600">Create your first project to get started</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Project
            </Button>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setReturnToProjectModal(false);
        }}
        title="Create New Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            placeholder="E-commerce Platform Redesign"
            required
          />
          
          <Select
            label="Client"
            value={newProject.clientId}
            onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
            options={[
              { value: '', label: 'Select a client' },
              ...clients.map(client => ({ value: client.id, label: client.name }))
            ]}
          />
          
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateClientFromProject}
            >
              + Add New Client
            </Button>
            {clients.length === 0 && (
              <span className="text-sm text-amber-600">
                No clients yet - add one to continue
              </span>
            )}
          </div>
          
          {clients.length === 0 && !returnToProjectModal && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                You need to add a client first. Click "Add New Client" above to get started.
              </p>
            </div>
          )}
          
          <Input
            label="Due Date"
            type="date"
            value={newProject.dueDate}
            onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
            required
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                setReturnToProjectModal(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!newProject.name || !newProject.clientId || !newProject.dueDate}
            >
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          if (returnToProjectModal) {
            setReturnToProjectModal(false);
            setShowCreateModal(true);
          }
        }}
        title="Add New Client"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              placeholder="Acme Corporation"
              required
            />
            <Input
              label="Industry"
              value={newClient.industry}
              onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
              placeholder="Technology"
              required
            />
          </div>
          
          <Input
            label="Contact Person"
            value={newClient.contact_person}
            onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
            placeholder="John Smith"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            placeholder="contact@company.com"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Website"
              value={newClient.website}
              onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowClientModal(false);
                if (returnToProjectModal) {
                  setReturnToProjectModal(false);
                  setShowCreateModal(true);
                }
              }}
            >
              {returnToProjectModal ? 'Back to Project' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddClient}
              disabled={!newClient.name || !newClient.email || !newClient.contact_person}
            >
              {returnToProjectModal ? 'Add Client & Continue' : 'Add Client'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Project Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview(null);
        }}
        title="Import Project"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Download className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Import Complete Project Backup</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Upload a backup.json file exported from Clarity OS to restore a complete project with all data, stakeholders, questions, interviews, and relationships intact.
                </p>
              </div>
            </div>
          </div>

          {!importFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">
                  Select Backup File
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a backup.json file to import
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">{importFile.name}</p>
                    <p className="text-sm text-green-700">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview(null);
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {importPreview && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Import Preview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project Name:</span>
                      <span className="font-medium text-gray-900">{importPreview.project?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stakeholders:</span>
                      <span className="font-medium text-gray-900">{importPreview.stakeholders?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium text-gray-900">{importPreview.questions?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interviews:</span>
                      <span className="font-medium text-gray-900">{importPreview.interviews?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Responses:</span>
                      <span className="font-medium text-gray-900">{importPreview.responses?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exported:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(importPreview.metadata?.exported_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> All IDs will be regenerated. The project will be imported with the name "{importPreview.project?.name} (Imported)".
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview(null);
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            {importPreview && (
              <Button
                onClick={handleImportProject}
                loading={importing}
                icon={Upload}
              >
                Import Project
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};