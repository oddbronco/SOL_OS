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
  Download,
  Eye,
  CheckCircle,
  Clock,
  User,
  X,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useInterviews } from '../../hooks/useInterviews';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface AnswerQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholder: any;
  project: any;
  session: any;
  onSuccess: () => void;
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

export const AnswerQuestionsModal: React.FC<AnswerQuestionsModalProps> = ({
  isOpen,
  onClose,
  stakeholder,
  project,
  session,
  onSuccess
}) => {
  const { isDark } = useTheme();
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
  

  // Current response state
  const [responseType, setResponseType] = useState<'text' | 'audio' | 'video' | 'file'>('text');
  const [textResponses, setTextResponses] = useState<string[]>(['']);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [maxRecordingTime, setMaxRecordingTime] = useState(300); // default 5 minutes
  const [transcribing, setTranscribing] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Media refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const loadAllResponses = async (questionsData: Question[]) => {
    try {
      console.log('📥 Loading all responses...');

      // Get all responses for this stakeholder
      const { data: responsesData, error } = await supabase
        .from('interview_responses')
        .select('*')
        .eq('stakeholder_id', stakeholder.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading responses:', error);
        return;
      }

      // Group responses by question
      const groupedResponses: Record<string, Response[]> = {};
      responsesData?.forEach(response => {
        if (!groupedResponses[response.question_id]) {
          groupedResponses[response.question_id] = [];
        }
        groupedResponses[response.question_id].push(response);
      });

      setResponses(groupedResponses);
      console.log('✅ Loaded responses for', Object.keys(groupedResponses).length, 'questions');

    } catch (error) {
      console.error('💥 Error loading all responses:', error);
    }
  };

  const loadQuestions = React.useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading questions for stakeholder:', stakeholder?.id);
      console.log('🎫 Session ID:', session?.id);
      console.log('🎫 Full session object:', session);

      if (!stakeholder?.id) {
        console.error('❌ No stakeholder ID available');
        setLoading(false);
        return;
      }

      const assignments = await getStakeholderQuestionAssignments(stakeholder.id, session?.id);
      console.log('📋 Loaded assignments:', assignments.length);
      console.log('📋 Assignment details:', assignments);

      if (assignments.length === 0) {
        console.warn('⚠️ No question assignments found for stakeholder:', stakeholder.id, 'session:', session?.id);
      }

      const questionsData = assignments.map(a => ({
        id: a.question_id,
        text: a.question?.text || '',
        category: a.question?.category || '',
        target_roles: a.question?.target_roles || []
      }));

      console.log('📝 Questions data mapped:', questionsData.length);
      setQuestions(questionsData);

      // Load all responses for all questions
      await loadAllResponses(questionsData);

    } catch (error) {
      console.error('❌ Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  }, [stakeholder?.id, session?.id, getStakeholderQuestionAssignments]);

  // Load questions and responses
  useEffect(() => {
    if (isOpen && stakeholder && session) {
      console.log('🔥 Modal opened - loading questions with session:', session.id);
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stakeholder?.id, session?.id]);

  // Load current question's responses when question changes
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      loadCurrentQuestionResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, questions.length]);

  // Calculate max recording time based on system settings
  useEffect(() => {
    const systemConfig = localStorage.getItem('system_config');
    if (systemConfig) {
      const config = JSON.parse(systemConfig);
      const bucketLimitMB = config.storage_bucket_file_size_limit_mb || 200;
      const bitrate = config.estimated_recording_bitrate_kbps || 128;

      // Calculate max time in seconds: (MB * 1024 * 8) / (kbps) = seconds
      const maxTimeSeconds = Math.floor((bucketLimitMB * 1024 * 8) / bitrate);
      setMaxRecordingTime(maxTimeSeconds);

      console.log(`📊 Max recording time: ${Math.floor(maxTimeSeconds / 60)} minutes (${bucketLimitMB}MB @ ${bitrate}kbps)`);
    }
  }, []);

  // Track changes to determine button state
  useEffect(() => {
    const hasNewText = textResponses.some(text => text.trim() !== '');
    const hasNewRecording = recordingBlob !== null;
    const hasNewFile = uploadedFiles.length > 0;

    setHasUnsavedChanges(hasNewText || hasNewRecording || hasNewFile);
  }, [textResponses, recordingBlob, uploadedFiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear recording timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      
      // Cleanup media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      cleanupRecording();
    };
  }, []);

  const loadCurrentQuestionResponses = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const questionResponses = responses[currentQuestion.id] || [];
    
    // Load text responses
    const textResponses = questionResponses
      .filter(r => r.response_type === 'text')
      .map(r => r.response_text || '');
    
    if (textResponses.length > 0) {
      setTextResponses(textResponses);
    } else {
      setTextResponses(['']);
    }

    // Load uploaded files for file type
    if (responseType === 'file') {
      const fileResponses = questionResponses.filter(r => r.response_type === 'file');
      setUploadedFiles([]);
    }

    // Reset recording state when switching questions
    cleanupRecording();
  };

  const cleanupRecording = () => {
    console.log('🧹 Cleaning up recording resources...');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }

    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }

    setIsRecording(false);
    setRecordingBlob(null);
    setRecordingUrl(null);
    setRecordingDuration(0);
    setRecordingStartTime(0);
  };

  const startRecording = async () => {
    try {
      console.log('🎬 Starting recording for type:', responseType);
      cleanupRecording();

      const constraints = responseType === 'video' 
        ? { 
            video: { 
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30 }
            }, 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          }
        : { 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          };

      console.log('🎥 Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log('✅ Media stream obtained:', stream.getTracks().map(t => t.kind));

      // Setup live video preview IMMEDIATELY for video
      if (responseType === 'video' && liveVideoRef.current) {
        console.log('📺 Setting up live video preview...');
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.playsInline = true;
        liveVideoRef.current.style.transform = 'scaleX(-1)'; // Mirror effect
        
        try {
          await liveVideoRef.current.play();
          console.log('✅ Live video preview started successfully');
        } catch (playError) {
          console.error('❌ Video play failed:', playError);
        }
      }

      // Setup MediaRecorder with proper options
      const options: MediaRecorderOptions = {};
      
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options.mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
      }

      if (responseType === 'audio') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
      }

      console.log('🎬 Creating MediaRecorder with options:', options);
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Recording stopped, creating blob from', chunks.length, 'chunks');
        
        // Clear timer when recording stops
        if (recordingTimer) {
          clearInterval(recordingTimer);
          setRecordingTimer(null);
        }
        
        const mimeType = mediaRecorder.mimeType || (responseType === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunks, { type: mimeType });
        
        console.log('📦 Created blob:', blob.size, 'bytes, type:', blob.type);
        setRecordingBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        
        // Stop live preview
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
        }

        console.log('✅ Recording blob created and URL generated');
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      mediaRecorder.onstart = () => {
        console.log('▶️ MediaRecorder started');
      };

      // Start recording with timeslice for regular data events
      console.log('🎬 Starting MediaRecorder...');
      mediaRecorder.start(100); // Record in small chunks for better responsiveness
      
      // Set recording state AFTER starting
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      setHasUnsavedChanges(true);
      
      // Start the duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;

          // Calculate estimated size (bitrate * time / 8 for bytes, then to MB)
          const systemConfig = localStorage.getItem('system_config');
          const bitrate = systemConfig ? (JSON.parse(systemConfig).estimated_recording_bitrate_kbps || 128) : 128;
          const estimatedMB = (bitrate * newDuration) / (8 * 1024);
          setEstimatedSize(estimatedMB);

          // Auto-stop at max recording time
          if (newDuration >= maxRecordingTime) {
            console.warn(`⚠️ Reached maximum recording time (${Math.floor(maxRecordingTime / 60)} minutes)`);
            stopRecording();
            alert(`Recording stopped: Maximum recording time reached (${Math.floor(maxRecordingTime / 60)} minutes)`);
            return maxRecordingTime;
          }
          return newDuration;
        });
      }, 1000);
      
      setRecordingTimer(timer);
      console.log('🎬 Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      cleanupRecording();
      
      if (error.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow access and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera/microphone found. Please check your devices and try again.');
      } else {
        alert(`Failed to start recording: ${error.message}`);
      }
    }
  };

  const stopRecording = async () => {
    console.log('🛑 Stopping recording...');
    
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      console.warn('⚠️ MediaRecorder not in recording state');
      return;
    }
    
    // Clear the recording timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Don't stop the stream yet - let the onstop handler deal with cleanup
    setIsRecording(false);
    console.log('✅ Recording stop initiated');
  };

  const discardRecording = () => {
    console.log('🗑️ Discarding recording...');
    cleanupRecording();
    setRecordingBlob(null);
    setRecordingUrl(null);
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Check file limits
    const currentFiles = uploadedFiles.length;
    const newFiles = fileArray.slice(0, 3 - currentFiles);
    
    if (newFiles.length === 0) {
      alert('Maximum 3 files allowed per question');
      return;
    }

    // Check video duration limit for each file
    for (const file of newFiles) {
      if (file.type.startsWith('video/')) {
        const duration = await getMediaDuration(file);
        if (duration > 300) { // 5 minutes
          alert(`Video "${file.name}" is ${Math.round(duration/60)} minutes long. Maximum 5 minutes allowed.`);
          return;
        }
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Auto-transcribe audio/video files
    for (const file of newFiles) {
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        await transcribeUploadedFile(file);
      }
    }
  };

  const transcribeUploadedFile = async (file: File) => {
    try {
      setTranscribing(true);
      console.log('🎤 Transcribing uploaded file:', file.name);
      
      const transcription = await transcribeAudio(file);
      console.log('✅ Transcription completed for uploaded file');
      
      // Store transcription in database with proper metadata
      await supabase.from('transcriptions').insert({
        original_file_url: file.name,
        transcription_text: transcription,
        confidence_score: 0.95,
        language: 'en',
        word_count: transcription.split(' ').length,
        processing_status: 'completed',
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ File transcription failed:', error);
    } finally {
      setTranscribing(false);
    }
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
      console.log('💾 Saving response for question:', currentQuestion.id);

      let savedAny = false;

      // Handle different response types
      if (responseType === 'text') {
        // Save all non-empty text responses
        for (const text of textResponses.filter(t => t.trim())) {
          await submitResponse(
            project.id,
            stakeholder.id,
            currentQuestion.id,
            {
              response_type: 'text',
              response_text: text
            }
          );
          savedAny = true;
        }
      } else if ((responseType === 'video' || responseType === 'audio') && recordingBlob) {
        // Save recording (replaces existing)
        const fileExtension = responseType === 'video' ? 'webm' : 'webm';
        const file = new File([recordingBlob], 
          `${responseType}-${Date.now()}.${fileExtension}`, 
          { type: recordingBlob.type }
        );

        console.log('📤 Uploading recording file:', file.name, file.size, 'bytes');
        const uploadResult = await uploadFile(
          project.id,
          stakeholder.id,
          file,
          'response'
        );

        // Transcribe the recording
        let transcription = '';
        try {
          setTranscribing(true);
          console.log('🎤 Transcribing recording...');
          transcription = await transcribeAudio(file);
          console.log('✅ Recording transcribed successfully');
        } catch (error) {
          console.warn('⚠️ Recording transcription failed:', error);
        } finally {
          setTranscribing(false);
        }

        await submitResponse(
          project.id,
          stakeholder.id,
          currentQuestion.id,
          {
            response_type: responseType,
            file_url: uploadResult.file_url,
            file_name: uploadResult.file_name,
            file_size: uploadResult.file_size,
            duration_seconds: recordingDuration,
            transcription
          }
        );

        discardRecording();
        savedAny = true;

      } else if (responseType === 'file' && uploadedFiles.length > 0) {
        // Save all uploaded files
        for (const file of uploadedFiles) {
          console.log('📤 Uploading file:', file.name);
          const uploadResult = await uploadFile(
            project.id,
            stakeholder.id,
            file,
            'response'
          );

          let transcription = '';
          if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            try {
              setTranscribing(true);
              console.log('🎤 Transcribing uploaded file...');
              transcription = await transcribeAudio(file);
              console.log('✅ File transcribed successfully');
            } catch (error) {
              console.warn('⚠️ File transcription failed:', error);
            } finally {
              setTranscribing(false);
            }
          }

          const duration = file.type.startsWith('audio/') || file.type.startsWith('video/')
            ? await getMediaDuration(file)
            : undefined;

          await submitResponse(
            project.id,
            stakeholder.id,
            currentQuestion.id,
            {
              response_type: 'file',
              file_url: uploadResult.file_url,
              file_name: uploadResult.file_name,
              file_size: uploadResult.file_size,
              duration_seconds: duration,
              transcription
            }
          );
          savedAny = true;
        }

        setUploadedFiles([]);
      }

      if (savedAny) {
        // Reload responses to show updated data
        await loadAllResponses(questions);

        // Refresh parent data to update progress metrics
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-advance to next question
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        }
      }

      console.log('✅ Response saved successfully');
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('💥 Failed to save response:', error);
      alert('Failed to save response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completeInterview = async () => {
    try {
      // Save current response first if there is one
      await saveAndNext();
      
      // Update stakeholder status to completed
      await supabase
        .from('stakeholders')
        .update({ status: 'completed' })
        .eq('id', stakeholder.id);

      // Update interview session if exists
      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('stakeholder_id', stakeholder.id)
        .limit(1);

      if (sessions && sessions.length > 0) {
        await supabase
          .from('interview_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            completion_percentage: 100
          })
          .eq('id', sessions[0].id);
      }

      // Refresh parent data to update progress metrics
      if (onSuccess) {
        onSuccess();
      }

      onSuccess();
      onClose();
      alert('Interview completed successfully! Thank you for your participation.');
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const deleteResponse = async (questionId: string, responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      await supabase
        .from('interview_responses')
        .delete()
        .eq('id', responseId);

      // Reload responses
      await loadAllResponses(questions);
      
    } catch (error) {
      console.error('Failed to delete response:', error);
    }
  };

  const addTextResponse = () => {
    setTextResponses(prev => [...prev, '']);
  };

  const updateTextResponse = (index: number, value: string) => {
    setTextResponses(prev => prev.map((text, i) => i === index ? value : text));
  };

  const removeTextResponse = (index: number) => {
    if (textResponses.length > 1) {
      setTextResponses(prev => prev.filter((_, i) => i !== index));
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  const hasCurrentResponse = () => {
    if (responseType === 'text') {
      return textResponses.some(t => t.trim().length > 0);
    } else if (responseType === 'audio' || responseType === 'video') {
      return recordingBlob !== null;
    } else if (responseType === 'file') {
      return uploadedFiles.length > 0;
    }
    return false;
  };

  const getTotalResponses = () => {
    return Object.values(responses).reduce((sum, questionResponses) => sum + questionResponses.length, 0);
  };

  const getCompletedQuestions = () => {
    return Object.keys(responses).filter(questionId => responses[questionId].length > 0).length;
  };

  const getCurrentQuestionResponses = () => {
    const currentQuestion = questions[currentQuestionIndex];
    return currentQuestion ? responses[currentQuestion.id] || [] : [];
  };

  const hasExistingVideoOrAudio = (type: 'video' | 'audio') => {
    const currentResponses = getCurrentQuestionResponses();
    return currentResponses.some(r => r.response_type === type);
  };

  const getCurrentResponse = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;
    
    const questionResponses = responses[currentQuestion.id] || [];
    return questionResponses.length > 0 ? questionResponses[0] : null;
  };

  const getButtonText = () => {
    const currentResponse = getCurrentResponse();
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    
    if (!hasUnsavedChanges && currentResponse) {
      return isLastQuestion ? 'Complete Interview' : 'Next Question';
    }
    
    if (currentResponse) {
      return isLastQuestion ? 'Update & Complete' : 'Update & Next Question';
    }
    
    return isLastQuestion ? 'Save & Complete' : 'Save & Next Question';
  };

  const isButtonEnabled = () => {
    const currentResponse = getCurrentResponse();
    
    // If there's an existing response and no changes, always enabled
    if (currentResponse && !hasUnsavedChanges) {
      return true;
    }
    
    // If there are unsaved changes, enabled
    if (hasUnsavedChanges) {
      return true;
    }
    
    // If no response exists and no new data, disabled
    return false;
  };

  const handleSaveAndNext = async () => {
    if (!hasUnsavedChanges && getCurrentResponse()) {
      // Just navigate to next question if no changes and response exists
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
      return;
    }
    
    await saveAndNext();
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Interview..." size="xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview questions...</p>
        </div>
      </Modal>
    );
  }

  if (questions.length === 0) {
    console.log('⚠️ Showing no questions message');
    console.log('⚠️ Debug info:', {
      hasStakeholder: !!stakeholder,
      stakeholderId: stakeholder?.id,
      hasSession: !!session,
      sessionId: session?.id,
      loading
    });
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="No Questions Available" size="lg">
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions assigned</h3>
          <p className="text-gray-600 mb-6">
            No questions have been assigned to this stakeholder yet.
          </p>
          <div className="text-xs text-gray-400 mb-4 p-3 bg-gray-50 rounded">
            <p>Debug Info:</p>
            <p>Stakeholder ID: {stakeholder?.id}</p>
            <p>Session ID: {session?.id}</p>
            <p>Check browser console for more details</p>
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionResponses = getCurrentQuestionResponses();
  const completedQuestions = getCompletedQuestions();
  const totalResponses = getTotalResponses();
  const completionPercentage = Math.round((completedQuestions / questions.length) * 100);

  // Interview Overview
  if (showOverview) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Interview Overview" size="xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Complete Interview Overview</h3>
              <p className="text-gray-600">
                {completedQuestions} of {questions.length} questions completed • {totalResponses} total responses
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowOverview(false)}
            >
              Back to Questions
            </Button>
          </div>

          {/* Progress */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Overall Progress</h4>
                <p className="text-sm text-blue-700">
                  {completedQuestions} of {questions.length} questions have responses
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

          {/* All Questions and Responses */}
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {questions.map((question, index) => {
              const questionResponses = responses[question.id] || [];
              const hasResponses = questionResponses.length > 0;
              
              return (
                <Card key={question.id} className={`${
                  hasResponses ? 'border-green-200 bg-primary-50' : 'border-gray-200'
                }`}>
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="info">Q{index + 1}</Badge>
                          <Badge variant="default">{question.category}</Badge>
                          {hasResponses && (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {questionResponses.length} response{questionResponses.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          {question.text}
                        </h4>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentQuestionIndex(index);
                          setShowOverview(false);
                        }}
                      >
                        {hasResponses ? 'Add More' : 'Answer'}
                      </Button>
                    </div>

                    {/* All Responses for this Question */}
                    {hasResponses ? (
                      <div className="space-y-3">
                        {questionResponses.map((response, responseIndex) => (
                          <div key={response.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Badge variant="success" size="sm">
                                  {response.response_type.toUpperCase()}
                                </Badge>
                                {response.duration_seconds && (
                                  <span className="text-xs text-gray-500">
                                    {formatDuration(response.duration_seconds)}
                                  </span>
                                )}
                                {response.file_size && (
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(response.file_size)} MB
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {response.created_at && new Date(response.created_at).toLocaleString()}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={Trash2}
                                  onClick={() => deleteResponse(question.id, response.id!)}
                                  className="text-red-600 hover:bg-red-50"
                                />
                              </div>
                            </div>

                            {/* Response Content */}
                            {response.response_type === 'text' && response.response_text && (
                              <div className="p-3 rounded bg-gray-50">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {response.response_text}
                                </p>
                              </div>
                            )}

                            {response.response_type === 'video' && response.file_url && (
                              <video
                                src={response.file_url}
                                controls
                                className="w-full max-w-md rounded border"
                                preload="metadata"
                              />
                            )}
                            
                            {response.response_type === 'audio' && response.file_url && (
                              <audio
                                src={response.file_url}
                                controls
                                className="w-full"
                                preload="metadata"
                              />
                            )}

                            {response.response_type === 'file' && response.file_url && (
                              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{response.file_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {response.file_size && `${formatFileSize(response.file_size)} MB`}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={Download}
                                  onClick={() => window.open(response.file_url, '_blank')}
                                >
                                  Download
                                </Button>
                              </div>
                            )}

                            {/* Transcription */}
                            {response.transcription && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">
                                  Transcription:
                                </h5>
                                <div className="p-3 rounded text-sm bg-blue-50 text-blue-700">
                                  {response.transcription}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center border-gray-300">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">No responses yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Complete Interview */}
          {completedQuestions === questions.length && (
            <Card className="bg-primary-50 border-green-200 text-center">
              <div className="py-6">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary-600" />
                <h3 className="text-lg font-medium text-primary-900 mb-2">
                  All Questions Completed!
                </h3>
                <p className="text-primary-700 mb-4">
                  You've provided responses to all {questions.length} questions with {totalResponses} total responses.
                </p>
                <Button
                  onClick={completeInterview}
                  icon={CheckCircle}
                  size="lg"
                >
                  Complete Interview
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Modal>
    );
  }

  // Main Interview Interface
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stakeholder Interview" size="xl">
      <div className="space-y-6">
        {/* Progress Header */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">{stakeholder?.name}</h3>
                <p className="text-sm text-blue-700">{stakeholder?.role} • {stakeholder?.department}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowOverview(true)}
                icon={Eye}
              >
                Overview ({completedQuestions}/{questions.length})
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">{completionPercentage}%</div>
                <p className="text-sm text-blue-700">
                  {totalResponses} responses
                </p>
                <div className="w-32 bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Current Question */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h3>
              <Badge variant="info">{currentQuestion?.category}</Badge>
            </div>
          </div>
          
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestion?.text}
          </h4>
          {currentQuestion?.target_roles && currentQuestion.target_roles.length > 0 && (
            <p className="text-sm text-gray-600 mb-4">
              Target roles: {currentQuestion.target_roles.join(', ')}
            </p>
          )}
        </Card>

        {/* Existing Responses */}
        {currentQuestionResponses.length > 0 && (
          <Card className="bg-primary-50 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-primary-900">
                Existing Responses ({currentQuestionResponses.length})
              </h4>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {currentQuestionResponses.map((response, index) => (
                <div key={response.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <Badge variant="success" size="sm">
                      {response.response_type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-700">
                      {response.response_type === 'text' 
                        ? response.response_text?.substring(0, 50) + (response.response_text && response.response_text.length > 50 ? '...' : '')
                        : response.file_name
                      }
                    </span>
                    {response.duration_seconds && (
                      <span className="text-xs text-gray-500">
                        {formatDuration(response.duration_seconds)}
                      </span>
                    )}
                    {response.created_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(response.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteResponse(currentQuestion.id, response.id!)}
                    icon={Trash2}
                    className="text-red-600 hover:bg-red-50"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Response Type Selector */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Add Response:</h4>
          <div className="flex space-x-2">
            {[
              { type: 'text' as const, icon: FileText, label: 'Text', color: 'blue' },
              { type: 'audio' as const, icon: Mic, label: 'Audio', color: 'green' },
              { type: 'video' as const, icon: Video, label: 'Video', color: 'purple' },
              { type: 'file' as const, icon: Upload, label: 'File', color: 'orange' }
            ].map(({ type, icon: Icon, label, color }) => {
              const hasExisting = hasExistingVideoOrAudio(type as 'video' | 'audio');
              const isDisabled = (type === 'video' || type === 'audio') && hasExisting;
              
              return (
                <button
                  key={type}
                  onClick={() => {
                    if (!isDisabled) {
                      setResponseType(type);
                      cleanupRecording();
                      if (type !== 'file') setUploadedFiles([]);
                    }
                  }}
                  disabled={isDisabled}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    isDisabled
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : responseType === type
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                  {isDisabled && <span className="text-xs">(1 max)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Response Input */}
        <Card>
          {/* Text Response */}
          {responseType === 'text' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Text Responses (can add multiple)</h4>
              {textResponses.map((text, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Response {index + 1}
                    </label>
                    {textResponses.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={X}
                        onClick={() => removeTextResponse(index)}
                      />
                    )}
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    value={text}
                    onChange={(e) => updateTextResponse(index, e.target.value)}
                    placeholder="Type your response here..."
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                icon={Upload}
                onClick={addTextResponse}
              >
                Add Another Text Response
              </Button>
            </div>
          )}

          {/* Audio Recording */}
          {responseType === 'audio' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Audio Recording (one per question)</h4>
              
              {!isRecording && !recordingBlob && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Record your audio response</p>
                  <Button onClick={startRecording} icon={Mic} size="lg">
                    Start Audio Recording
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="text-center py-8 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">Recording Audio...</span>
                  </div>

                  <div className="text-3xl font-mono font-bold text-red-700 mb-2">
                    {formatDuration(recordingDuration)} / {formatDuration(maxRecordingTime)}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-md mx-auto mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${recordingDuration / maxRecordingTime > 0.9 ? 'bg-red-600' : recordingDuration / maxRecordingTime > 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, (recordingDuration / maxRecordingTime) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Estimated: {estimatedSize.toFixed(1)} MB</span>
                      <span className={recordingDuration / maxRecordingTime > 0.9 ? 'text-red-600 font-bold' : ''}>
                        {formatDuration(maxRecordingTime - recordingDuration)} remaining
                      </span>
                    </div>
                  </div>

                  {/* Audio Waveform */}
                  <div className="flex items-center justify-center space-x-1 mb-4">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded animate-pulse"
                        style={{
                          height: `${Math.random() * 20 + 10}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>

                  <Button onClick={stopRecording} variant="outline" icon={Square}>
                    Stop Recording
                  </Button>
                </div>
              )}

              {recordingBlob && recordingUrl && (
                <div className="space-y-4 p-4 bg-primary-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-primary-900">Audio Recording Complete</h4>
                    <Button variant="outline" size="sm" onClick={discardRecording} icon={RotateCcw}>
                      Record Again
                    </Button>
                  </div>

                  <audio
                    src={recordingUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  />

                  <div className="text-sm text-primary-700 text-center">
                    Duration: {formatDuration(recordingDuration)} • Size: {formatFileSize(recordingBlob.size)} MB
                  </div>

                  {transcribing && (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p className="text-sm text-primary-700">Transcribing audio...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video Recording */}
          {responseType === 'video' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Video Recording (one per question)</h4>
              
              {!isRecording && !recordingBlob && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">Record your video response</p>
                  <Button onClick={startRecording} icon={Video} size="lg">
                    Start Video Recording
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="space-y-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-700 font-medium">Recording Video...</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-red-700">
                      {formatDuration(recordingDuration)} / 5:00
                    </div>
                  </div>

                  {/* Live Video Preview */}
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                      <video
                        ref={liveVideoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <div className="absolute top-4 left-4 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                          RECORDING LIVE
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="text-white text-lg font-mono bg-black bg-opacity-50 px-3 py-1 rounded">
                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button onClick={stopRecording} variant="outline" icon={Square} size="lg">
                      Stop Recording
                    </Button>
                  </div>
                </div>
              )}

              {recordingBlob && recordingUrl && (
                <div className="space-y-4 p-4 bg-primary-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-primary-900">Video Recording Complete</h4>
                    <Button variant="outline" size="sm" onClick={discardRecording} icon={RotateCcw}>
                      Record Again
                    </Button>
                  </div>

                  <video
                    src={recordingUrl}
                    controls
                    className="w-full max-w-md mx-auto rounded-lg border"
                    preload="metadata"
                  />

                  <div className="text-sm text-primary-700 text-center">
                    Duration: {formatDuration(recordingDuration)} • Size: {formatFileSize(recordingBlob.size)} MB
                  </div>

                  {transcribing && (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p className="text-sm text-primary-700">Transcribing video...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Upload */}
          {responseType === 'file' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">File Upload (up to 3 files, max 5min video)</h4>
              
              {uploadedFiles.length < 3 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="*/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileUpload(e.target.files);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-900 mb-2">Upload Files</p>
                    <p className="text-sm text-gray-500">
                      {3 - uploadedFiles.length} files remaining • Max 5min video
                    </p>
                  </label>
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-primary-50 border border-green-200 rounded">
                      <div className="flex items-center space-x-3">
                        <Upload className="h-6 w-6 text-primary-600" />
                        <div>
                          <p className="font-medium text-primary-900">{file.name}</p>
                          <p className="text-sm text-primary-700">
                            {formatFileSize(file.size)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        icon={Trash2}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {transcribing && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Transcribing audio/video files...</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Single Navigation Bar */}
        <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close Interview
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={getButtonText().includes('Next') || getButtonText().includes('Complete') ? handleSaveAndNext : completeInterview}
                loading={saving}
                disabled={!isButtonEnabled()}
                icon={ArrowRight}
                iconPosition="right"
                size="lg"
              >
                {getButtonText()}
              </Button>
            ) : (
              <Button
                onClick={completeInterview}
                loading={saving}
                icon={CheckCircle}
                className="bg-primary-600 hover:bg-primary-700"
                size="lg"
              >
                Complete Interview
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};