import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Lock, CheckCircle, User, Calendar, Clock, XCircle, Video, ChevronRight, ChevronLeft, Shield,
  Mic, FileText, Upload, Square, Trash2, Play, Check
} from 'lucide-react';
import Hls from 'hls.js';
import { getMuxPlaybackUrl } from '../utils/muxPlaybackToken';
import { useInterviews } from '../hooks/useInterviews';

type SessionState = 'active' | 'expired' | 'locked' | 'closed' | 'not_found';

interface IntroVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: 'upload' | 'external';
  mux_playback_id?: string;
  mux_status?: string;
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
  created_at?: string;
}

export const InterviewPage: React.FC = () => {
  const { sessionToken: tokenFromParams, projectId: projectIdFromParams, stakeholderId: stakeholderIdFromParams } = useParams<{
    sessionToken?: string;
    projectId?: string;
    stakeholderId?: string;
  }>();

  const [searchParams] = useSearchParams();
  const passwordFromUrl = searchParams.get('pwd');
  const projectIdFromQuery = searchParams.get('project');
  const stakeholderIdFromQuery = searchParams.get('stakeholder');

  const sessionToken = tokenFromParams || null;
  const projectId = projectIdFromParams || projectIdFromQuery;
  const stakeholderId = stakeholderIdFromParams || stakeholderIdFromQuery;

  // State
  const [session, setSession] = useState<any>(null);
  const [stakeholder, setStakeholder] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState(passwordFromUrl || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [projectBranding, setProjectBranding] = useState<any>({});
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Questions and responses
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, Response[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Response input
  const [responseType, setResponseType] = useState<'text' | 'audio' | 'video' | 'file'>('text');
  const [textResponse, setTextResponse] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    getStakeholderQuestionAssignments,
    submitResponse,
    uploadFile
  } = useInterviews();

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') ? url.split('/').pop() : new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const loadSession = useCallback(async () => {
    if (!projectId || !stakeholderId) {
      setError('Missing required parameters');
      setLoading(false);
      setSessionState('not_found');
      return;
    }

    try {
      console.log('Loading session for:', { projectId, stakeholderId, sessionToken });

      let sessionQuery = supabase
        .from('interview_sessions')
        .select('*, project:projects(*), stakeholder:stakeholders(*)');

      // If we have a session token, use it to find the session
      if (sessionToken) {
        sessionQuery = sessionQuery.eq('session_token', sessionToken);
      }
      // Otherwise, use project_id and stakeholder_id
      else if (projectId && stakeholderId) {
        sessionQuery = sessionQuery
          .eq('project_id', projectId)
          .eq('stakeholder_id', stakeholderId);
      }
      // If we have neither, we can't find the session
      else {
        setSessionState('not_found');
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await sessionQuery.maybeSingle();

      if (sessionError || !sessionData) {
        setSessionState('not_found');
        setLoading(false);
        return;
      }

      const projectData = sessionData.project;
      const stakeholderData = sessionData.stakeholder;

      if (!projectData || !stakeholderData) {
        setSessionState('not_found');
        setLoading(false);
        return;
      }

      const expiresAt = sessionData.expires_at ? new Date(sessionData.expires_at) : null;
      if (expiresAt && expiresAt < new Date()) setSessionState('expired');
      else if (sessionData.status === 'cancelled') setSessionState('closed');
      else if (sessionData.status === 'completed') setInterviewStarted(true);
      else setSessionState('active');

      setSession(sessionData);
      setStakeholder(stakeholderData);
      setProject(projectData);

      console.log('✅ Session loaded:', { sessionData, stakeholderData, projectData });

      const { data: branding } = await supabase.from('project_branding').select('*').eq('project_id', projectData.id).maybeSingle();
      if (branding) setProjectBranding(branding);

      const { data: videoAssignment } = await supabase.from('project_intro_video_assignments').select(`intro_video:project_intro_videos(*)`).eq('project_id', projectData.id).eq('stakeholder_id', stakeholderData.id).maybeSingle();
      console.log('🎥 Video assignment:', videoAssignment);
      if (videoAssignment?.intro_video) {
        setIntroVideo(videoAssignment.intro_video);
      }

      await loadQuestions(projectData.id, stakeholderData.id, sessionData.id);

      if (sessionData.access_password) {
        setAuthenticated(passwordFromUrl === sessionData.access_password);
      } else {
        setAuthenticated(true);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load interview session');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, projectId, stakeholderId, passwordFromUrl]);

  const loadQuestions = async (projectId: string, stakeholderId: string, sessionId: string) => {
    try {
      console.log('📝 Loading questions for:', { projectId, stakeholderId, sessionId });
      const assignments = await getStakeholderQuestionAssignments(stakeholderId, sessionId);
      console.log('📝 Got assignments:', assignments);
      const questionsData = assignments.map((a: any) => ({
        id: a.question_id,
        text: a.question?.text || '',
        category: a.question?.category || 'general',
        target_roles: a.question?.target_roles || []
      }));
      console.log('📝 Parsed questions:', questionsData);
      setQuestions(questionsData);
      await loadAllResponses(questionsData, stakeholderId, sessionId);
    } catch (error) {
      console.error('❌ Failed to load questions:', error);
    }
  };

  const loadAllResponses = async (questionsData: Question[], stakeholderId: string, sessionId: string) => {
    try {
      const { data } = await supabase.from('interview_responses').select('*').eq('stakeholder_id', stakeholderId).eq('interview_session_id', sessionId);
      const responseMap: Record<string, Response[]> = {};
      questionsData.forEach(q => responseMap[q.id] = []);
      data?.forEach(resp => {
        if (responseMap[resp.question_id]) {
          responseMap[resp.question_id].push(resp);
        }
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Failed to load responses:', error);
    }
  };

  useEffect(() => {
    if (introVideo && videoRef.current && introVideo.mux_playback_id && introVideo.video_type === 'upload') {
      const playbackId = introVideo.mux_playback_id;
      const domain = import.meta.env.VITE_APP_DOMAIN || window.location.origin;

      getMuxPlaybackUrl(playbackId, domain).then(url => {
        if (url && videoRef.current) {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = url;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }
  }, [introVideo]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const handleAuthenticate = () => {
    if (password === session.access_password) {
      setAuthenticated(true);
      setFailedAttempts(0);
    } else {
      setFailedAttempts(prev => prev + 1);
      if (failedAttempts >= 2) setSessionState('locked');
    }
  };

  const startInterview = () => {
    setInterviewStarted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTextResponse('');
      setUploadedFiles([]);
      setRecordingBlob(null);
      setResponseType('text');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setTextResponse('');
      setUploadedFiles([]);
      setRecordingBlob(null);
      setResponseType('text');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompleteInterview = async () => {
    try {
      await supabase
        .from('interview_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);
      await loadSession();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error completing interview:', error);
      alert('Failed to complete interview. Please try again.');
    }
  };

  const cleanupRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
  };

  const startRecording = async (type: 'audio' | 'video') => {
    try {
      chunksRef.current = [];
      setRecordingBlob(null);
      setRecordingDuration(0);
      const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: type === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus'
      });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
        setRecordingBlob(blob);
        streamRef.current?.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (error) {
      alert('Could not access your camera/microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
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
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const saveResponse = async () => {
    if (!session || !stakeholder || !project) return;
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setSaving(true);
    try {
      let savedAny = false;
      if (responseType === 'text' && textResponse.trim()) {
        await submitResponse(project.id, stakeholder.id, currentQuestion.id, { response_type: 'text', response_text: textResponse }, session.id);
        savedAny = true;
        setTextResponse('');
      } else if ((responseType === 'video' || responseType === 'audio') && recordingBlob) {
        const file = new File([recordingBlob], `${responseType}-${Date.now()}.webm`, { type: recordingBlob.type });
        const fileUrl = await uploadFile(file, project.id);
        await submitResponse(project.id, stakeholder.id, currentQuestion.id, {
          response_type: responseType, file_url: fileUrl, file_name: file.name, file_size: file.size, duration_seconds: recordingDuration
        }, session.id);
        savedAny = true;
        discardRecording();
      } else if (responseType === 'file' && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileUrl = await uploadFile(file, project.id);
          await submitResponse(project.id, stakeholder.id, currentQuestion.id, {
            response_type: 'file', file_url: fileUrl, file_name: file.name, file_size: file.size
          }, session.id);
        }
        savedAny = true;
        setUploadedFiles([]);
      }
      if (savedAny) {
        await loadQuestions(project.id, stakeholder.id, session.id);
      }
    } catch (error) {
      alert('Failed to save response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const primaryColor = projectBranding.primary_color || '#3B82F6';
  const secondaryColor = projectBranding.secondary_color || '#10B981';
  const textColor = projectBranding.text_color || '#FFFFFF';

  const completedQuestions = Object.keys(responses).filter(qId => responses[qId].length > 0).length;
  const progress = questions.length > 0 ? Math.round((completedQuestions / questions.length) * 100) : 0;
  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionResponses = currentQuestion ? (responses[currentQuestion.id] || []) : [];
  const isCurrentQuestionAnswered = currentQuestionResponses.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your interview...</p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Not Found</h2>
          <p className="text-gray-600">This interview session could not be found.</p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600">This interview session has expired.</p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'locked') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Locked</h2>
          <p className="text-gray-600">Too many failed attempts. Please contact support.</p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <XCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Closed</h2>
          <p className="text-gray-600">This interview has been closed.</p>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Protected Interview</h2>
            <p className="text-gray-600">Please enter the access password</p>
          </div>
          <div className="space-y-4">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()} />
            {failedAttempts > 0 && <p className="text-sm text-red-600">Incorrect password. {3 - failedAttempts} attempts remaining.</p>}
            <Button onClick={handleAuthenticate} className="w-full">Access Interview</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Completed Interview View
  if (session?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {projectBranding.logo_url && (
              <img src={projectBranding.logo_url} alt="Logo" className="h-10 object-contain" />
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card className="text-center p-12 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-2xl">
            <CheckCircle className="h-24 w-24 text-green-600 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Interview Completed!</h1>
            <p className="text-lg text-gray-600 mb-2">Thank you for your valuable insights, {stakeholder.name}.</p>
            <p className="text-gray-500">Your responses have been recorded successfully.</p>
            {session.expires_at && (
              <div className="mt-6 pt-6 border-t border-green-200">
                <p className="text-sm text-gray-600">
                  This session {new Date(session.expires_at) > new Date() ? 'expires' : 'expired'} on{' '}
                  <span className="font-semibold">{new Date(session.expires_at).toLocaleDateString()}</span>
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Fixed Header with Progress */}
      {interviewStarted && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              {projectBranding.logo_url && (
                <img src={projectBranding.logo_url} alt="Logo" className="h-10 object-contain" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: primaryColor }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card - Show only if interview not started */}
        {!interviewStarted && (
          <>
            <Card className="overflow-hidden border-0 shadow-xl">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                    <User className="h-10 w-10" style={{ color: textColor }} />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {stakeholder.name}!</h1>
                    <p className="text-lg text-gray-700 mb-3">{stakeholder.role} {stakeholder.department && `• ${stakeholder.department}`}</p>
                    <p className="text-gray-600 mb-4">Thank you for participating in <span className="font-semibold">{project.name}</span></p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(session.created_at).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4" />~15-20 minutes</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Video Card */}
            {introVideo && (
              <Card className="overflow-hidden border-0 shadow-xl">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{introVideo.title}</h3>
                      {introVideo.description && <p className="text-sm text-gray-600">{introVideo.description}</p>}
                    </div>
                  </div>
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-6">
                    {introVideo.video_type === 'upload' ? (
                      <video ref={videoRef} controls preload="metadata" playsInline crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-contain" />
                    ) : (
                      <iframe src={getEmbedUrl(introVideo.video_url)} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                    )}
                  </div>
                  <Button onClick={startInterview} className="w-full" size="lg" style={{ backgroundColor: primaryColor, color: textColor }}>
                    Begin Interview <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </Card>
            )}

            {!introVideo && (
              <div className="text-center py-8">
                <Button onClick={startInterview} size="lg" style={{ backgroundColor: primaryColor, color: textColor }}>
                  Begin Interview <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Sequential Question View */}
        {interviewStarted && currentQuestion && (
          <Card className="border-0 shadow-xl">
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-2xl`} style={{ backgroundColor: isCurrentQuestionAnswered ? primaryColor : '#E5E7EB', color: isCurrentQuestionAnswered ? textColor : '#6B7280' }}>
                  {isCurrentQuestionAnswered ? <Check className="h-8 w-8" /> : currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="info">{currentQuestion.category}</Badge>
                    {isCurrentQuestionAnswered && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Answered</Badge>}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentQuestion.text}</h2>
                </div>
              </div>

              {/* Response Type Selector */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { type: 'text', icon: FileText, label: 'Text' },
                  { type: 'audio', icon: Mic, label: 'Audio' },
                  { type: 'video', icon: Video, label: 'Video' },
                  { type: 'file', icon: Upload, label: 'File' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setResponseType(type as any)}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${responseType === type ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${responseType === type ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium ${responseType === type ? 'text-blue-700' : 'text-gray-600'}`}>{label}</p>
                  </button>
                ))}
              </div>

              {/* Response Input */}
              <div className="space-y-4 mb-6">
                {responseType === 'text' && (
                  <div>
                    <textarea
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      placeholder="Type your response here..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                    />
                    <Button onClick={saveResponse} disabled={!textResponse.trim() || saving} className="mt-3" style={{ backgroundColor: primaryColor, color: textColor }}>
                      {saving ? 'Saving...' : 'Save Answer'}
                    </Button>
                  </div>
                )}

                {responseType === 'audio' && (
                  <div className="space-y-3">
                    {!isRecording && !recordingBlob && (
                      <Button onClick={() => startRecording('audio')} className="w-full" variant="secondary">
                        <Mic className="h-5 w-5 mr-2" />Start Audio Recording
                      </Button>
                    )}
                    {isRecording && (
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                          <span className="text-lg font-semibold">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={stopRecording} style={{ backgroundColor: primaryColor, color: textColor }}><Square className="h-5 w-5 mr-2" />Stop</Button>
                          <Button onClick={discardRecording} variant="secondary">Cancel</Button>
                        </div>
                      </div>
                    )}
                    {recordingBlob && !isRecording && (
                      <div className="space-y-3">
                        <audio src={URL.createObjectURL(recordingBlob)} controls className="w-full" />
                        <div className="flex gap-3">
                          <Button onClick={saveResponse} disabled={saving} className="flex-1" style={{ backgroundColor: primaryColor, color: textColor }}>
                            {saving ? 'Saving...' : 'Save Recording'}
                          </Button>
                          <Button onClick={discardRecording} variant="secondary"><Trash2 className="h-5 w-5 mr-2" />Discard</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {responseType === 'video' && (
                  <div className="space-y-3">
                    {!isRecording && !recordingBlob && (
                      <Button onClick={() => startRecording('video')} className="w-full" variant="secondary">
                        <Video className="h-5 w-5 mr-2" />Start Video Recording
                      </Button>
                    )}
                    {isRecording && (
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                          <span className="text-lg font-semibold">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button onClick={stopRecording} style={{ backgroundColor: primaryColor, color: textColor }}><Square className="h-5 w-5 mr-2" />Stop</Button>
                          <Button onClick={discardRecording} variant="secondary">Cancel</Button>
                        </div>
                      </div>
                    )}
                    {recordingBlob && !isRecording && (
                      <div className="space-y-3">
                        <video src={URL.createObjectURL(recordingBlob)} controls className="w-full rounded-xl" />
                        <div className="flex gap-3">
                          <Button onClick={saveResponse} disabled={saving} className="flex-1" style={{ backgroundColor: primaryColor, color: textColor }}>
                            {saving ? 'Saving...' : 'Save Recording'}
                          </Button>
                          <Button onClick={discardRecording} variant="secondary"><Trash2 className="h-5 w-5 mr-2" />Discard</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {responseType === 'file' && (
                  <div>
                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} multiple className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} className="w-full mb-3" variant="secondary">
                      <Upload className="h-5 w-5 mr-2" />Choose Files
                    </Button>
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <Button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} variant="secondary" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedFiles.length > 0 && (
                      <Button onClick={saveResponse} disabled={saving} style={{ backgroundColor: primaryColor, color: textColor }}>
                        {saving ? 'Saving...' : 'Upload Files'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Existing Responses */}
              {currentQuestionResponses.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Your Previous Answers:</h4>
                  <div className="space-y-3">
                    {currentQuestionResponses.map((resp, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                        <Badge variant="success" size="sm" className="mb-2">{resp.response_type}</Badge>
                        {resp.response_text && <p className="text-gray-700">{resp.response_text}</p>}
                        {resp.file_name && <p className="text-gray-600 text-sm">{resp.file_name}</p>}
                        {resp.created_at && <p className="text-xs text-gray-500 mt-2">{new Date(resp.created_at).toLocaleString()}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8 pt-6 border-t">
                <Button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  variant="secondary"
                  className="flex-1"
                >
                  <ChevronLeft className="h-5 w-5 mr-2" />Previous
                </Button>
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={goToNextQuestion}
                    style={{ backgroundColor: primaryColor, color: textColor }}
                    className="flex-1"
                  >
                    Next<ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCompleteInterview}
                    disabled={completedQuestions < questions.length}
                    style={{ backgroundColor: secondaryColor, color: textColor }}
                    className="flex-1"
                  >
                    Complete Interview<CheckCircle className="h-5 w-5 ml-2" />
                  </Button>
                )}
              </div>

              {currentQuestionIndex === questions.length - 1 && completedQuestions < questions.length && (
                <p className="text-center text-sm text-gray-600 mt-4">
                  Please answer all questions before completing the interview
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};
