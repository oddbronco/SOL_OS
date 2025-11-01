import React, { useState } from 'react';
import { Upload, Users, Sparkles, Send, FileText, Mic, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { openAIService } from '../services/openai';

// File reading utility
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

interface SimpleProjectSetupProps {
  onComplete: (projectData: any) => void;
}

export const SimpleProjectSetup: React.FC<SimpleProjectSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState({
    clientName: '',
    projectName: '',
    transcript: '',
    stakeholders: [] as Array<{ name: string; email: string; role: string }>,
    questions: [] as Array<{ text: string; category: string }>
  });

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    
    try {
      let transcriptText = '';
      
      // Handle different file types
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        // For audio/video files, use OpenAI Whisper API
        transcriptText = await openAIService.transcribeAudio(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // For text files, read directly
        transcriptText = await readFileAsText(file);
      } else {
        throw new Error('Unsupported file type. Please upload audio, video, or text files.');
      }
      
      // Extract stakeholders from the actual transcript using OpenAI
      const extractedStakeholders = await openAIService.extractStakeholdersFromTranscript(transcriptText);
      
      // Convert to our format and add empty emails for user to fill
      const stakeholders = extractedStakeholders.map((s: any) => ({
        name: s.name,
        email: '', // User will fill this in
        role: s.role,
        department: s.department || ''
      }));
      
      setProjectData(prev => ({ 
        ...prev, 
        transcript: transcriptText,
        stakeholders
      }));
      
      setStep(3);
    } catch (error) {
      console.error('File processing failed:', error);
      
      // More user-friendly error messages
      let errorMessage = 'Failed to process file. ';
      
      if (error.message?.includes('API key')) {
        errorMessage += 'Please set up your OpenAI API key in Settings > Integrations first.';
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        errorMessage += 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage += 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message?.includes('too large')) {
        errorMessage += 'File is too large. Please use a file smaller than 25MB.';
      } else if (error.message?.includes('Unsupported file type')) {
        errorMessage += 'Please upload an audio, video, or text file.';
      } else {
        errorMessage += error.message || 'Please try again or add stakeholders manually.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    setLoading(true);
    
    try {
      // Use real OpenAI API to generate questions based on actual transcript
      const generatedQuestions = await openAIService.generateQuestions({
        projectDescription: `${projectData.clientName} - ${projectData.projectName}`,
        transcription: projectData.transcript,
        stakeholders: projectData.stakeholders.map(s => ({
          role: s.role,
          department: s.department
        }))
      });
      
      // Convert to our simplified format
      const questions = generatedQuestions.map((q: any) => ({
        text: q.text,
        category: q.category,
        target_roles: q.target_roles || ['all']
      }));
      
      setProjectData(prev => ({ ...prev, questions }));
      setStep(4);
    } catch (error) {
      console.error('Question generation failed:', error);
      
      // More user-friendly error messages
      let errorMessage = 'Failed to generate questions. ';
      
      if (error.message?.includes('API key')) {
        errorMessage += 'Please set up your OpenAI API key in Settings > Integrations first.';
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        errorMessage += 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage += 'API rate limit exceeded. Please wait a moment and try again.';
      } else {
        errorMessage += error.message || 'You can add questions manually instead.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendInvites = () => {
    onComplete(projectData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {i}
            </div>
            {i < 4 && <div className={`w-16 h-1 mx-2 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Project Info */}
      {step === 1 && (
        <Card className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Project</h2>
          <p className="text-gray-600 mb-6">Start by entering basic project information</p>
          
          <div className="max-w-md mx-auto space-y-4">
            <Input
              label="Client Company Name"
              value={projectData.clientName}
              onChange={(e) => setProjectData(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="Acme Corporation"
            />
            <Input
              label="Project Name"
              value={projectData.projectName}
              onChange={(e) => setProjectData(prev => ({ ...prev, projectName: e.target.value }))}
              placeholder="E-commerce Platform Redesign"
            />
            <Button
              onClick={() => setStep(2)}
              disabled={!projectData.clientName || !projectData.projectName}
              className="w-full"
              icon={ArrowRight}
              iconPosition="right"
            >
              Continue
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Upload Transcript */}
      {step === 2 && (
        <Card className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Kickoff Call</h2>
          <p className="text-gray-600 mb-6">Upload your discovery call recording or transcript</p>
          
          <div className="max-w-md mx-auto">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
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
                    <Mic className="h-8 w-8 text-gray-400" />
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
            
            {loading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing and extracting stakeholders...</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 3: Review Stakeholders */}
      {step === 3 && (
        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Stakeholders</h2>
            <p className="text-gray-600">We found these stakeholders in your transcript</p>
          </div>

          <div className="space-y-4 mb-6">
            {projectData.stakeholders.map((stakeholder, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-gray-600">{stakeholder.name.charAt(0)}</span>
                  </div>
                  <div>
                    <Input
                      value={stakeholder.name}
                      onChange={(e) => {
                        const updated = [...projectData.stakeholders];
                        updated[index].name = e.target.value;
                        setProjectData(prev => ({ ...prev, stakeholders: updated }));
                      }}
                      className="font-medium"
                    />
                    <Input
                      value={stakeholder.email}
                      onChange={(e) => {
                        const updated = [...projectData.stakeholders];
                        updated[index].email = e.target.value;
                        setProjectData(prev => ({ ...prev, stakeholders: updated }));
                      }}
                      placeholder="email@company.com"
                      className="text-sm mt-1"
                    />
                  </div>
                </div>
                <Badge variant="info">{stakeholder.role}</Badge>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={generateQuestions}
              icon={Sparkles}
              size="lg"
            >
              Generate Interview Questions
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Review Questions & Send */}
      {step === 4 && (
        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Questions</h2>
            <p className="text-gray-600">AI-generated questions based on your project context</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Generating questions...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {projectData.questions.map((question, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="info" size="sm">{question.category}</Badge>
                    </div>
                    <p className="text-gray-900">{question.text}</p>
                  </div>
                ))}
              </div>

              <div className="bg-primary-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 text-primary-600 mr-2" />
                  <p className="text-sm text-primary-800">
                    Ready to send {projectData.stakeholders.length} personalized interview invites
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={sendInvites}
                  icon={Send}
                  size="lg"
                >
                  Send Interview Invites
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};