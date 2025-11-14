import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Video,
  FileText,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useInterviews } from '../../hooks/useInterviews';
import { supabase } from '../../lib/supabase';

interface InlineInterviewFlowProps {
  stakeholder: any;
  project: any;
  session: any;
  onSuccess: () => void;
  onComplete?: () => void;
  onBack?: () => void;
  primaryColor?: string;
  textColor?: string;
}

interface Question {
  id: string;
  text: string;
  category: string;
  target_roles: string[];
}

interface Response {
  id?: string;
  response_type: 'text' | 'audio' | 'video' | 'file';
  response_text?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  duration_seconds?: number;
  transcription?: string;
  ai_summary?: string;
  created_at?: string;
}

export const InlineInterviewFlow: React.FC<InlineInterviewFlowProps> = ({
  stakeholder,
  project,
  session,
  onSuccess,
  onComplete,
  onBack,
  primaryColor = '#16a34a',
  textColor = '#ffffff'
}) => {
  const {
    getStakeholderQuestionAssignments,
    submitResponse,
    uploadFile,
    transcribeAudio
  } = useInterviews();

  // Core state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, Response[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Response state
  const [responseType, setResponseType] = useState<'text' | 'audio' | 'video' | 'file'>('text');
  const [textResponse, setTextResponse] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadQuestions();
    return () => cleanupRecording();
  }, [session]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const assignments = await getStakeholderQuestionAssignments(
        project.id,
        stakeholder.id,
        session.id
      );

      const questionsData = assignments.map((a: any) => ({
        id: a.question_id,
        text: a.question?.text || '',
        category: a.question?.category || 'general',
        target_roles: a.question?.target_roles || []
      }));

      setQuestions(questionsData);
      await loadAllResponses(questionsData);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllResponses = async (questionsData: Question[]) => {
    try {
      const { data } = await supabase
        .from('interview_responses')
        .select('*')
        .eq('stakeholder_id', stakeholder.id)
        .eq('interview_session_id', session.id);

      const responseMap: Record<string, Response[]> = {};
      questionsData.forEach(q => responseMap[q.id] = []);

      data?.forEach(resp => {
        if (!responseMap[resp.question_id]) {
          responseMap[resp.question_id] = [];
        }
        responseMap[resp.question_id].push(resp);
      });

      setResponses(responseMap);
    } catch (error) {
      console.error('Failed to load responses:', error);
    }
  };

  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async (type: 'audio' | 'video') => {
    try {
      chunksRef.current = [];
      setRecordingBlob(null);
      setRecordingDuration(0);

      const constraints = type === 'video'
        ? { video: true, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: type === 'video'
          ? 'video/webm;codecs=vp8,opus'
          : 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: type === 'video' ? 'video/webm' : 'audio/webm'
        });
        setRecordingBlob(blob);
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access your camera/microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const discardRecording = () => {
    cleanupRecording();
    setRecordingBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.slice(0, 3 - uploadedFiles.length);

    for (const file of newFiles) {
      if (file.type.startsWith('video/')) {
        const duration = await getMediaDuration(file);
        if (duration > 300) {
          alert(`Video "${file.name}" is ${Math.round(duration/60)} minutes long. Maximum 5 minutes allowed.`);
          return;
        }
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const element = file.type.startsWith('video/')
        ? document.createElement('video')
        : document.createElement('audio');

      element.onloadedmetadata = () => {
        resolve(Math.round(element.duration));
        URL.revokeObjectURL(url);
      };

      element.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(url);
      };

      element.src = url;
    });
  };

  const saveAndNext = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setSaving(true);
    try {
      let savedAny = false;

      if (responseType === 'text' && textResponse.trim()) {
        await submitResponse(
          project.id,
          stakeholder.id,
          currentQuestion.id,
          {
            response_type: 'text',
            response_text: textResponse
          },
          session.id
        );
        savedAny = true;
        setTextResponse('');
      } else if ((responseType === 'video' || responseType === 'audio') && recordingBlob) {
        const fileExtension = 'webm';
        const file = new File([recordingBlob],
          `${responseType}-${Date.now()}.${fileExtension}`,
          { type: recordingBlob.type }
        );

        const fileUrl = await uploadFile(file, project.id);

        await submitResponse(
          project.id,
          stakeholder.id,
          currentQuestion.id,
          {
            response_type: responseType,
            file_url: fileUrl,
            file_name: file.name,
            file_size: file.size,
            duration_seconds: recordingDuration
          },
          session.id
        );
        savedAny = true;
        discardRecording();
      } else if (responseType === 'file' && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileUrl = await uploadFile(file, project.id);
          await submitResponse(
            project.id,
            stakeholder.id,
            currentQuestion.id,
            {
              response_type: 'file',
              file_url: fileUrl,
              file_name: file.name,
              file_size: file.size
            },
            session.id
          );
        }
        savedAny = true;
        setUploadedFiles([]);
      }

      if (savedAny) {
        await loadAllResponses(questions);
        onSuccess();
      }

      // Move to next question or complete
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        await completeInterview();
      }

    } catch (error) {
      console.error('Failed to save response:', error);
      alert('Failed to save response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completeInterview = async () => {
    try {
      await supabase
        .from('interview_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const hasCurrentResponse = () => {
    if (responseType === 'text') return textResponse.trim().length > 0;
    if (responseType === 'audio' || responseType === 'video') return recordingBlob !== null;
    if (responseType === 'file') return uploadedFiles.length > 0;
    return false;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600 mb-6">No questions have been assigned yet.</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionResponses = responses[currentQuestion.id] || [];
  const completedQuestions = Object.keys(responses).filter(qId => responses[qId].length > 0).length;
  const progress = Math.round((completedQuestions / questions.length) * 100);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile-optimized header */}
      <div
        className="sticky top-0 z-10 shadow-md"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: textColor }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: textColor, opacity: 0.9 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="w-10" />
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: textColor,
                opacity: 0.8
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Card className="mb-6">
          <div className="p-6">
            <Badge variant="info" size="sm" className="mb-3">
              {currentQuestion.category}
            </Badge>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 leading-relaxed">
              {currentQuestion.text}
            </h2>

            {/* Response type selector */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { type: 'text', icon: FileText, label: 'Text' },
                { type: 'audio', icon: Mic, label: 'Audio' },
                { type: 'video', icon: Video, label: 'Video' },
                { type: 'file', icon: Upload, label: 'File' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setResponseType(type as any)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    responseType === type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${
                    responseType === type ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-xs font-medium ${
                    responseType === type ? 'text-primary-700' : 'text-gray-600'
                  }`}>
                    {label}
                  </p>
                </button>
              ))}
            </div>

            {/* Response input area */}
            <div className="space-y-4">
              {responseType === 'text' && (
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full h-48 p-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none resize-none text-base"
                  style={{ fontSize: '16px' }}
                />
              )}

              {(responseType === 'audio' || responseType === 'video') && (
                <div className="space-y-4">
                  {!recordingBlob ? (
                    <>
                      {isRecording ? (
                        <div className="text-center py-8">
                          <div className="w-24 h-24 mx-auto mb-4 relative">
                            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Square className="h-10 w-10 text-white" />
                            </div>
                          </div>
                          <p className="text-2xl font-mono font-bold text-gray-900 mb-2">
                            {formatDuration(recordingDuration)}
                          </p>
                          <p className="text-gray-600 mb-6">
                            {responseType === 'video' ? 'Video' : 'Audio'} recording...
                          </p>
                          <Button onClick={stopRecording} variant="danger" size="lg">
                            <Square className="h-5 w-5 mr-2" />
                            Stop Recording
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Button
                            onClick={() => startRecording(responseType)}
                            size="lg"
                            style={{ backgroundColor: primaryColor, color: textColor }}
                          >
                            {responseType === 'video' ? <Video className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                            Start {responseType === 'video' ? 'Video' : 'Audio'}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      <CheckCircle className="h-12 w-12 text-primary-600 mx-auto mb-3" />
                      <p className="font-medium text-gray-900 mb-1">
                        {responseType === 'video' ? 'Video' : 'Audio'} Recorded
                      </p>
                      <p className="text-gray-600 mb-4">Duration: {formatDuration(recordingDuration)}</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={discardRecording} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {responseType === 'file' && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    disabled={uploadedFiles.length >= 3}
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Choose Files (Max 3)
                  </Button>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                          <button
                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Existing responses */}
            {currentQuestionResponses.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Previous Responses ({currentQuestionResponses.length})
                </p>
                <div className="space-y-2">
                  {currentQuestionResponses.map((resp, idx) => (
                    <div key={idx} className="p-3 bg-primary-50 rounded-lg text-sm">
                      <Badge variant="success" size="sm" className="mb-2">
                        {resp.response_type}
                      </Badge>
                      {resp.response_text && <p className="text-gray-700">{resp.response_text}</p>}
                      {resp.file_name && <p className="text-gray-600">{resp.file_name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mobile-optimized sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <Button
              onClick={saveAndNext}
              disabled={saving || (!hasCurrentResponse() && currentQuestionResponses.length === 0)}
              className="flex-1"
              size="lg"
              style={{ backgroundColor: primaryColor, color: textColor }}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  {isLastQuestion ? (
                    hasCurrentResponse() ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Save & Complete
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Complete Interview
                      </>
                    )
                  ) : (
                    <>
                      {hasCurrentResponse() ? 'Save & ' : 'Skip to '}Next
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
