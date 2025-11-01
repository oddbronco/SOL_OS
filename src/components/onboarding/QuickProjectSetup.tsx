import React, { useState } from 'react';
import { Upload, Users, MessageSquare, Sparkles, ArrowRight, FileText, Mic } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';

interface QuickProjectSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (projectData: any) => void;
}

export const QuickProjectSetup: React.FC<QuickProjectSetupProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState({
    clientName: '',
    clientEmail: '',
    clientIndustry: '',
    projectName: '',
    projectDescription: '',
    kickoffFile: null as File | null,
    stakeholders: [] as Array<{
      name: string;
      email: string;
      role: string;
      department: string;
    }>
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    category: string;
    text: string;
    stakeholder_specific: boolean;
    target_roles: string[];
  }>>([]);
  const [transcription, setTranscription] = useState('');

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      // Simulate file upload and transcription
      const formData = new FormData();
      formData.append('file', file);
      
      // Mock transcription result
      const mockTranscription = `
        Client: We need to redesign our e-commerce platform. Current conversion rate is only 2.3% and users are dropping off at checkout.
        
        Key Pain Points:
        - Checkout process is too complex (7 steps)
        - Mobile experience is poor
        - Search functionality doesn't work well
        - Product pages lack social proof
        
        Goals:
        - Increase conversion rate to 4%+
        - Improve mobile experience
        - Streamline checkout to 3 steps
        - Add personalization features
        
        Stakeholders mentioned:
        - Sarah (Product Manager) - knows user pain points
        - Mike (CTO) - technical constraints
        - Lisa (Marketing Director) - conversion optimization
        - Tom (Customer Support) - user feedback insights
      `;
      
      setTranscription(mockTranscription);
      setProjectData(prev => ({ ...prev, kickoffFile: file }));
      
      // Auto-extract stakeholders from transcription
      const extractedStakeholders = [
        { name: 'Sarah Johnson', email: '', role: 'Product Manager', department: 'Product' },
        { name: 'Mike Chen', email: '', role: 'CTO', department: 'Engineering' },
        { name: 'Lisa Rodriguez', email: '', role: 'Marketing Director', department: 'Marketing' },
        { name: 'Tom Wilson', email: '', role: 'Customer Support Lead', department: 'Support' }
      ];
      
      setProjectData(prev => ({ ...prev, stakeholders: extractedStakeholders }));
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    setLoading(true);
    try {
      // Mock AI-generated questions based on transcription
      const questions = [
        {
          category: 'Business Goals',
          text: 'What specific metrics would indicate success for this e-commerce redesign project?',
          stakeholder_specific: false,
          target_roles: ['all']
        },
        {
          category: 'User Experience',
          text: 'What are the top 3 user pain points you\'ve observed in the current checkout process?',
          stakeholder_specific: true,
          target_roles: ['Product Manager', 'Customer Support Lead']
        },
        {
          category: 'Technical',
          text: 'What technical constraints or legacy systems do we need to consider during the redesign?',
          stakeholder_specific: true,
          target_roles: ['CTO']
        },
        {
          category: 'Marketing',
          text: 'What conversion optimization strategies have you tried before, and what were the results?',
          stakeholder_specific: true,
          target_roles: ['Marketing Director']
        },
        {
          category: 'User Feedback',
          text: 'What are the most common complaints or feature requests you receive from customers?',
          stakeholder_specific: true,
          target_roles: ['Customer Support Lead']
        },
        {
          category: 'Mobile Experience',
          text: 'How does mobile performance currently compare to desktop, and what are the key mobile-specific issues?',
          stakeholder_specific: false,
          target_roles: ['all']
        }
      ];
      
      setGeneratedQuestions(questions);
    } catch (error) {
      console.error('Question generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStakeholderUpdate = (index: number, field: string, value: string) => {
    setProjectData(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.map((stakeholder, i) => 
        i === index ? { ...stakeholder, [field]: value } : stakeholder
      )
    }));
  };

  const handleComplete = () => {
    const completeProjectData = {
      ...projectData,
      questions: generatedQuestions,
      transcription
    };
    onComplete(completeProjectData);
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Client Information</h3>
              <p className="text-gray-600">Let's start by setting up your new client</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Client Company Name"
                value={projectData.clientName}
                onChange={(e) => setProjectData(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Acme Corporation"
                required
              />
              <Input
                label="Primary Contact Email"
                type="email"
                value={projectData.clientEmail}
                onChange={(e) => setProjectData(prev => ({ ...prev, clientEmail: e.target.value }))}
                placeholder="contact@acme.com"
                required
              />
            </div>

            <Select
              label="Industry"
              value={projectData.clientIndustry}
              onChange={(e) => setProjectData(prev => ({ ...prev, clientIndustry: e.target.value }))}
              options={[
                { value: '', label: 'Select Industry' },
                { value: 'technology', label: 'Technology' },
                { value: 'ecommerce', label: 'E-commerce' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'finance', label: 'Finance' },
                { value: 'retail', label: 'Retail' },
                { value: 'manufacturing', label: 'Manufacturing' },
                { value: 'other', label: 'Other' }
              ]}
            />

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Project Name"
                value={projectData.projectName}
                onChange={(e) => setProjectData(prev => ({ ...prev, projectName: e.target.value }))}
                placeholder="E-commerce Platform Redesign"
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Project Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={projectData.projectDescription}
                  onChange={(e) => setProjectData(prev => ({ ...prev, projectDescription: e.target.value }))}
                  placeholder="Brief description of the project goals and scope..."
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Upload Kickoff Recording</h3>
              <p className="text-gray-600">Upload your initial discovery call to auto-generate questions</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="audio/*,video/*,.txt,.docx"
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
                    <Mic className="h-8 w-8 text-gray-400" />
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports audio, video, or text files
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {projectData.kickoffFile && (
              <Card className="bg-primary-50 border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-primary-900">{projectData.kickoffFile.name}</p>
                    <p className="text-sm text-primary-700">File uploaded successfully</p>
                  </div>
                  <Badge variant="success">Ready</Badge>
                </div>
              </Card>
            )}

            {transcription && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-3">Transcription Preview</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{transcription}</p>
                </div>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Stakeholder Details</h3>
              <p className="text-gray-600">Review and complete stakeholder information</p>
            </div>

            <div className="space-y-4">
              {projectData.stakeholders.map((stakeholder, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      value={stakeholder.name}
                      onChange={(e) => handleStakeholderUpdate(index, 'name', e.target.value)}
                      placeholder="Full Name"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={stakeholder.email}
                      onChange={(e) => handleStakeholderUpdate(index, 'email', e.target.value)}
                      placeholder="email@company.com"
                    />
                    <Input
                      label="Role"
                      value={stakeholder.role}
                      onChange={(e) => handleStakeholderUpdate(index, 'role', e.target.value)}
                      placeholder="Job Title"
                    />
                    <Input
                      label="Department"
                      value={stakeholder.department}
                      onChange={(e) => handleStakeholderUpdate(index, 'department', e.target.value)}
                      placeholder="Department"
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setProjectData(prev => ({
                  ...prev,
                  stakeholders: [...prev.stakeholders, { name: '', email: '', role: '', department: '' }]
                }));
              }}
              className="w-full"
            >
              Add Another Stakeholder
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Generated Questions</h3>
              <p className="text-gray-600">Review and customize the interview questions</p>
            </div>

            {generatedQuestions.length === 0 ? (
              <div className="text-center py-8">
                <Button
                  onClick={generateQuestions}
                  loading={loading}
                  icon={Sparkles}
                  size="lg"
                >
                  Generate Questions with AI
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Based on your kickoff call transcription
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="info">{question.category}</Badge>
                      {question.stakeholder_specific && (
                        <Badge variant="warning" size="sm">
                          Role-specific
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-900 mb-2">{question.text}</p>
                    {question.target_roles.length > 0 && question.target_roles[0] !== 'all' && (
                      <p className="text-sm text-gray-500">
                        Target roles: {question.target_roles.join(', ')}
                      </p>
                    )}
                  </Card>
                ))}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-800">
                      {generatedQuestions.length} questions generated. You can edit these after project creation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return projectData.clientName && projectData.clientEmail && projectData.projectName;
      case 2:
        return projectData.kickoffFile && transcription;
      case 3:
        return projectData.stakeholders.every(s => s.name && s.email && s.role);
      case 4:
        return generatedQuestions.length > 0;
      default:
        return false;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              icon={ArrowRight}
              iconPosition="right"
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
              loading={loading}
            >
              Create Project & Send Invites
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};