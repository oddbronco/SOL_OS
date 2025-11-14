import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Lock, CheckCircle, User, Calendar, Clock, XCircle, Video, ChevronRight, Shield,
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
  
  // Questions and responses
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, Response[]>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  
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
  const questionsRef = useRef<HTMLDivElement>(null);

  const {
    getStakeholderQuestionAssignments,
    submitResponse,
    uploadFile
  } = useInterviews();

  const getEmbedUrl = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('/').pop()?.split('?')[0]
        : new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  // Video initialization
  useEffect(() => {
    const initVideo = async () => {
      if (!introVideo || !videoRef.current) return;
      if (introVideo.video_type === 'upload' && introVideo.mux_playback_id) {
        try {
          const playbackUrl = await getMuxPlaybackUrl(introVideo.mux_playback_id);
          if (Hls.isSupported()) {
            if (hlsRef.current) hlsRef.current.destroy();
            const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60, enableWorker: true });
            hlsRef.current = hls;
            hls.loadSource(playbackUrl);
            hls.attachMedia(videoRef.current);
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = playbackUrl;
          }
        } catch (error) {
          console.error('Failed to load video:', error);
        }
      }
    };
    initVideo();
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [introVideo]);

  // Load session data
  const loadSession = useCallback(async () => {
    if (!sessionToken && (!projectId || !stakeholderId)) {
      setError('Invalid interview link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let sessionData, stakeholderData, projectData;

      if (sessionToken) {
        const { data: session } = await supabase
          .from('interview_sessions')
          .select(`*, stakeholder:stakeholders(*), project:projects(*)`)
          .eq('session_token', sessionToken)
          .maybeSingle();
        if (!session) { setSessionState('not_found'); setLoading(false); return; }
        sessionData = session;
        stakeholderData = session.stakeholder;
        projectData = session.project;
      } else {
        const [{ data: session }, { data: stakeholderRes }, { data: projectRes }] = await Promise.all([
          supabase.from('interview_sessions').select('*').eq('project_id', projectId).eq('stakeholder_id', stakeholderId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('stakeholders').select('*').eq('id', stakeholderId).single(),
          supabase.from('projects').select('*').eq('id', projectId).single()
        ]);
        sessionData = session;
        stakeholderData = stakeholderRes;
        projectData = projectRes;
      }

      if (!sessionData || !stakeholderData || !projectData) {
        setSessionState('not_found');
        setLoading(false);
        return;
      }

      const expiresAt = sessionData.expires_at ? new Date(sessionData.expires_at) : null;
      if (expiresAt && expiresAt < new Date()) setSessionState('expired');
      else if (sessionData.status === 'cancelled') setSessionState('closed');
      else setSessionState('active');

      setSession(sessionData);
      setStakeholder(stakeholderData);
      setProject(projectData);

      console.log('✅ Session loaded:', { sessionData, stakeholderData, projectData });

      const { data: branding } = await supabase.from('project_branding').select('*').eq('project_id', projectData.id).maybeSingle();
      if (branding) setProjectBranding(branding);

      // Try to get video assignment (by session first, then by stakeholder)
      let videoData = null;
      if (sessionData?.id) {
        const { data: sessionAssignment } = await supabase
          .from('intro_video_assignments')
          .select(`intro_video:project_intro_videos(*)`)
          .eq('project_id', projectData.id)
          .eq('interview_session_id', sessionData.id)
          .maybeSingle();
        console.log('🎥 Session video assignment:', sessionAssignment);
        if (sessionAssignment?.intro_video) videoData = sessionAssignment.intro_video;
      }

      if (!videoData) {
        const { data: stakeholderAssignment } = await supabase
          .from('intro_video_assignments')
          .select(`intro_video:project_intro_videos(*)`)
          .eq('project_id', projectData.id)
          .eq('stakeholder_id', stakeholderData.id)
          .is('interview_session_id', null)
          .maybeSingle();
        console.log('🎥 Stakeholder video assignment:', stakeholderAssignment);
        if (stakeholderAssignment?.intro_video) videoData = stakeholderAssignment.intro_video;
      }

      // Fall back to default active video
      if (!videoData) {
        const { data: defaultVideo, error: videoError } = await supabase
          .from('project_intro_videos')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('is_active', true)
          .maybeSingle();
        console.log('🎥 Default video query:', { defaultVideo, videoError, projectId: projectData.id });
        if (defaultVideo) videoData = defaultVideo;
      }

      if (videoData) {
        console.log('🎥 Setting intro video:', videoData);
        setIntroVideo(videoData);
      } else {
        console.log('❌ No intro video found for project');
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
        if (!responseMap[resp.question_id]) responseMap[resp.question_id] = [];
        responseMap[resp.question_id].push(resp);
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Failed to load responses:', error);
    }
  };

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

  const scrollToQuestions = () => {
    setHasStarted(true);
    if (questions.length > 0) {
      setCurrentQuestionId(questions[0].id);
      setTimeout(() => {
        questionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        scrollToQuestion(questions[0].id);
      }, 100);
    }
  };

  const scrollToQuestion = (questionId: string) => {
    const element = document.getElementById(`question-${questionId}`);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Recording functions
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

  const saveResponse = async (questionId: string) => {
    if (!session || !stakeholder || !project) return;
    setSaving(true);
    try {
      let savedAny = false;
      if (responseType === 'text' && textResponse.trim()) {
        await submitResponse(project.id, stakeholder.id, questionId, { response_type: 'text', response_text: textResponse }, session.id);
        savedAny = true;
        setTextResponse('');
      } else if ((responseType === 'video' || responseType === 'audio') && recordingBlob) {
        const file = new File([recordingBlob], `${responseType}-${Date.now()}.webm`, { type: recordingBlob.type });
        const fileUrl = await uploadFile(file, project.id);
        await submitResponse(project.id, stakeholder.id, questionId, {
          response_type: responseType, file_url: fileUrl, file_name: file.name, file_size: file.size, duration_seconds: recordingDuration
        }, session.id);
        savedAny = true;
        discardRecording();
      } else if (responseType === 'file' && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileUrl = await uploadFile(file, project.id);
          await submitResponse(project.id, stakeholder.id, questionId, {
            response_type: 'file', file_url: fileUrl, file_name: file.name, file_size: file.size
          }, session.id);
        }
        savedAny = true;
        setUploadedFiles([]);
      }
      if (savedAny) {
        await loadQuestions(project.id, stakeholder.id, session.id);
        await loadSession();
        // Move to next question
        const currentIndex = questions.findIndex(q => q.id === questionId);
        if (currentIndex < questions.length - 1) {
          const nextQuestion = questions[currentIndex + 1];
          setCurrentQuestionId(nextQuestion.id);
          setTimeout(() => scrollToQuestion(nextQuestion.id), 300);
        }
      }
    } catch (error) {
      alert('Failed to save response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completeInterview = async () => {
    if (!session) return;
    try {
      await supabase.from('interview_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', session.id);
      await loadSession();
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const primaryColor = projectBranding.primary_color || '#3B82F6';
  const secondaryColor = projectBranding.secondary_color || '#10B981';
  const textColor = projectBranding.text_color || '#FFFFFF';

  const completedQuestions = Object.keys(responses).filter(qId => responses[qId].length > 0).length;
  const progress = questions.length > 0 ? Math.round((completedQuestions / questions.length) * 100) : 0;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Fixed Header with Progress */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {projectBranding.logo_url && (
              <img src={projectBranding.logo_url} alt="Logo" className="h-10 object-contain" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{completedQuestions} of {questions.length} answered</span>
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: primaryColor }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Card */}
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
              {!hasStarted && (
                <Button onClick={scrollToQuestions} className="w-full" size="lg" style={{ backgroundColor: primaryColor, color: textColor }}>
                  Begin Interview <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {!introVideo && !hasStarted && (
          <div className="text-center py-8">
            <Button onClick={scrollToQuestions} size="lg" style={{ backgroundColor: primaryColor, color: textColor }}>
              Begin Interview <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}

        {/* Questions Section */}
        <div ref={questionsRef} className="space-y-6">
          {hasStarted && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Questions</h2>
                <p className="text-gray-600">Answer one question at a time</p>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => {
                  const questionResponses = responses[question.id] || [];
                  const isActive = currentQuestionId === question.id;
                  const isAnswered = questionResponses.length > 0;

                  // Only show current question or answered questions
                  if (!isActive && !isAnswered) return null;

                  return (
                <Card
                  key={question.id}
                  id={`question-${question.id}`}
                  className={`transition-all duration-300 cursor-pointer hover:shadow-lg ${isActive ? 'ring-2 ring-offset-2 shadow-2xl' : ''}`}
                  style={isActive ? { ringColor: primaryColor } : {}}
                  onClick={() => { setCurrentQuestionId(question.id); scrollToQuestion(question.id); }}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg transition-all duration-300 ${isAnswered ? 'scale-110' : ''}`} style={{ backgroundColor: isAnswered ? primaryColor : '#E5E7EB', color: isAnswered ? textColor : '#6B7280' }}>
                        {isAnswered ? <Check className="h-6 w-6" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="info" size="sm">{question.category}</Badge>
                          {isAnswered && <Badge variant="success" size="sm"><CheckCircle className="h-3 w-3 mr-1" />Answered</Badge>}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">{question.text}</h3>

                        {isActive && (
                          <div className="mt-6 space-y-6 animate-fadeIn">
                            {/* Response Type Selector */}
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { type: 'text', icon: FileText, label: 'Text' },
                                { type: 'audio', icon: Mic, label: 'Audio' },
                                { type: 'video', icon: Video, label: 'Video' },
                                { type: 'file', icon: Upload, label: 'File' }
                              ].map(({ type, icon: Icon, label }) => (
                                <button
                                  key={type}
                                  onClick={(e) => { e.stopPropagation(); setResponseType(type as any); }}
                                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${responseType === type ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                  <Icon className={`h-6 w-6 mx-auto mb-2 ${responseType === type ? 'text-blue-600' : 'text-gray-400'}`} />
                                  <p className={`text-xs font-medium ${responseType === type ? 'text-blue-700' : 'text-gray-600'}`}>{label}</p>
                                </button>
                              ))}
                            </div>

                            {/* Response Input */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {responseType === 'text' && (
                                <textarea
                                  value={textResponse}
                                  onChange={(e) => setTextResponse(e.target.value)}
                                  placeholder="Share your thoughts here..."
                                  className="w-full h-48 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none text-base transition-all"
                                  style={{ fontSize: '16px' }}
                                />
                              )}

                              {(responseType === 'audio' || responseType === 'video') && (
                                <div className="space-y-4">
                                  {!recordingBlob ? (
                                    isRecording ? (
                                      <div className="text-center py-12 bg-red-50 rounded-xl">
                                        <div className="w-24 h-24 mx-auto mb-4 relative">
                                          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                                          <div className="absolute inset-0 rounded-full bg-red-500 flex items-center justify-center">
                                            <Square className="h-10 w-10 text-white" />
                                          </div>
                                        </div>
                                        <p className="text-3xl font-mono font-bold text-gray-900 mb-2">{formatDuration(recordingDuration)}</p>
                                        <p className="text-gray-600 mb-8">Recording in progress...</p>
                                        <Button onClick={(e) => { e.stopPropagation(); stopRecording(); }} variant="danger" size="lg">
                                          <Square className="h-5 w-5 mr-2" />Stop Recording
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="text-center py-12">
                                        <Button onClick={(e) => { e.stopPropagation(); startRecording(responseType); }} size="lg" style={{ backgroundColor: primaryColor, color: textColor }}>
                                          {responseType === 'video' ? <Video className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                                          Start {responseType === 'video' ? 'Video' : 'Audio'} Recording
                                        </Button>
                                      </div>
                                    )
                                  ) : (
                                    <div className="bg-green-50 rounded-xl p-8 text-center">
                                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                                      <p className="text-xl font-semibold text-gray-900 mb-2">Recording Complete!</p>
                                      <p className="text-gray-600 mb-6">Duration: {formatDuration(recordingDuration)}</p>
                                      <Button onClick={(e) => { e.stopPropagation(); discardRecording(); }} variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4 mr-2" />Discard & Re-record
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {responseType === 'file' && (
                                <div className="space-y-4">
                                  <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
                                  <Button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} variant="outline" className="w-full" disabled={uploadedFiles.length >= 3}>
                                    <Upload className="h-5 w-5 mr-2" />Choose Files (Max 3)
                                  </Button>
                                  {uploadedFiles.length > 0 && (
                                    <div className="space-y-2">
                                      {uploadedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                                          <button onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }} className="ml-2 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Save Button */}
                            <Button
                              onClick={(e) => { e.stopPropagation(); saveResponse(question.id); }}
                              disabled={saving || (responseType === 'text' && !textResponse.trim()) || ((responseType === 'audio' || responseType === 'video') && !recordingBlob) || (responseType === 'file' && uploadedFiles.length === 0)}
                              className="w-full"
                              size="lg"
                              style={{ backgroundColor: primaryColor, color: textColor }}
                            >
                              {saving ? (
                                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />Saving...</>
                              ) : (
                                <><CheckCircle className="h-5 w-5 mr-2" />Save & Continue</>
                              )}
                            </Button>

                            {questionResponses.length > 0 && (
                              <div className="pt-4 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-3">Previous Responses ({questionResponses.length})</p>
                                <div className="space-y-2">
                                  {questionResponses.map((resp, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                                      <Badge variant="success" size="sm" className="mb-2">{resp.response_type}</Badge>
                                      {resp.response_text && <p className="text-gray-700">{resp.response_text}</p>}
                                      {resp.file_name && <p className="text-gray-600">{resp.file_name}</p>}
                                      {resp.created_at && <p className="text-xs text-gray-500 mt-2">{new Date(resp.created_at).toLocaleString()}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Complete Section */}
        {progress === 100 && session.status !== 'completed' && (
          <Card className="text-center p-12 bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-2xl">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Congratulations!</h3>
            <p className="text-lg text-gray-600 mb-8">You've answered all questions. Ready to submit?</p>
            <Button onClick={completeInterview} size="lg" className="bg-green-600 hover:bg-green-700 text-white px-12">
              Complete Interview
            </Button>
          </Card>
        )}

        {session.status === 'completed' && (
          <Card className="text-center p-12 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-2xl">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Interview Completed!</h3>
            <p className="text-lg text-gray-600">Thank you for your valuable insights.</p>
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
