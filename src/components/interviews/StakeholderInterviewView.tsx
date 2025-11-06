import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  Video, 
  Mic, 
  Download, 
  Eye,
  CheckCircle,
  Clock,
  Upload,
  Play,
  User,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useInterviews, QuestionAssignment, InterviewResponse } from '../../hooks/useInterviews';
import { useTheme } from '../../contexts/ThemeContext';

interface StakeholderInterviewViewProps {
  stakeholder: any;
  project: any;
  onBack: () => void;
}

export const StakeholderInterviewView: React.FC<StakeholderInterviewViewProps> = ({
  stakeholder,
  project,
  onBack
}) => {
  const { isDark } = useTheme();
  const { getStakeholderQuestionAssignments } = useInterviews();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<InterviewResponse | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [stakeholder]);

  const loadAssignments = async () => {
    if (!stakeholder) return;

    try {
      setLoading(true);
      console.log('📋 Loading assignments for stakeholder:', stakeholder.id, stakeholder.name);
      const data = await getStakeholderQuestionAssignments(stakeholder.id);
      console.log('✅ Loaded assignments:', {
        total: data.length,
        withResponses: data.filter(a => a.response).length,
        assignments: data.map(a => ({
          id: a.id,
          question: a.question?.text?.substring(0, 50),
          hasResponse: !!a.response,
          responseType: a.response?.response_type
        }))
      });
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResponseIcon = (responseType: string) => {
    switch (responseType) {
      case 'video': return Video;
      case 'audio': return Mic;
      case 'file': return Upload;
      default: return FileText;
    }
  };

  const getResponseTypeColor = (responseType: string) => {
    switch (responseType) {
      case 'video': return 'text-purple-600';
      case 'audio': return 'text-blue-600';
      case 'file': return 'text-primary-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewResponse = (response: InterviewResponse) => {
    setSelectedResponse(response);
    setShowResponseModal(true);
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const completedCount = assignments.filter(a => a.response).length;
  const completionPercentage = assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading interview data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={onBack}
          >
            Back to Interviews
          </Button>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stakeholder.name} - Interview Details
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {stakeholder.role} • {stakeholder.department}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Interview Progress</h3>
            <p className="text-sm text-blue-700">
              {completedCount} of {assignments.length} questions completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-900">{completionPercentage}%</div>
            <div className="w-32 bg-blue-200 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Questions and Responses */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Questions & Responses
        </h3>

        {assignments.length === 0 ? (
          <Card className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No questions assigned</h4>
            <p className="text-gray-600">Assign questions to this stakeholder to start the interview</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment, index) => {
              const hasResponse = !!assignment.response;
              const ResponseIcon = hasResponse ? getResponseIcon(assignment.response?.response_type || 'text') : Clock;
              
              return (
                <Card key={assignment.id} className={`${
                  hasResponse ? 'border-green-200 bg-primary-50' : 'border-gray-200'
                }`}>
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="info">Q{index + 1}</Badge>
                          <Badge variant="default">{assignment.question?.category}</Badge>
                          {assignment.is_required && (
                            <Badge variant="warning" size="sm">Required</Badge>
                          )}
                          {hasResponse && (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {assignment.question?.text}
                        </h4>
                        {assignment.question?.target_roles && assignment.question.target_roles.length > 0 && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Target roles: {assignment.question.target_roles.join(', ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ResponseIcon className={`h-5 w-5 ${
                          hasResponse ? getResponseTypeColor(assignment.response?.response_type || 'text') : 'text-gray-400'
                        }`} />
                        {hasResponse && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            onClick={() => handleViewResponse(assignment.response!)}
                          >
                            View Response
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Response Preview */}
                    {hasResponse && assignment.response && (
                      <div className={`border rounded-lg p-4 ${
                        isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="success" size="sm">
                              {assignment.response.response_type.toUpperCase()}
                            </Badge>
                            {assignment.response.duration_seconds && (
                              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Duration: {formatDuration(assignment.response.duration_seconds)}
                              </span>
                            )}
                            {assignment.response.file_size && (
                              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Size: {(assignment.response.file_size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(assignment.response.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Text Response */}
                        {assignment.response.response_type === 'text' && assignment.response.response_text && (
                          <div className={`p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {assignment.response.response_text}
                            </p>
                          </div>
                        )}

                        {/* File Response */}
                        {(assignment.response.response_type === 'audio' || 
                          assignment.response.response_type === 'video' || 
                          assignment.response.response_type === 'file') && 
                          assignment.response.file_url && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {assignment.response.file_name}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                icon={Download}
                                onClick={() => downloadFile(assignment.response!.file_url!, assignment.response!.file_name!)}
                              >
                                Download
                              </Button>
                            </div>

                            {/* Media Preview */}
                            {assignment.response.response_type === 'video' && (
                              <video
                                src={assignment.response.file_url}
                                controls
                                className="w-full max-w-md rounded border"
                              />
                            )}
                            
                            {assignment.response.response_type === 'audio' && (
                              <audio
                                src={assignment.response.file_url}
                                controls
                                className="w-full"
                              />
                            )}
                          </div>
                        )}

                        {/* Transcription */}
                        {assignment.response.transcription && (
                          <div className="mt-3">
                            <h5 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              Transcription:
                            </h5>
                            <div className={`p-3 rounded text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                              {assignment.response.transcription}
                            </div>
                          </div>
                        )}

                        {/* AI Summary */}
                        {assignment.response.ai_summary && (
                          <div className="mt-3">
                            <h5 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              AI Summary:
                            </h5>
                            <div className={`p-3 rounded text-sm ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                              {assignment.response.ai_summary}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Response */}
                    {!hasResponse && (
                      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        isDark ? 'border-gray-600' : 'border-gray-300'
                      }`}>
                        <Clock className={`h-8 w-8 mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          No response yet
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Response Detail Modal */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => {
          setShowResponseModal(false);
          setSelectedResponse(null);
        }}
        title="Response Details"
        size="lg"
      >
        {selectedResponse && (
          <div className="space-y-6">
            {/* Response Info */}
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">
                    {selectedResponse.response_type.toUpperCase()} Response
                  </h4>
                  <p className="text-sm text-blue-700">
                    Submitted {new Date(selectedResponse.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedResponse.duration_seconds && (
                    <Badge variant="info">
                      {formatDuration(selectedResponse.duration_seconds)}
                    </Badge>
                  )}
                  {selectedResponse.file_size && (
                    <Badge variant="default">
                      {(selectedResponse.file_size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Response Content */}
            <div className="space-y-4">
              {/* Text Response */}
              {selectedResponse.response_text && (
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">Text Response</h4>
                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedResponse.response_text}
                    </p>
                  </div>
                </Card>
              )}

              {/* File Response */}
              {selectedResponse.file_url && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">File</h4>
                    <Button
                      variant="outline"
                      icon={Download}
                      onClick={() => downloadFile(selectedResponse.file_url!, selectedResponse.file_name!)}
                    >
                      Download
                    </Button>
                  </div>
                  
                  {selectedResponse.response_type === 'video' && (
                    <video
                      src={selectedResponse.file_url}
                      controls
                      className="w-full rounded border"
                    />
                  )}
                  
                  {selectedResponse.response_type === 'audio' && (
                    <audio
                      src={selectedResponse.file_url}
                      controls
                      className="w-full"
                    />
                  )}
                  
                  {selectedResponse.response_type === 'file' && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedResponse.file_name}</p>
                        <p className="text-sm text-gray-600">
                          {selectedResponse.file_size && `${(selectedResponse.file_size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Transcription */}
              {selectedResponse.transcription && (
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">Transcription</h4>
                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedResponse.transcription}
                    </p>
                  </div>
                </Card>
              )}

              {/* AI Summary */}
              {selectedResponse.ai_summary && (
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">AI Summary</h4>
                  <div className="bg-blue-50 rounded p-4">
                    <p className="text-blue-800">
                      {selectedResponse.ai_summary}
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedResponse(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};