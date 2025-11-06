import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Users, MessageSquare, FileText, Sparkles, Check, Edit, Trash2, Plus, RefreshCw, Save, X, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { openAIService } from '../../services/openai';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onComplete: () => void;
}

interface Stakeholder {
  id?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  seniority?: string;
  experience_years?: number;
  mentioned_context?: string;
}

interface Question {
  id?: string;
  text: string;
  category: string;
  target_roles: string[];
}

export const ProjectSetupFlow: React.FC<ProjectSetupFlowProps> = ({
  projectId,
  projectName,
  onBack,
  onComplete
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Project data state
  const [projectData, setProjectData] = useState({
    transcript: '',
    description: '',
    stakeholders: [] as Stakeholder[],
    questions: [] as Question[],
    status: 'Setup'
  });

  // UI state
  const [transcriptInput, setTranscriptInput] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateType, setRegenerateType] = useState<'stakeholders' | 'questions' | null>(null);
  const [showCustomDocModal, setShowCustomDocModal] = useState(false);
  const [customDocuments, setCustomDocuments] = useState<Array<{
    id: string;
    name: string;
    description: string;
    template?: string;
  }>>([]);
  const [customDocData, setCustomDocData] = useState({
    name: '',
    description: '',
    template: ''
  });
  const [showEditStakeholder, setShowEditStakeholder] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [newCustomDoc, setNewCustomDoc] = useState({
    name: '',
    description: '',
    template: ''
  });
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [collections, setCollections] = useState<any[]>([]);

  // All available document types including standard and custom
  const getAllDocumentTypes = () => {
    const standardTypes = [
      { 
        id: 'sprint0_summary', 
        name: 'Sprint 0 Summary', 
        description: 'Comprehensive project foundation document with stakeholder insights and requirements overview' 
      },
      { 
        id: 'exec_summary', 
        name: 'Executive Summary', 
        description: 'High-level business overview highlighting objectives, ROI, and strategic recommendations for leadership' 
      },
      { 
        id: 'technical_scope', 
        name: 'Technical Scope', 
        description: 'Detailed technical requirements, architecture, and implementation considerations' 
      },
      { 
        id: 'implementation_roadmap', 
        name: 'Implementation Roadmap', 
        description: 'Detailed project phases, timeline, milestones, and resource allocation plan' 
      },
      { 
        id: 'requirements_document', 
        name: 'Requirements Document', 
        description: 'Comprehensive functional and non-functional requirements with acceptance criteria' 
      },
      { 
        id: 'user_stories', 
        name: 'User Stories', 
        description: 'User personas, journeys, and detailed user experience requirements' 
      },
      { 
        id: 'risk_assessment', 
        name: 'Risk Assessment', 
        description: 'Risk identification, probability analysis, and mitigation strategies' 
      },
      { 
        id: 'stakeholder_analysis', 
        name: 'Stakeholder Analysis', 
        description: 'Stakeholder roles, influence mapping, and engagement strategies' 
      },
      { 
        id: 'proposal', 
        name: 'Project Proposal', 
        description: 'Formal business proposal with scope, budget, timeline, and approval requirements' 
      }
    ];

    const customTypes = customDocuments.map(doc => ({
      id: `custom_${doc.id}`,
      name: doc.name,
      description: doc.description,
      isCustom: true
    }));

    return [...standardTypes, ...customTypes];
  };

  // Load existing project data on mount
  useEffect(() => {
    loadProjectData();
    loadCollections();
  }, [projectId]);

  const loadCollections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('question_collections')
        .select('*')
        .or(`customer_id.eq.${user.id},scope.eq.system`)
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (err) {
      console.error('Error loading collections:', err);
    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading project setup data for:', projectId);

      // Load project basic info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('transcript, description, status')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Load stakeholders
      const { data: stakeholders, error: stakeholdersError } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (stakeholdersError) throw stakeholdersError;

      // Load questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      // Load documents to determine selected types
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('type')
        .eq('project_id', projectId);

      if (documentsError) throw documentsError;

      // Update state
      setProjectData({
        transcript: project?.transcript || '',
        description: project?.description || '',
        stakeholders: stakeholders || [],
        questions: questions || [],
        status: project?.status || 'Setup'
      });

      setTranscriptInput(project?.transcript || '');

      // Determine current step based on data
      const step = determineCurrentStep(project, stakeholders, questions);
      setCurrentStep(step);

      console.log('✅ Project data loaded, starting at step:', step);

    } catch (err) {
      console.error('💥 Error loading project data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const determineCurrentStep = (project: any, stakeholders: any[], questions: any[]) => {
    // If no transcript, start at step 1
    if (!project?.transcript) return 1;

    // If transcript but no stakeholders, go to step 2
    if (!stakeholders?.length) return 2;

    // If stakeholders but no questions, go to step 3
    if (!questions?.length) return 3;

    // Everything is complete, go to step 4 (review)
    return 4;
  };

  const saveProjectData = async (updates: Partial<typeof projectData>) => {
    try {
      setSaving(true);
      console.log('💾 Saving project data:', updates);

      // Update project table
      if (updates.transcript !== undefined || updates.description !== undefined || updates.status !== undefined) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            ...(updates.transcript !== undefined && { transcript: updates.transcript }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.status !== undefined && { status: updates.status }),
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (projectError) throw projectError;
      }

      // Save stakeholders
      if (updates.stakeholders) {
        // Delete existing stakeholders
        await supabase
          .from('stakeholders')
          .delete()
          .eq('project_id', projectId);

        // Insert new stakeholders
        if (updates.stakeholders.length > 0) {
          const { error: stakeholdersError } = await supabase
            .from('stakeholders')
            .insert(
              updates.stakeholders.map(s => ({
                project_id: projectId,
                name: s.name,
                email: s.email,
                role: s.role,
                department: s.department,
                phone: s.phone,
                seniority: s.seniority,
                experience_years: s.experience_years,
                mentioned_context: s.mentioned_context,
                status: 'pending'
              }))
            );

          if (stakeholdersError) throw stakeholdersError;
        }
      }

      // Save questions
      if (updates.questions) {
        // Delete existing questions
        await supabase
          .from('questions')
          .delete()
          .eq('project_id', projectId);

        // Insert new questions
        if (updates.questions.length > 0) {
          const { error: questionsError } = await supabase
            .from('questions')
            .insert(
              updates.questions.map(q => ({
                project_id: projectId,
                text: q.text,
                category: q.category,
                target_roles: q.target_roles
              }))
            );

          if (questionsError) throw questionsError;
        }
      }

      console.log('✅ Project data saved successfully');

    } catch (err) {
      console.error('💥 Error saving project data:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      console.log('📁 Processing file:', file.name);

      let transcriptText = '';

      // Process different file types
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        transcriptText = await openAIService.transcribeAudio(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        transcriptText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else {
        throw new Error('Unsupported file type. Please upload audio, video, or text files.');
      }

      // Upload original file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `kickoff_${Date.now()}_${file.name}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create upload record
      const { error: uploadRecordError } = await supabase
        .from('project_uploads')
        .insert({
          project_id: projectId,
          upload_type: 'kickoff_transcript',
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
          description: `Kickoff transcript (${file.type.startsWith('audio/') || file.type.startsWith('video/') ? 'transcribed from audio/video' : 'text file'})`,
          include_in_generation: true
        });

      if (uploadRecordError) throw uploadRecordError;

      // Update state and save
      const updates = { transcript: transcriptText };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));
      setTranscriptInput(transcriptText);

      console.log('✅ Transcript processed and saved');
      setCurrentStep(2);

    } catch (err) {
      console.error('💥 File processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleTextTranscript = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a text file blob from the transcript
      const blob = new Blob([transcriptInput], { type: 'text/plain' });
      const fileName = `kickoff_transcript_${Date.now()}.txt`;
      const filePath = `${projectId}/${fileName}`;

      // Upload the text file to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Create upload record
      const { error: uploadRecordError } = await supabase
        .from('project_uploads')
        .insert({
          project_id: projectId,
          upload_type: 'kickoff_transcript',
          file_name: fileName,
          file_path: filePath,
          file_size: blob.size,
          mime_type: 'text/plain',
          uploaded_by: user?.id,
          description: 'Kickoff transcript (manually entered text)',
          include_in_generation: true
        });

      if (uploadRecordError) throw uploadRecordError;

      const updates = { transcript: transcriptInput };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));

      console.log('✅ Text transcript saved');
      setCurrentStep(2);

    } catch (err) {
      console.error('💥 Error saving transcript:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transcript');
    } finally {
      setLoading(false);
    }
  };

  const extractStakeholdersAndDescription = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🤖 Extracting stakeholders and generating description...');

      const [stakeholders, description] = await Promise.all([
        openAIService.extractStakeholdersFromTranscript(projectData.transcript),
        openAIService.generateProjectDescription({
          projectName,
          transcription: projectData.transcript
        })
      ]);

      const updates = { stakeholders, description };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));

      console.log('✅ Stakeholders and description generated');
      setCurrentStep(3);

    } catch (err) {
      console.error('💥 AI extraction failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract stakeholders');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentTypeSelection = async (documentTypes: string[]) => {
    try {
      const updates = { selectedDocumentTypes: documentTypes };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));

      console.log('✅ Document types saved');
      setCurrentStep(4);

    } catch (err) {
      console.error('💥 Error saving document types:', err);
      setError(err instanceof Error ? err.message : 'Failed to save document types');
    }
  };

  const generateQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🤖 Generating questions...');

      const questions = await openAIService.generateQuestions({
        projectDescription: projectData.description,
        transcription: projectData.transcript,
        stakeholders: projectData.stakeholders.map(s => ({ role: s.role, department: s.department }))
      });

      const updates = { questions };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));

      console.log('✅ Questions generated');

    } catch (err) {
      console.error('💥 Question generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleStakeholderEdit = async (index: number, updates: Partial<Stakeholder>) => {
    const updatedStakeholders = [...projectData.stakeholders];
    updatedStakeholders[index] = { ...updatedStakeholders[index], ...updates };
    
    try {
      await saveProjectData({ stakeholders: updatedStakeholders });
      setProjectData(prev => ({ ...prev, stakeholders: updatedStakeholders }));
      setEditingStakeholder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stakeholder');
    }
  };

  const handleQuestionEdit = async (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...projectData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    
    try {
      await saveProjectData({ questions: updatedQuestions });
      setProjectData(prev => ({ ...prev, questions: updatedQuestions }));
      setEditingQuestion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    }
  };

  const handleRegenerate = async (type: 'stakeholders' | 'questions') => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'stakeholders') {
        const [stakeholders, description] = await Promise.all([
          openAIService.extractStakeholdersFromTranscript(projectData.transcript),
          openAIService.generateProjectDescription({
            projectName,
            transcription: projectData.transcript
          })
        ]);

        const updates = { stakeholders, description };
        await saveProjectData(updates);
        setProjectData(prev => ({ ...prev, ...updates }));
      } else {
        const questions = await openAIService.generateQuestions({
          projectDescription: projectData.description,
          transcription: projectData.transcript,
          stakeholders: projectData.stakeholders.map(s => ({ role: s.role, department: s.department }))
        });

        const updates = { questions };
        await saveProjectData(updates);
        setProjectData(prev => ({ ...prev, ...updates }));
      }

      setShowRegenerateModal(false);
      setRegenerateType(null);

    } catch (err) {
      console.error(`💥 ${type} regeneration failed:`, err);
      setError(err instanceof Error ? err.message : `Failed to regenerate ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    try {
      setLoading(true);
      
      const updates = { status: 'Stakeholder Outreach' };
      await saveProjectData(updates);
      
      console.log('✅ Project setup completed');
      onComplete();

    } catch (err) {
      console.error('💥 Error completing setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomDocFile(file);
    
    try {
      const text = await readFileAsText(file);
      setNewCustomDoc({ ...newCustomDoc, template: text });
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('Failed to read file. Please try again.');
    }
  };

  const handleAddCustomDocument = () => {
    if (!customDocData.name.trim() || !customDocData.description.trim()) {
      alert('Please provide both name and description for the custom document');
      return;
    }

    const newCustomDoc = {
      id: `custom_${Date.now()}`,
      name: customDocData.name.trim(),
      description: customDocData.description.trim(),
      template: customDocData.template.trim()
    };

    setCustomDocuments(prev => [...prev, newCustomDoc]);
    setShowCustomDocModal(false);
    setCustomDocData({ name: '', description: '', template: '' });

    // Auto-select the new custom document
    const customDocId = `custom_${newCustomDoc.id}`;
    setSelectedDocumentTypes(prev => [...prev, customDocId]);
  };

  const handleRemoveCustomDocument = (docId: string) => {
    setCustomDocuments(prev => prev.filter(doc => doc.id !== docId));
    setSelectedDocumentTypes(prev => prev.filter(id => id !== `custom_${docId}`));
  };

  const removeCustomDocument = (index: number) => {
    setCustomDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // File reading utility
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCustomDocData({ ...customDocData, template: text });
    } catch (error) {
      console.error('Failed to read file:', error);
      alert('Failed to read file. Please try again.');
    }
  };

  const handleImportCollection = async (collectionId: string) => {
    try {
      setLoading(true);

      const { data: questions, error } = await supabase
        .from('question_collection_items')
        .select('question_text, category, target_roles')
        .eq('collection_id', collectionId);

      if (error) throw error;

      const importedQuestions: Question[] = (questions || []).map(q => ({
        text: q.question_text,
        category: q.category || 'Imported',
        target_roles: q.target_roles || ['All']
      }));

      const updates = { questions: importedQuestions };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));
      setShowCollectionPicker(false);

      console.log(`✅ Imported ${importedQuestions.length} questions from collection`);
    } catch (err) {
      console.error('Error importing collection:', err);
      alert('Failed to import collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header row, parse CSV
      const importedQuestions: Question[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (!match || match.length < 2) continue;

        const clean = (str: string) => str.replace(/^[,"]|["']$/g, '').trim();
        const questionText = clean(match[0]);
        const category = clean(match[1] || 'Imported');
        const rolesStr = clean(match[2] || 'All');
        const target_roles = rolesStr.split(';').map(r => r.trim()).filter(r => r);

        if (questionText) {
          importedQuestions.push({
            text: questionText,
            category: category || 'Imported',
            target_roles: target_roles.length > 0 ? target_roles : ['All']
          });
        }
      }

      if (importedQuestions.length === 0) {
        alert('No questions found in CSV. Expected format:\nQuestion,Category,Target Roles (semicolon-separated)');
        return;
      }

      const updates = { questions: importedQuestions };
      await saveProjectData(updates);
      setProjectData(prev => ({ ...prev, ...updates }));
      setShowCSVUpload(false);
      setCSVFile(null);

      console.log(`✅ Imported ${importedQuestions.length} questions from CSV`);
    } catch (err) {
      console.error('Error importing CSV:', err);
      alert('Failed to import CSV. Please check the format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Upload Transcript', icon: Upload },
    { id: 2, title: 'Project Overview', icon: FileText },
    { id: 3, title: 'Questions', icon: MessageSquare },
    { id: 4, title: 'Review & Complete', icon: Check }
  ];

  const documentTypes = [
    { id: 'sprint0_summary', title: 'Sprint 0 Summary', description: 'Comprehensive project foundation document' },
    { id: 'exec_summary', title: 'Executive Summary', description: 'High-level business overview for leadership' },
    { id: 'technical_scope', title: 'Technical Scope', description: 'Detailed technical requirements and architecture' },
    { id: 'implementation_roadmap', title: 'Implementation Roadmap', description: 'Project phases, timeline and milestones' },
    { id: 'requirements_document', title: 'Requirements Document', description: 'Detailed functional and non-functional requirements' },
    { id: 'user_stories', title: 'User Stories', description: 'User-focused feature descriptions and acceptance criteria' }
  ];

  if (loading && currentStep === 1) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project setup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              Back to Projects
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{projectName} - Setup</h1>
              <p className="text-gray-600">Step {currentStep} of {steps.length}: {steps.find(s => s.id === currentStep)?.title}</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isClickable = step.id <= Math.max(currentStep, 1);

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted 
                      ? 'bg-primary-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 sm:w-16 h-1 mx-2 sm:mx-4 ${
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Step Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Upload Transcript */}
          {currentStep === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Kickoff Transcript</h2>
              <p className="text-gray-600 mb-8">Upload your discovery call recording or paste the transcript</p>

              {/* File Upload */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="audio/*,video/*,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        Audio, video, or text files supported
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="text-gray-500 mb-4">or</div>

              {/* Text Input */}
              <div className="text-left">
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={8}
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  placeholder="Paste your kickoff call transcript here..."
                />
                <Button
                  onClick={handleTextTranscript}
                  disabled={!transcriptInput.trim() || loading}
                  loading={loading}
                  className="w-full mt-4"
                >
                  Continue with Text Transcript
                </Button>
              </div>

              {loading && (
                <div className="mt-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Processing transcript...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Project Overview */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Overview</h2>
                <p className="text-gray-600">Review transcript and extracted information</p>
              </div>

              {/* Transcript Preview */}
              <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript Preview</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {projectData.transcript}
                  </pre>
                </div>
              </div>

              {/* Generated Description */}
              {projectData.description && (
                <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Generated Project Description</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        const newDescription = prompt('Edit project description:', projectData.description);
                        if (newDescription !== null) {
                          saveProjectData({ description: newDescription });
                          setProjectData(prev => ({ ...prev, description: newDescription }));
                        }
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{projectData.description}</p>
                </div>
              )}

              {/* Extracted Stakeholders */}
              <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Extracted Stakeholders ({projectData.stakeholders.length})
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => {
                        setRegenerateType('stakeholders');
                        setShowRegenerateModal(true);
                      }}
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={() => {
                        const newStakeholder = {
                          name: '',
                          email: '',
                          role: '',
                          department: '',
                          phone: '',
                          seniority: '',
                          experience_years: 0
                        };
                        setProjectData(prev => ({
                          ...prev,
                          stakeholders: [...prev.stakeholders, newStakeholder]
                        }));
                        setEditingStakeholder(projectData.stakeholders.length);
                      }}
                    >
                      Add Stakeholder
                    </Button>
                  </div>
                </div>

                {projectData.stakeholders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 mb-4">No stakeholders extracted yet</p>
                    <Button
                      onClick={extractStakeholdersAndDescription}
                      loading={loading}
                      icon={Sparkles}
                    >
                      Extract Stakeholders with AI
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectData.stakeholders.map((stakeholder, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        {editingStakeholder === index ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Name"
                                value={stakeholder.name}
                                onChange={(e) => handleStakeholderEdit(index, { name: e.target.value })}
                                placeholder="Full Name"
                              />
                              <Input
                                label="Email"
                                value={stakeholder.email}
                                onChange={(e) => handleStakeholderEdit(index, { email: e.target.value })}
                                placeholder="email@company.com"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Role"
                                value={stakeholder.role}
                                onChange={(e) => handleStakeholderEdit(index, { role: e.target.value })}
                                placeholder="Job Title"
                              />
                              <Input
                                label="Department"
                                value={stakeholder.department}
                                onChange={(e) => handleStakeholderEdit(index, { department: e.target.value })}
                                placeholder="Department"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <Input
                                label="Phone"
                                value={stakeholder.phone || ''}
                                onChange={(e) => handleStakeholderEdit(index, { phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                              />
                              <Select
                                label="Seniority"
                                value={stakeholder.seniority || ''}
                                onChange={(e) => handleStakeholderEdit(index, { seniority: e.target.value })}
                                options={[
                                  { value: '', label: 'Select Level' },
                                  { value: 'Junior', label: 'Junior' },
                                  { value: 'Mid', label: 'Mid-level' },
                                  { value: 'Senior', label: 'Senior' },
                                  { value: 'Lead', label: 'Lead' },
                                  { value: 'Director', label: 'Director' },
                                  { value: 'VP', label: 'VP' },
                                  { value: 'C-Level', label: 'C-Level' }
                                ]}
                              />
                              <Input
                                label="Experience (Years)"
                                type="number"
                                value={stakeholder.experience_years || 0}
                                onChange={(e) => handleStakeholderEdit(index, { experience_years: parseInt(e.target.value) || 0 })}
                                placeholder="5"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStakeholder(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setEditingStakeholder(null)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{stakeholder.name}</h4>
                                <p className="text-sm text-gray-600">{stakeholder.role} • {stakeholder.department}</p>
                                <p className="text-sm text-gray-500">{stakeholder.email}</p>
                                {stakeholder.mentioned_context && (
                                  <p className="text-xs text-gray-500 mt-1 italic">"{stakeholder.mentioned_context}"</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit}
                                onClick={() => setEditingStakeholder(index)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => {
                                  const updatedStakeholders = projectData.stakeholders.filter((_, i) => i !== index);
                                  saveProjectData({ stakeholders: updatedStakeholders });
                                  setProjectData(prev => ({ ...prev, stakeholders: updatedStakeholders }));
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">AI is extracting stakeholders and generating project description...</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={projectData.stakeholders.length === 0}
                >
                  Continue to Questions
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Questions */}
          {currentStep === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Questions</h2>
                <p className="text-gray-600">Generate or add questions for stakeholder interviews</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAllDocumentTypes().map((docType) => (
                  <div
                    key={docType.id}
                    onClick={() => {
                      const newSelection = projectData.selectedDocumentTypes.includes(docType.id)
                        ? projectData.selectedDocumentTypes.filter(id => id !== docType.id)
                        : [...projectData.selectedDocumentTypes, docType.id];
                      
                      setProjectData(prev => ({ ...prev, selectedDocumentTypes: newSelection }));
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      projectData.selectedDocumentTypes.includes(docType.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-green-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {projectData.selectedDocumentTypes.includes(docType.id) ? (
                        <CheckCircle className="h-5 w-5 text-primary-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                      )}
                      {docType.isCustom && (
                        <Badge variant="info" size="sm">Custom</Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{docType.name}</h4>
                    <p className="text-sm text-gray-600">{docType.description}</p>
                  </div>
                ))}
                
                {/* Add Custom Document Card */}
                <div
                  onClick={() => setShowCustomDocModal(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-all hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center justify-center min-h-[120px]"
                >
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <h4 className="font-medium text-gray-700 mb-1">Add Custom Document</h4>
                  <p className="text-sm text-gray-500 text-center">
                    Create your own document type with custom template
                  </p>
                </div>
              </div>

              {projectData.selectedDocumentTypes.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Please select at least one document type to continue with question generation.
                    </p>
                  </div>
                </div>
              )}

              {projectData.selectedDocumentTypes.length > 0 && (
                <div className="mt-4 p-4 bg-primary-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-600 mr-2" />
                    <p className="text-sm text-primary-800">
                      {projectData.selectedDocumentTypes.length} document type{projectData.selectedDocumentTypes.length > 1 ? 's' : ''} selected. 
                      Questions will be tailored to gather information for these documents.
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Document Modal */}
              <Modal
                isOpen={showCustomDocModal}
                onClose={() => {
                  setShowCustomDocModal(false);
                  setCustomDocData({ name: '', description: '', template: '' });
                }}
                title="Add Custom Document Type"
                size="lg"
              >
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Lightbulb className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">Pro Tip</h4>
                        <p className="text-sm text-blue-700">
                          Providing a template or example helps the AI generate better, more structured documents that match your specific needs and format preferences.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Document Name"
                    value={customDocData.name}
                    onChange={(e) => setCustomDocData({ ...customDocData, name: e.target.value })}
                    placeholder="e.g., Security Assessment, Brand Guidelines"
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Document Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      value={customDocData.description}
                      onChange={(e) => setCustomDocData({ ...customDocData, description: e.target.value })}
                      placeholder="Describe what this document should contain and its purpose..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Template/Example (Optional)
                    </label>
                    
                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept=".txt,.md,.doc,.docx"
                        onChange={handleTemplateFileUpload}
                        className="hidden"
                        id="template-upload"
                      />
                      <label htmlFor="template-upload" className="cursor-pointer">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Upload template file (.txt, .md, .doc, .docx)
                        </p>
                      </label>
                    </div>

                    {/* Or paste content */}
                    <div className="text-center text-sm text-gray-500 my-2">or</div>
                    
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={6}
                      value={customDocData.template}
                      onChange={(e) => setCustomDocData({ ...customDocData, template: e.target.value })}
                      placeholder="Paste your template content here..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCustomDocModal(false);
                        setCustomDocData({ name: '', description: '', template: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddCustomDocument}
                      disabled={!customDocData.name.trim() || !customDocData.description.trim()}
                    >
                      Add Custom Document
                    </Button>
                  </div>
                </div>
              </Modal>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(4)}
                  disabled={projectData.stakeholders.length === 0 || projectData.selectedDocumentTypes.length === 0}
                  className={!(projectData.stakeholders.length > 0 && projectData.selectedDocumentTypes.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {projectData.selectedDocumentTypes.length === 0 
                    ? 'Select Documents First' 
                    : 'Continue to Questions'
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Questions */}
          {currentStep === 4 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Questions</h2>
                <p className="text-gray-600">AI-generated questions based on stakeholders and document types</p>
              </div>

              {projectData.questions.length === 0 ? (
                <div className="py-8">
                  <div className="text-center mb-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2 text-gray-900">Add Interview Questions</h3>
                    <p className="text-gray-600">Choose how you'd like to add questions for stakeholder interviews</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                    {/* AI Generation */}
                    <button
                      onClick={generateQuestions}
                      disabled={projectData.stakeholders.length === 0}
                      className={`p-6 border-2 rounded-lg text-left transition-all ${
                        projectData.stakeholders.length === 0
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Sparkles className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">AI Generate</h4>
                          <p className="text-sm text-gray-600">
                            Automatically generate comprehensive questions based on your stakeholders and project context
                          </p>
                          {projectData.stakeholders.length === 0 && (
                            <p className="text-xs text-yellow-600 mt-2">⚠️ Add stakeholders first</p>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Import from Collection */}
                    <button
                      onClick={() => setShowCollectionPicker(true)}
                      className="p-6 border-2 border-gray-300 rounded-lg text-left hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Import Collection</h4>
                          <p className="text-sm text-gray-600">
                            Select from your saved question collections or templates
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* CSV Upload */}
                    <button
                      onClick={() => setShowCSVUpload(true)}
                      className="p-6 border-2 border-gray-300 rounded-lg text-left hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Upload className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Upload CSV</h4>
                          <p className="text-sm text-gray-600">
                            Bulk import questions from a CSV file
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Manual Entry */}
                    <button
                      onClick={() => {
                        const newQuestion = {
                          text: '',
                          category: 'Custom',
                          target_roles: ['All']
                        };
                        setProjectData(prev => ({
                          ...prev,
                          questions: [...prev.questions, newQuestion]
                        }));
                        setEditingQuestion(0);
                      }}
                      className="p-6 border-2 border-gray-300 rounded-lg text-left hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Edit className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Manual Entry</h4>
                          <p className="text-sm text-gray-600">
                            Add questions one by one manually
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Generated Questions ({projectData.questions.length})
                    </h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => {
                          setRegenerateType('questions');
                          setShowRegenerateModal(true);
                        }}
                      >
                        Regenerate All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={() => {
                          const newQuestion = {
                            text: '',
                            category: 'Custom',
                            target_roles: ['All']
                          };
                          setProjectData(prev => ({
                            ...prev,
                            questions: [...prev.questions, newQuestion]
                          }));
                          setEditingQuestion(projectData.questions.length);
                        }}
                      >
                        Add Custom Question
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    {projectData.questions.map((question, index) => (
                      <div key={index} className="bg-white border border-gray-300 rounded-lg p-4">
                        {editingQuestion === index ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Category"
                                value={question.category}
                                onChange={(e) => handleQuestionEdit(index, { category: e.target.value })}
                                placeholder="Question Category"
                              />
                              <Input
                                label="Target Roles (comma-separated)"
                                value={question.target_roles.join(', ')}
                                onChange={(e) => handleQuestionEdit(index, { 
                                  target_roles: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                                })}
                                placeholder="Product Manager, CTO"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                value={question.text}
                                onChange={(e) => handleQuestionEdit(index, { text: e.target.value })}
                                placeholder="Enter your question..."
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingQuestion(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setEditingQuestion(null)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <Badge variant="info">{question.category}</Badge>
                                <Badge variant="default" size="sm">
                                  {question.target_roles.join(', ')}
                                </Badge>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Edit}
                                  onClick={() => setEditingQuestion(index)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Trash2}
                                  onClick={() => {
                                    const updatedQuestions = projectData.questions.filter((_, i) => i !== index);
                                    saveProjectData({ questions: updatedQuestions });
                                    setProjectData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                />
                              </div>
                            </div>
                            <p className="text-gray-900">{question.text}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Generating comprehensive questions...</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(5)}
                  disabled={projectData.questions.length === 0}
                >
                  Continue to Review
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Complete */}
          {currentStep === 5 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Complete Setup</h2>
                <p className="text-gray-600">Review all project information before completing setup</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Transcript</h3>
                  <p className="text-sm text-gray-600">Uploaded & Processed</p>
                </div>
                <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">{projectData.stakeholders.length} Stakeholders</h3>
                  <p className="text-sm text-gray-600">Extracted & Verified</p>
                </div>
                <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">{projectData.selectedDocumentTypes.length} Document Types</h3>
                  <p className="text-sm text-gray-600">Selected for Generation</p>
                </div>
                <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">{projectData.questions.length} Questions</h3>
                  <p className="text-sm text-gray-600">Generated for Interviews</p>
                </div>
              </div>

              {/* Project Description */}
              <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {projectData.description}
                </p>
              </div>

              {/* Complete Setup */}
              <div className="text-center">
                <Button
                  onClick={completeSetup}
                  loading={loading}
                  size="lg"
                  icon={Check}
                >
                  Complete Setup & Start Stakeholder Outreach
                </Button>
                <p className="text-sm text-gray-600 mt-4">
                  This will move the project to the stakeholder outreach phase
                </p>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setCurrentStep(4)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Document Modal */}
      <Modal
        isOpen={showCustomDocModal}
        onClose={() => {
          setShowCustomDocModal(false);
          setNewCustomDoc({ name: '', description: '', template: '' });
          setCustomDocFile(null);
        }}
        title="Add Custom Document Type"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Document Name"
              value={newCustomDoc.name}
              onChange={(e) => setNewCustomDoc({ ...newCustomDoc, name: e.target.value })}
              placeholder="e.g., Security Assessment"
              required
            />
            <Input
              label="Description"
              value={newCustomDoc.description}
              onChange={(e) => setNewCustomDoc({ ...newCustomDoc, description: e.target.value })}
              placeholder="Brief description of this document"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Template/Example (Optional)
            </label>
            <p className="text-sm text-gray-600">
              Provide a template or example to help AI generate better content for this document type.
            </p>
            
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleCustomDocFileUpload}
                className="hidden"
                id="custom-doc-upload"
              />
              <label htmlFor="custom-doc-upload" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    Upload template file
                  </p>
                  <p className="text-xs text-gray-500">
                    .txt, .md, .doc, .docx files supported
                  </p>
                </div>
              </label>
            </div>

            {customDocFile && (
              <div className="bg-primary-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-primary-600 mr-2" />
                  <span className="text-sm text-primary-800">
                    {customDocFile.name} uploaded successfully
                  </span>
                </div>
              </div>
            )}

            {/* Or paste content */}
            <div className="text-center text-sm text-gray-500">or</div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Paste Template Content
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={8}
                value={newCustomDoc.template}
                onChange={(e) => setNewCustomDoc({ ...newCustomDoc, template: e.target.value })}
                placeholder="Paste your template content here..."
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">💡</span>
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Pro Tip</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Providing a template or example helps the AI understand the structure and content you want for this document type.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomDocModal(false);
                setNewCustomDoc({ name: '', description: '', template: '' });
                setCustomDocFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomDocument}
              disabled={!newCustomDoc.name || !newCustomDoc.description}
            >
              Add Custom Document
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stakeholder Edit Modal */}
      <Modal
        isOpen={showEditStakeholder}
        onClose={() => {
          setShowEditStakeholder(false);
          setSelectedStakeholder(null);
        }}
        title="Edit Stakeholder"
        size="lg"
      >
      </Modal>

      {/* Regenerate Modal */}
      <Modal
        isOpen={showRegenerateModal}
        onClose={() => {
          setShowRegenerateModal(false);
          setRegenerateType(null);
        }}
        title={`Regenerate ${regenerateType === 'stakeholders' ? 'Stakeholders' : 'Questions'}`}
      >
        <div className="space-y-4">
          {regenerateType === 'stakeholders' && (
            <div>
              <p className="text-gray-700">
                This will replace all current stakeholders and regenerate the project description using AI.
              </p>
              <p className="text-gray-700">
                Are you sure you want to regenerate all stakeholders using AI?
              </p>
            </div>
          )}
          
          {regenerateType === 'questions' && (
            <div>
              <p className="text-gray-700">
                This will replace all current questions with new AI-generated questions based on your stakeholders and document types.
              </p>
              <p className="text-gray-700">
                Are you sure you want to regenerate all questions using AI?
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowRegenerateModal(false);
                setRegenerateType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => regenerateType && handleRegenerate(regenerateType)}
              loading={loading}
              icon={RefreshCw}
            >
              Regenerate {regenerateType === 'stakeholders' ? 'Stakeholders' : 'Questions'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Collection Picker Modal */}
      <Modal
        isOpen={showCollectionPicker}
        onClose={() => setShowCollectionPicker(false)}
        title="Import Question Collection"
        size="lg"
      >
        <div className="space-y-4">
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No question collections found.</p>
              <p className="text-sm text-gray-500 mt-2">
                Create collections in the Question Collections page first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-4">
                Select a question collection to import into this project:
              </p>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleImportCollection(collection.id)}
                  className="w-full p-4 border border-gray-300 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{collection.name}</h4>
                      {collection.description && (
                        <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                      )}
                    </div>
                    {collection.scope === 'system' && (
                      <Badge variant="info" size="sm">System</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowCollectionPicker(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        isOpen={showCSVUpload}
        onClose={() => {
          setShowCSVUpload(false);
          setCSVFile(null);
        }}
        title="Upload Questions CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
            <p className="text-sm text-blue-800 mb-2">
              Your CSV should have the following columns:
            </p>
            <div className="bg-white rounded p-3 font-mono text-xs">
              Question,Category,Target Roles<br/>
              "What are the main goals?","Project Goals","Product Manager;Stakeholder"<br/>
              "What is the timeline?","Planning","All"
            </div>
            <p className="text-xs text-blue-700 mt-2">
              • Use semicolons to separate multiple target roles<br/>
              • Use "All" for questions that apply to everyone
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Click to upload CSV file
              </p>
              <p className="text-xs text-gray-500">
                or drag and drop
              </p>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowCSVUpload(false);
                setCSVFile(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};