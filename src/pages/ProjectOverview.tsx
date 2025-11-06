import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, FileText, Users, MessageSquare, Calendar, Target, Clock, Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useData } from '../contexts/DataContext';
import type { Project, Stakeholder, Question, Document } from '../hooks/useSupabaseData';
import { useTheme } from '../contexts/ThemeContext';

interface ProjectOverviewProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projectId, onBack }) => {
  const { isDark } = useTheme();
  const { 
    getProject, 
    getProjectStakeholders, 
    getProjectQuestions, 
    getProjectDocuments,
    updateProject 
  } = useData();
  
  const [project, setProject] = useState<Project | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      console.log('🔄 Loading project overview data for:', projectId);

      // Get project from existing state
      let projectData = getProject(projectId);
      
      if (!projectData) {
        console.log('❌ Project not found');
        setLoading(false);
        return;
      }

      setProject(projectData);
      setEditData({
        name: projectData.name,
        description: projectData.description || '',
        due_date: projectData.due_date
      });

      // Load additional data in parallel
      const [stakeholdersData, questionsData, documentsData] = await Promise.all([
        getProjectStakeholders(projectId),
        getProjectQuestions(projectId),
        getProjectDocuments(projectId)
      ]);

      setStakeholders(stakeholdersData);
      setQuestions(questionsData);
      setDocuments(documentsData);

      console.log('✅ Project overview data loaded successfully');
    } catch (error) {
      console.error('💥 Error loading project overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!project) return;

    try {
      await updateProject(project.id, {
        name: editData.name,
        description: editData.description,
        due_date: editData.due_date
      });
      
      // Update local state
      setProject(prev => prev ? {
        ...prev,
        name: editData.name,
        description: editData.description,
        due_date: editData.due_date
      } : null);
      
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen" style={{
        backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
      }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading project overview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen" style={{
        backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
      }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className={`text-lg font-medium mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Project not found
            </h3>
            <Button onClick={onBack}>Back to Projects</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
    }}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${
        isDark 
          ? 'border-gray-800' 
          : 'border-gray-200'
      }`}
      style={{
        backgroundColor: isDark ? '#3a3a3a' : '#f0f4f8'
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={onBack}
            >
              Back to Projects
            </Button>
            <div>
              <h1 className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{project.name}</h1>
              <p className={`mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Project Overview</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Button
              variant="outline"
              icon={Edit}
              onClick={() => setShowEditModal(true)}
            >
              Edit Project
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Project Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Progress</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Completion</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{project.progress}%</span>
              </div>
              <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Timeline</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Due Date</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(project.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Created</span>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <Users className="h-5 w-5 text-purple-600" />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Team</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Stakeholders</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stakeholders.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Questions</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {questions.length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Project Description */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Project Description
            </h3>
            <Button
              variant="ghost"
              size="sm"
              icon={Edit}
              onClick={() => setShowEditModal(true)}
            >
              Edit
            </Button>
          </div>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
            {project.description || 'No description available. Click Edit to add a project description.'}
          </p>
        </Card>

        {/* Client Information */}
        <Card className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Client Information
          </h3>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {project.client}
              </h4>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Client Company
              </p>
            </div>
          </div>
        </Card>

        {/* Transcript */}
        {project.transcript && (
          <Card className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Kickoff Transcript
            </h3>
            <div className={`rounded-lg p-4 max-h-64 overflow-y-auto border ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <pre className={`text-sm whitespace-pre-wrap font-sans ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {project.transcript}
              </pre>
            </div>
          </Card>
        )}

        {/* Stakeholders, Questions, Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stakeholders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Stakeholders ({stakeholders.length})
                </h3>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stakeholders.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No stakeholders added yet
                </p>
              ) : (
                stakeholders.map((stakeholder) => (
                  <div key={stakeholder.id} className={`p-3 rounded-lg border ${
                    isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stakeholder.name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {stakeholder.role}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {stakeholder.email}
                          </span>
                        </div>
                      </div>
                      <Badge 
                        variant={stakeholder.status === 'completed' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {stakeholder.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Questions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Questions ({questions.length})
                </h3>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {questions.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No questions generated yet
                </p>
              ) : (
                questions.map((question) => (
                  <div key={question.id} className={`p-3 rounded-lg border ${
                    isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <Badge variant="info" size="sm" className="mb-2">
                      {question.category}
                    </Badge>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {question.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary-600" />
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Documents ({documents.length})
                </h3>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {documents.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No documents generated yet
                </p>
              ) : (
                documents.map((document) => (
                  <div key={document.id} className={`p-3 rounded-lg border ${
                    isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {document.title}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {document.type}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Project"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="Project Name"
            required
          />
          
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Project Description
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                isDark 
                  ? 'border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              style={{
                backgroundColor: isDark ? '#2b2b2b' : '#ffffff'
              }}
              rows={4}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Describe the project goals, scope, and objectives..."
            />
          </div>
          
          <Input
            label="Due Date"
            type="date"
            value={editData.due_date}
            onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
            required
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editData.name || !editData.due_date}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};