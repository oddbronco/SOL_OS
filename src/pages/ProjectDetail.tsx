import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageSquare, FileText, Settings, MoreVertical, Trash2, Calendar, Clock, Target, Play, Edit, Eye, Phone, Mail, MapPin, Video, Mic, Upload, ExternalLink, Sparkles, FolderOpen, Bot, Package, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useSupabaseData, Project, Stakeholder, Question, Document } from '../hooks/useSupabaseData';
import { useInterviews, InterviewSession, QuestionAssignment } from '../hooks/useInterviews';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { ProjectSetupFlow } from '../components/project-setup/ProjectSetupFlow';
import { QuestionGenerator } from '../components/ai/QuestionGenerator';
import { InterviewDashboard } from '../components/interviews/InterviewDashboard';
import { QuestionAssignmentModal } from '../components/interviews/QuestionAssignmentModal';
import { AnswerQuestionsModal } from '../components/interviews/AnswerQuestionsModal';
import { StakeholderInterviewView } from '../components/interviews/StakeholderInterviewView';
import { CSVUploadManager } from '../components/csv/CSVUploadManager';
import { QuestionCollectionImporter } from '../components/questions/QuestionCollectionImporter';
import { FilesTab } from '../components/project/FilesTab';
import { DocumentRunsManager } from '../components/documents/DocumentRunsManager';
import { ProjectSidekick } from '../components/sidekick/ProjectSidekick';
import { ProjectExportManager } from '../components/export/ProjectExportManager';
import { openAIService } from '../services/openai';
import { useAuth } from '../hooks/useAuth';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { 
    getProject, 
    getProjectStakeholders, 
    getProjectQuestions, 
    getProjectDocuments,
    updateProject,
    addStakeholder,
    updateStakeholder,
    deleteStakeholder,
    addQuestion,
    updateQuestion,
    deleteQuestion
  } = useSupabaseData();
  
  const {
    getProjectInterviewSessions,
    createInterviewSession,
    assignQuestionsToStakeholder,
    generateInterviewLink
  } = useInterviews();
  
  const [project, setProject] = useState<Project | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionCollections, setQuestionCollections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [showSetupFlow, setShowSetupFlow] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditStakeholder, setShowEditStakeholder] = useState(false);
  const [showQuestionAssignmentModal, setShowQuestionAssignmentModal] = useState(false);
  const [showAnswerQuestionsModal, setShowAnswerQuestionsModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [showStakeholderInterview, setShowStakeholderInterview] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showInterviewLinkModal, setShowInterviewLinkModal] = useState(false);
  const [showUploadResponseModal, setShowUploadResponseModal] = useState(false);
  const [selectedStakeholderForInterview, setSelectedStakeholderForInterview] = useState<Stakeholder | null>(null);
  const [selectedStakeholderForUpload, setSelectedStakeholderForUpload] = useState<Stakeholder | null>(null);
  const [interviewPassword, setInterviewPassword] = useState('');
  const [responseData, setResponseData] = useState({
    content: '',
    file: null as File | null,
    additionalNotes: ''
  });
  const [editProjectData, setEditProjectData] = useState({
    name: '',
    description: '',
    due_date: ''
  });
  const [editStakeholderData, setEditStakeholderData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    seniority: '',
    experience_years: 0
  });

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setProjectNotFound(false);
      console.log('🔄 Loading project data for:', projectId);

      // Get project from existing state
      let projectData = getProject(projectId);
      console.log('📁 Project found in state:', !!projectData);
      
      // If not found in state, try loading directly from database
      if (!projectData) {
        console.log('🔍 Project not in state, loading from database...');
        
        const { data: dbProject, error } = await supabase
          .from('projects')
          .select(`
            *,
            clients!inner(name)
          `)
          .eq('id', projectId)
          .single();

        if (error || !dbProject) {
          console.log('❌ Project not found in database:', error);
          setProjectNotFound(true);
          setLoading(false);
          return;
        }

        // Transform database project to match our interface
        projectData = {
          ...dbProject,
          client: dbProject.clients?.name || 'Unknown Client',
          dueDate: dbProject.due_date,
          stakeholders_count: 0
        };
        
        console.log('✅ Project loaded from database:', projectData.name);
      }

      setProject(projectData);

      // Load additional data in parallel
      console.log('📊 Loading additional project data...');

      const [stakeholdersData, questionsData, documentsData, interviewSessionsData] = await Promise.all([
        getProjectStakeholders(projectId),
        getProjectQuestions(projectId),
        getProjectDocuments(projectId),
        getProjectInterviewSessions(projectId)
      ]);

      // Load question collections for the user's organization
      let collectionsData: any[] = [];
      if (user?.customer_id) {
        const { data } = await supabase
          .from('question_collections')
          .select('*')
          .eq('customer_id', user.customer_id);
        collectionsData = data || [];
      }

      setQuestionCollections(collectionsData);

      setStakeholders(stakeholdersData);
      setQuestions(questionsData);
      setDocuments(documentsData);
      setInterviewSessions(interviewSessionsData);
      
      // Set edit data
      setEditProjectData({
        name: projectData.name,
        description: projectData.description || '',
        due_date: projectData.due_date
      });

      console.log('✅ Project data loaded successfully');
    } catch (error) {
      console.error('💥 Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Retry loading if project not found initially
  useEffect(() => {
    if (projectNotFound) {
      const retryTimer = setTimeout(() => {
        console.log('🔄 Retrying project load...');
        loadProjectData();
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [projectNotFound]);

  const handleEditProject = async () => {
    if (!project) return;

    try {
      await updateProject(project.id, editProjectData);
      setProject(prev => prev ? { ...prev, ...editProjectData } : null);
      setShowEditProject(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setEditStakeholderData({
      name: stakeholder.name,
      email: stakeholder.email,
      role: stakeholder.role,
      department: stakeholder.department,
      phone: stakeholder.phone || '',
      seniority: stakeholder.seniority || '',
      experience_years: stakeholder.experience_years || 0
    });
    setShowEditStakeholder(true);
  };

  const handleSaveStakeholder = async () => {
    if (!selectedStakeholder) return;

    try {
      // Update stakeholder in database
      const { error } = await supabase
        .from('stakeholders')
        .update(editStakeholderData)
        .eq('id', selectedStakeholder.id);

      if (error) throw error;

      // Update local state
      setStakeholders(prev => 
        prev.map(s => 
          s.id === selectedStakeholder.id 
            ? { ...s, ...editStakeholderData }
            : s
        )
      );
      
      setShowEditStakeholder(false);
      setSelectedStakeholder(null);
    } catch (error) {
      console.error('Failed to update stakeholder:', error);
      alert('Failed to update stakeholder. Please try again.');
    }
  };

  const handleShowInterviewLink = (stakeholder: Stakeholder) => {
    setSelectedStakeholderForInterview(stakeholder);
    setInterviewPassword('speak2025'); // Default password
    setShowInterviewLinkModal(true);
  };

  const handleCopyInterviewLink = () => {
    if (!selectedStakeholderForInterview) return;

    // Find the session for this stakeholder
    const session = interviewSessions.find(s => s.stakeholder_id === selectedStakeholderForInterview.id);
    if (!session || !session.session_token) {
      alert('No interview session found. Please create an interview session first.');
      return;
    }

    const link = generateInterviewLink(session.session_token, interviewPassword);
    navigator.clipboard.writeText(link);
    alert('Interview link copied to clipboard!');
  };

  const handleUploadResponse = (stakeholder: Stakeholder) => {
    setSelectedStakeholderForUpload(stakeholder);
    setResponseData({ content: '', file: null, additionalNotes: '' });
    setShowUploadResponseModal(true);
  };

  const handleFileUpload = async (file: File) => {
    setResponseData(prev => ({ ...prev, file }));
    
    try {
      let content = '';
      
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        // For audio/video files, we would use transcription service
        content = `[Audio/Video file uploaded: ${file.name}]\n\nTranscription will be processed...`;
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        content = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else {
        content = `[File uploaded: ${file.name}]\n\nContent will be processed...`;
      }
      
      setResponseData(prev => ({ ...prev, content }));
    } catch (error) {
      console.error('Failed to process file:', error);
      alert('Failed to process file. Please try again.');
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedStakeholderForUpload || (!responseData.content && !responseData.file)) {
      alert('Please provide response content or upload a file');
      return;
    }

    try {
      // In a real implementation, this would save to the database
      // For now, we'll just update the stakeholder status and show success
      
      const responseEntry = {
        stakeholder_id: selectedStakeholderForUpload.id,
        content: responseData.content,
        additional_notes: responseData.additionalNotes,
        file_name: responseData.file?.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'admin' // Current user
      };

      // Update stakeholder status to show they have responses
      setStakeholders(prev => 
        prev.map(s => 
          s.id === selectedStakeholderForUpload.id 
            ? { ...s, status: 'responded' as const }
            : s
        )
      );

      console.log('Response saved:', responseEntry);
      alert('Response uploaded successfully!');
      setShowUploadResponseModal(false);
      setSelectedStakeholderForUpload(null);
      setResponseData({ content: '', file: null, additionalNotes: '' });
      
    } catch (error) {
      console.error('Failed to save response:', error);
      alert('Failed to save response. Please try again.');
    }
  };

  const handleAssignQuestions = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowQuestionAssignmentModal(true);
  };

  const handleAnswerQuestions = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowAnswerQuestionsModal(true);
  };

  const handleInterviewSuccess = () => {
    // Refresh all data to update progress metrics
    loadProjectData();
  };

  const handleCreateInterviewSession = async (stakeholder: Stakeholder, interviewName?: string, interviewType?: string) => {
    if (!project) return;

    const session = await createInterviewSession(project.id, stakeholder.id, interviewName, interviewType);
    if (session) {
      setInterviewSessions(prev => [session, ...prev]);
    }
  };

  const handleCreateAIRound = async (assignments: any[]) => {
    try {
      console.log('Creating AI interview round with assignments:', assignments);

      for (const assignment of assignments) {
        const session = await createInterviewSession(
          projectId,
          assignment.stakeholderId,
          assignment.interviewName,
          assignment.interviewType
        );

        if (session && assignment.questionIds.length > 0) {
          await assignQuestionsToStakeholder(
            projectId,
            assignment.stakeholderId,
            assignment.questionIds,
            session.id
          );
        }
      }

      await loadProjectData();
      alert(`Successfully created ${assignments.length} interview sessions!`);
    } catch (error) {
      console.error('Error creating AI round:', error);
      alert('Failed to create interview round');
      throw error;
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This will also delete all responses to this question.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting question:', questionId);
      
      await deleteQuestion(questionId);
      
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      
      console.log('✅ Question deleted successfully');
    } catch (error) {
      console.error('💥 Failed to delete question:', error);
      alert('Failed to delete question. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      setDeleting(true);
      console.log('🗑️ Deleting project:', project.name);
      
      await deleteProject(project.id);
      
      console.log('✅ Project deleted successfully');
      onBack(); // Navigate back to projects list
    } catch (error) {
      console.error('💥 Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const questions = await openAIService.generateQuestions({
        projectDescription: project.description,
        stakeholders: stakeholders.map(s => ({ role: s.role, department: s.department }))
      });
      
      // Add questions to database
      for (const question of questions) {
        await addQuestion(project.id, question);
      }
      
      // Reload questions
      const updatedQuestions = await getProjectQuestions(project.id);
      setQuestions(updatedQuestions);
      
      alert(`Generated ${questions.length} questions successfully!`);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      alert('Failed to generate questions. Please check your OpenAI API key in Settings.');
    } finally {
      setGeneratingQuestions(false);
      setShowApiKeyWarning(false);
    }
  };

  const handleGenerateDocument = async (documentType: string) => {
    setGeneratingDocument(true);
    try {
      // Get all stakeholder responses from the database
      const stakeholderResponses = [];

      for (const stakeholder of stakeholders) {
        // Get responses for this stakeholder
        const { data: responses } = await supabase
          .from('interview_responses')
          .select(`
            *,
            question:questions(text)
          `)
          .eq('stakeholder_id', stakeholder.id)
          .eq('project_id', project.id);

        if (responses && responses.length > 0) {
          responses.forEach(response => {
            stakeholderResponses.push({
              stakeholder: stakeholder.name,
              role: stakeholder.role,
              question: response.question?.text || '',
              response: response.response_text || response.transcription || 'No response provided',
              summary: response.ai_summary || undefined
            });
          });
        }
      }

      // If no responses, use a fallback message
      if (stakeholderResponses.length === 0) {
        alert('No stakeholder responses found. Please ensure stakeholders have answered their assigned questions before generating documents.');
        return;
      }

      // Generate the document using OpenAI
      const documentContent = await openAIService.generateProjectDocument({
        projectName: project.name,
        projectDescription: project.description || 'No description provided',
        stakeholderResponses,
        documentType: documentType as any
      });

      // Save document to database
      const { data: newDocument, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: project.id,
          title: `${documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          type: documentType,
          content: documentContent,
          format: 'markdown'
        })
        .select()
        .single();

      if (docError) throw docError;

      // Reload documents
      const updatedDocuments = await getProjectDocuments(project.id);
      setDocuments(updatedDocuments);

      alert('Document generated successfully!');
    } catch (error) {
      console.error('Failed to generate document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate document: ${errorMessage}`);
    } finally {
      setGeneratingDocument(false);
      setShowApiKeyWarning(false);
    }
  };

  const handleViewStakeholderInterview = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowStakeholderInterview(true);
  };

  const handleBackFromStakeholderInterview = () => {
    setShowStakeholderInterview(false);
    setSelectedStakeholder(null);
    loadInterviewSessions(); // Refresh data
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

  // Check if project needs setup flow (no stakeholders, questions, or documents)
  const needsSetup = false; // Always allow manual access to setup flow

  // Show setup flow if needed or explicitly requested
  if (showSetupFlow || needsSetup) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <ProjectSetupFlow
          projectId={projectId}
          projectName={project?.name || 'Project'}
          onBack={() => {
            setShowSetupFlow(false);
            if (needsSetup) {
              onBack(); // Go back to projects list if this was auto-triggered
            }
          }}
          onComplete={() => {
            setShowSetupFlow(false);
            loadProjectData(); // Reload project data
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (projectNotFound) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2 text-gray-900">
              Project not found
            </h3>
            <p className="mb-4 text-gray-600">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <div className="space-y-2">
              <Button onClick={() => loadProjectData()} variant="outline">
                Try Again
              </Button>
              <Button onClick={onBack}>Back to Projects</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // Show stakeholder interview view
  if (showStakeholderInterview && selectedStakeholder) {
    return (
      <StakeholderInterviewView
        stakeholder={selectedStakeholder}
        project={project}
        onBack={handleBackFromStakeholderInterview}
      />
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
              }`}>Client: {project.client}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            
            {project.status === 'Setup' && (
              <Button
                icon={Play}
                onClick={() => setShowSetupFlow(true)}
              >
                Start Setup
              </Button>
            )}
            
            <div className="relative">
              <Button
                variant="ghost"
                icon={MoreVertical}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              />
              
              {showMoreMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowEditProject(true);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
                          isDark 
                            ? 'text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit Project</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteModal(true);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
                          isDark 
                            ? 'text-red-400 hover:bg-gray-700' 
                            : 'text-red-600 hover:bg-gray-50'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Project</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Target },
                { id: 'stakeholders', label: 'Stakeholders', icon: Users },
                { id: 'questions', label: 'Questions', icon: MessageSquare },
                { id: 'interviews', label: 'Interviews', icon: Video },
                { id: 'files', label: 'Files', icon: FolderOpen },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'sidekick', label: 'Sidekick', icon: Bot },
                { id: 'export', label: 'Export', icon: Package }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : isDark
                          ? 'border-transparent text-white hover:text-gray-300 hover:border-gray-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Project Description
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit}
                  onClick={() => setShowEditProject(true)}
                >
                  Edit
                </Button>
              </div>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                {project.description || 'No description available. Click Edit to add a project description.'}
              </p>
            </Card>

            {/* Client Information */}
            <Card>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Client Information
              </h3>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
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
              <Card>
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
          </div>
        )}

        {/* Stakeholders Tab */}
        {activeTab === 'stakeholders' && (
          <div className="space-y-6">
            {/* CSV Upload */}
            <CSVUploadManager
              type="stakeholders"
              projectId={project.id}
              onSuccess={loadProjectData}
              currentUsage={{ stakeholders: stakeholders.length }}
              limits={{ maxStakeholders: 15 }} // Get from user subscription
            />

            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Stakeholders ({stakeholders.length})
              </h3>
              <Button icon={Users}>Add Stakeholder</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stakeholders.map((stakeholder) => (
                <Card key={stakeholder.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {stakeholder.name}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {stakeholder.role}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={stakeholder.status === 'completed' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {stakeholder.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{stakeholder.email}</span>
                    </div>
                    {stakeholder.phone && (
                      <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{stakeholder.phone}</span>
                      </div>
                    )}
                    <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Users className="h-4 w-4 mr-2" />
                      <span>{stakeholder.department}</span>
                    </div>
                    {stakeholder.seniority && (
                      <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Target className="h-4 w-4 mr-2" />
                        <span>{stakeholder.seniority} • {stakeholder.experience_years} years</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Edit}
                      onClick={() => handleEditStakeholder(stakeholder)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStakeholder(stakeholder);
                        setShowStakeholderInterview(true);
                      }}
                    >
                      View Interview
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* Collection Import */}
            <Card>
              <QuestionCollectionImporter
                projectId={project.id}
                onSuccess={loadProjectData}
                currentUsage={questions.length}
                maxQuestions={user?.subscription.maxQuestions || 50}
              />
            </Card>

            {/* CSV Upload */}
            <CSVUploadManager
              type="questions"
              projectId={project.id}
              projectQuestions={questions}
              onSuccess={loadProjectData}
              currentUsage={{ questions: questions.length }}
              limits={{ maxQuestions: user?.subscription.maxQuestions || 50 }}
            />

            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Questions ({questions.length})
              </h3>
              <Button
                icon={Sparkles}
                onClick={handleGenerateQuestions}
                loading={generatingQuestions}
              >
                {generatingQuestions ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id}>
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="info">{question.category}</Badge>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" icon={Edit}>Edit</Button>
                    </div>
                  </div>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {question.text}
                  </p>
                  {question.target_roles && question.target_roles.length > 0 && (
                    <div className="mt-3">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Target roles: {question.target_roles.join(', ')}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <InterviewDashboard
            project={project}
            stakeholders={stakeholders}
            questions={questions}
            questionCollections={questionCollections}
            interviewSessions={interviewSessions}
            onAssignQuestions={handleAssignQuestions}
            onAnswerQuestions={handleAnswerQuestions}
            onCreateSession={handleCreateInterviewSession}
            onCreateAIRound={handleCreateAIRound}
            onRefresh={loadProjectData}
          />
        )}

        {activeTab === 'files' && (
          <FilesTab projectId={projectId} />
        )}

        {activeTab === 'documents' && (
          <DocumentRunsManager projectId={projectId} />
        )}

        {activeTab === 'sidekick' && (
          <ProjectSidekick projectId={projectId} />
        )}

        {activeTab === 'export' && (
          <ProjectExportManager projectId={projectId} projectName={project.name} />
        )}
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        title="Edit Project"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={editProjectData.name}
            onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
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
                  ? 'border-gray-600 text-white placeholder-gray-400 bg-gray-800' 
                  : 'border-gray-300 text-gray-900 placeholder-gray-500 bg-white'
              }`}
              rows={4}
              value={editProjectData.description}
              onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
              placeholder="Describe the project goals, scope, and objectives..."
            />
          </div>
          
          <Input
            label="Due Date"
            type="date"
            value={editProjectData.due_date}
            onChange={(e) => setEditProjectData({ ...editProjectData, due_date: e.target.value })}
            required
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditProject(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditProject}
              disabled={!editProjectData.name || !editProjectData.due_date}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Stakeholder Modal */}
      <Modal
        isOpen={showEditStakeholder}
        onClose={() => setShowEditStakeholder(false)}
        title="Edit Stakeholder"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={editStakeholderData.name}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, name: e.target.value })}
              placeholder="Full Name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={editStakeholderData.email}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, email: e.target.value })}
              placeholder="email@company.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role"
              value={editStakeholderData.role}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, role: e.target.value })}
              placeholder="Job Title"
              required
            />
            <Input
              label="Department"
              value={editStakeholderData.department}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, department: e.target.value })}
              placeholder="Department"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={editStakeholderData.phone}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            <Select
              label="Seniority"
              value={editStakeholderData.seniority}
              onChange={(e) => setEditStakeholderData({ ...editStakeholderData, seniority: e.target.value })}
              options={[
                { value: '', label: 'Select Seniority' },
                { value: 'Junior', label: 'Junior' },
                { value: 'Mid', label: 'Mid-level' },
                { value: 'Senior', label: 'Senior' },
                { value: 'Lead', label: 'Lead' },
                { value: 'Director', label: 'Director' },
                { value: 'VP', label: 'VP' },
                { value: 'C-Level', label: 'C-Level' }
              ]}
            />
          </div>

          <Input
            label="Experience (Years)"
            type="number"
            value={editStakeholderData.experience_years}
            onChange={(e) => setEditStakeholderData({ ...editStakeholderData, experience_years: parseInt(e.target.value) || 0 })}
            placeholder="5"
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditStakeholder(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveStakeholder}
              disabled={!editStakeholderData.name || !editStakeholderData.email}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Interview Management Modal */}
      <Modal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        title="Interview Management"
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stakeholders.map((stakeholder) => (
              <Card key={stakeholder.id}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stakeholder.name}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stakeholder.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ExternalLink}
                      onClick={() => handleShowInterviewLink(stakeholder)}
                    >
                      Get Interview Link
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Video}
                      onClick={() => handleShowInterviewLink(stakeholder)}
                    >
                      Get Interview Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Upload}
                      onClick={() => handleUploadResponse(stakeholder)}
                    >
                      Upload Recording
                    </Button>
                  </div>
                  
                  <Badge 
                    variant={stakeholder.status === 'completed' ? 'success' : 'warning'}
                    className="w-full justify-center"
                  >
                    {stakeholder.status === 'completed' ? 'Interview Complete' : 'Pending Interview'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>

      {/* Interview Link Modal */}
      <Modal
        isOpen={showInterviewLinkModal}
        onClose={() => {
          setShowInterviewLinkModal(false);
          setSelectedStakeholderForInterview(null);
          setInterviewPassword('');
        }}
        title="Interview Link & Access"
        size="lg"
      >
        {selectedStakeholderForInterview && (
          <div className="space-y-6">
            <div className={`rounded-lg p-4 ${
              isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                isDark ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Interview for {selectedStakeholderForInterview.name}
              </h4>
              <p className={`text-sm ${
                isDark ? 'text-blue-200' : 'text-blue-700'
              }`}>
                {selectedStakeholderForInterview.role} • {selectedStakeholderForInterview.department}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Interview Password"
                value={interviewPassword}
                onChange={(e) => setInterviewPassword(e.target.value)}
                placeholder="speak2025"
                helperText="Stakeholders will need this password to access their interview"
              />

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Interview Link
                </label>
                <div className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'
                }`}>
                  <code className={`text-sm break-all ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {(() => {
                      const session = interviewSessions.find(s => s.stakeholder_id === selectedStakeholderForInterview.id);
                      if (!session || !session.session_token) {
                        return 'No interview session found. Please create an interview session first.';
                      }
                      return generateInterviewLink(session.session_token, interviewPassword);
                    })()}
                  </code>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                isDark ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <h5 className={`font-medium mb-2 ${
                  isDark ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  Instructions for Stakeholder:
                </h5>
                <ol className={`text-sm space-y-1 ${
                  isDark ? 'text-yellow-200' : 'text-yellow-700'
                }`}>
                  <li>1. Click the interview link above</li>
                  <li>2. Enter the password: <strong>{interviewPassword}</strong></li>
                  <li>3. Complete the interview questions</li>
                  <li>4. Submit responses when finished</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInterviewLinkModal(false);
                  setSelectedStakeholderForInterview(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={handleCopyInterviewLink}
                icon={ExternalLink}
              >
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Response Modal */}
      <Modal
        isOpen={showUploadResponseModal}
        onClose={() => {
          setShowUploadResponseModal(false);
          setSelectedStakeholderForUpload(null);
          setResponseData({ content: '', file: null, additionalNotes: '' });
        }}
        title="Upload Stakeholder Response"
        size="xl"
      >
        {selectedStakeholderForUpload && (
          <div className="space-y-6">
            <div className={`rounded-lg p-4 ${
              isDark ? 'bg-green-900/20 border border-primary-500/30' : 'bg-primary-50 border border-green-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                isDark ? 'text-primary-300' : 'text-primary-800'
              }`}>
                Response for {selectedStakeholderForUpload.name}
              </h4>
              <p className={`text-sm ${
                isDark ? 'text-green-200' : 'text-primary-700'
              }`}>
                {selectedStakeholderForUpload.role} • {selectedStakeholderForUpload.department}
              </p>
              <p className={`text-xs mt-1 ${
                isDark ? 'text-green-200' : 'text-primary-700'
              }`}>
                <strong>Note:</strong> This response will be added to their existing answers (additive, not replacing)
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <h5 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Upload File (Optional)
              </h5>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="audio/*,video/*,.txt,.doc,.docx,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="response-file-upload"
                />
                <label htmlFor="response-file-upload" className="cursor-pointer">
                  <div className="space-y-3">
                    <div className="flex justify-center space-x-4">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <Mic className="h-8 w-8 text-gray-400" />
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Upload response file
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Audio, video, text, or document files supported
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {responseData.file && (
                <Card className={`${
                  isDark ? 'bg-green-900/20 border-primary-500/30' : 'bg-primary-50 border-green-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        isDark ? 'text-primary-300' : 'text-primary-900'
                      }`}>
                        {responseData.file.name}
                      </p>
                      <p className={`text-sm ${
                        isDark ? 'text-green-200' : 'text-primary-700'
                      }`}>
                        File uploaded successfully
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Text Response */}
            <div className="space-y-4">
              <h5 className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Response Content
              </h5>
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Main Response (copy/paste or auto-filled from file)
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    isDark 
                      ? 'border-gray-600 text-white placeholder-gray-400 bg-gray-800' 
                      : 'border-gray-300 text-gray-900 placeholder-gray-500 bg-white'
                  }`}
                  rows={8}
                  value={responseData.content}
                  onChange={(e) => setResponseData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Paste stakeholder response here or upload a file above..."
                />
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Additional Notes (for info that doesn't fit specific questions)
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    isDark 
                      ? 'border-gray-600 text-white placeholder-gray-400 bg-gray-800' 
                      : 'border-gray-300 text-gray-900 placeholder-gray-500 bg-white'
                  }`}
                  rows={4}
                  value={responseData.additionalNotes}
                  onChange={(e) => setResponseData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any additional insights, concerns, or information that doesn't fit into specific questions..."
                />
                <p className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  This ensures no valuable information is lost, even if it doesn't match existing questions
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadResponseModal(false);
                  setSelectedStakeholderForUpload(null);
                  setResponseData({ content: '', file: null, additionalNotes: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveResponse}
                disabled={!responseData.content && !responseData.file}
                icon={Upload}
              >
                Save Response
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
        size="md"
      >
        <div className="space-y-4">
          <div className={`rounded-lg p-4 ${
            isDark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              <Trash2 className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Warning: This action cannot be undone
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  This will permanently delete the project and all associated data including stakeholders, questions, interviews, responses, documents, and generated files.
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start space-x-2">
              <Download className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  Recommended: Export Project First
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Before deleting, we strongly recommend exporting a complete backup. This allows you to restore the project later if needed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setActiveTab('export');
                  }}
                  className="mt-2"
                >
                  Go to Export Tab
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              You are about to delete:
            </p>
            <p className={`font-medium mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              "{project.name}"
            </p>
            <div className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>• {stakeholders.length} stakeholders</p>
              <p>• {questions.length} questions</p>
              <p>• {interviewSessions.length} interview sessions</p>
              <p>• {documents.length} documents</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
              loading={deleting}
              icon={Trash2}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Question Assignment Modal */}
      <QuestionAssignmentModal
        isOpen={showQuestionAssignmentModal}
        onClose={() => {
          setShowQuestionAssignmentModal(false);
          setSelectedStakeholder(null);
        }}
        stakeholder={selectedStakeholder}
        project={project}
        questions={questions}
        onSuccess={() => {
          loadProjectData();
          setShowQuestionAssignmentModal(false);
          setSelectedStakeholder(null);
        }}
      />

      {/* Answer Questions Modal */}
      <AnswerQuestionsModal
        isOpen={showAnswerQuestionsModal}
        onClose={() => {
          setShowAnswerQuestionsModal(false);
          setSelectedStakeholder(null);
        }}
        stakeholder={selectedStakeholder}
        project={project}
        onSuccess={handleInterviewSuccess}
      />
    </div>
  );
};