import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnswerQuestionsModal } from '../components/interviews/AnswerQuestionsModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Lock, MessageSquare, CheckCircle, User, Calendar, Clock, XCircle, AlertCircle, Ban, Video, Play, ChevronRight, Sparkles, Shield } from 'lucide-react';
import Hls from 'hls.js';

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

export const InterviewPage: React.FC = () => {
  // Use React Router's useParams to get URL parameters
  const { sessionToken: tokenFromParams, projectId: projectIdFromParams, stakeholderId: stakeholderIdFromParams } = useParams<{
    sessionToken?: string;
    projectId?: string;
    stakeholderId?: string;
  }>();

  console.log('🔍 InterviewPage Loading...');
  console.log('📍 URL:', window.location.href);
  console.log('📍 Hostname:', window.location.hostname);
  console.log('📍 Pathname:', window.location.pathname);
  console.log('🔑 Token from params:', tokenFromParams);
  console.log('📋 Project/Stakeholder from params:', { projectIdFromParams, stakeholderIdFromParams });

  const [searchParams] = useSearchParams();
  const passwordFromUrl = searchParams.get('pwd');
  const projectIdFromQuery = searchParams.get('project');
  const stakeholderIdFromQuery = searchParams.get('stakeholder');

  // Determine session token and identifiers
  const sessionToken = tokenFromParams || null;
  const projectId = projectIdFromParams || projectIdFromQuery;
  const stakeholderId = stakeholderIdFromParams || stakeholderIdFromQuery;

  console.log('🎫 Final session token:', sessionToken);
  console.log('🔐 Password from URL:', passwordFromUrl);
  console.log('📋 Final identifiers:', { projectId, stakeholderId });

  const [session, setSession] = useState<any>(null);
  const [stakeholder, setStakeholder] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState(passwordFromUrl || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [autoAuthAttempted, setAutoAuthAttempted] = useState(false);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [projectBranding, setProjectBranding] = useState<{
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    text_color?: string;
  }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Add SEO protection meta tags for interview pages (must be at top before any conditional returns)
  useEffect(() => {
    const robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    robotsMeta.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
    document.head.appendChild(robotsMeta);

    const googlebotMeta = document.createElement('meta');
    googlebotMeta.name = 'googlebot';
    googlebotMeta.content = 'noindex, nofollow';
    document.head.appendChild(googlebotMeta);

    const xRobotsMeta = document.createElement('meta');
    xRobotsMeta.httpEquiv = 'X-Robots-Tag';
    xRobotsMeta.content = 'noindex, nofollow';
    document.head.appendChild(xRobotsMeta);

    return () => {
      document.head.removeChild(robotsMeta);
      document.head.removeChild(googlebotMeta);
      document.head.removeChild(xRobotsMeta);
    };
  }, []);

  useEffect(() => {
    console.log('🔍 Auto-auth check:', {
      passwordFromUrl: !!passwordFromUrl,
      stakeholder: !!stakeholder,
      session: !!session,
      authenticated,
      autoAuthAttempted,
      sessionState
    });

    // Auto-authenticate if password is in URL
    if (passwordFromUrl && stakeholder && session && !authenticated && !autoAuthAttempted && sessionState === 'active') {
      console.log('🔓 Auto-authenticating with URL password...');
      setAutoAuthAttempted(true);
      handleAuthentication(passwordFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordFromUrl, stakeholder, session, authenticated, autoAuthAttempted, sessionState]);

  const loadSession = useCallback(async () => {
    console.log('🚀 loadSession called');
    setLoading(true);
    setError(null);

    try {
      console.log(sessionToken);
      // Load using the newer /interview/{projectId}/{stakeholderId} format
      if (projectId && stakeholderId) {
        console.log('🔍 Loading using project/stakeholder IDs:', { projectId, stakeholderId });

        // Get or create session for this project/stakeholder combination
        const { data: existingSession, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('project_id', projectId)
          .eq('stakeholder_id', stakeholderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let sessionData = existingSession;

        // If no session exists, create one
        if (!existingSession && !sessionError) {
          console.log('📝 No session found, creating new session...');
          const { data: newSession, error: createError } = await supabase
            .from('interview_sessions')
            .insert({
              project_id: projectId,
              stakeholder_id: stakeholderId,
              status: 'pending'
            })
            .select()
            .single();

          if (createError || !newSession) {
            console.error('❌ Create session error:', createError);
            setError('Failed to create interview session.');
            setSessionState('not_found');
            setLoading(false);
            return;
          }

          sessionData = newSession;
          console.log('✅ New session created:', sessionData);
        }

        // Check session state
        const state = checkSessionState(sessionData);
        setSessionState(state);
        setSession(sessionData);

        // Get project data with branding
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();

        if (projectError || !projectData) {
          console.error('❌ Project error:', projectError);
          setError('Project not found.');
          setSessionState('not_found');
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Set project branding
        setProjectBranding({
          logo_url: projectData.brand_logo_url || undefined,
          primary_color: projectData.brand_primary_color || '#3B82F6',
          secondary_color: projectData.brand_secondary_color || '#10B981',
          text_color: projectData.brand_text_color || '#FFFFFF'
        });

        // Load intro video if available using priority system (session > stakeholder > project)
        if (sessionData?.id) {
          console.log('🎬 Loading intro video for session:', sessionData.id);
          const { data: videoData, error: videoError } = await supabase
            .rpc('get_intro_video_for_session', { session_id: sessionData.id });

          console.log('🎬 Intro video result:', {
            success: !videoError,
            videoCount: videoData?.length || 0,
            video: videoData?.[0],
            error: videoError
          });

          if (videoError) {
            console.error('❌ Error loading intro video:', videoError);
          }

          if (!videoError && videoData && videoData.length > 0) {
            console.log('✅ Setting intro video:', videoData[0]);
            setIntroVideo(videoData[0]);
          } else {
            console.log('ℹ️ No intro video found for this session');
          }
        }

      } else if (sessionToken) {
        // Handle original /interview/{sessionToken} format
        console.log('🔍 Loading interview session:', sessionToken);

        // First get the session
        const { data: sessionData, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('session_token', sessionToken)
          .maybeSingle();

        console.log('📊 Session data:', sessionData);
        console.log('📊 Session error:', sessionError);

        if (sessionError || !sessionData) {
          console.error('❌ Session error:', sessionError);
          setError('Interview session not found.');
          setSessionState('not_found');
          setLoading(false);
          return;
        }

        console.log('✅ Session loaded:', sessionData);

        // Check session state
        const state = checkSessionState(sessionData);
        console.log('🔍 Session state:', state);
        setSessionState(state);
        setSession(sessionData);

        // Load project with branding
        console.log('🔍 Fetching project with ID:', sessionData.project_id);
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', sessionData.project_id)
          .maybeSingle();

        if (projectError || !projectData) {
          console.error('❌ Project error:', projectError);
          setError('Project not found.');
          setSessionState('not_found');
          setLoading(false);
          return;
        }

        console.log('✅ Project loaded:', projectData);
        setProject(projectData);

        // Set project branding
        setProjectBranding({
          logo_url: projectData.brand_logo_url || undefined,
          primary_color: projectData.brand_primary_color || '#3B82F6',
          secondary_color: projectData.brand_secondary_color || '#10B981',
          text_color: projectData.brand_text_color || '#FFFFFF'
        });

        // Load intro video if available
        if (sessionData?.id) {
          const { data: videoData, error: videoError } = await supabase
            .rpc('get_intro_video_for_session', { session_id: sessionData.id });

          if (!videoError && videoData && videoData.length > 0) {
            setIntroVideo(videoData[0]);
          }
        }

        // Then get the stakeholder
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', sessionData.stakeholder_id)
          .maybeSingle();

        if (stakeholderError || !stakeholderData) {
          console.error('❌ Stakeholder error:', stakeholderError);
          setError('Stakeholder not found.');
          setSessionState('not_found');
          setLoading(false);
          return;
        }

        console.log('✅ Stakeholder loaded:', stakeholderData);
        setStakeholder(stakeholderData);
      } else {
        console.error('❌ No session token or identifiers provided');
        setError('Invalid interview link.');
        setSessionState('not_found');
        setLoading(false);
        return;
      }

      console.log('✅ Session loaded successfully');
      setLoading(false);
    } catch (err) {
      console.error('❌ Load session error:', err);
      setError('Failed to load interview session.');
      setSessionState('not_found');
      setLoading(false);
    }
  }, [sessionToken, projectId, stakeholderId]);

  // Initialize HLS.js for Mux video playback
  useEffect(() => {
    if (!introVideo || !videoRef.current || !showIntroVideo) {
      console.log('⏭️ Skipping HLS init - missing video or ref or not showing');
      return;
    }

    const video = videoRef.current;
    const videoUrl = introVideo.mux_playback_id
      ? `https://stream.mux.com/${introVideo.mux_playback_id}.m3u8`
      : introVideo.video_url;

    console.log('🎬 Initializing video player:', {
      videoUrl,
      hasPlaybackId: !!introVideo.mux_playback_id,
      isHLS: videoUrl.includes('.m3u8'),
      hlsSupported: Hls.isSupported()
    });

    // If it's an HLS stream (.m3u8) and browser doesn't support HLS natively
    if (videoUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        // Clean up existing HLS instance
        if (hlsRef.current) {
          console.log('🧹 Cleaning up existing HLS instance');
          hlsRef.current.destroy();
        }

        // Initialize HLS.js
        console.log('🔧 Creating new HLS instance');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest loaded, ready to play');
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error, cannot recover');
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
        console.log('✅ HLS instance attached');
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('🍎 Using native HLS support (Safari)');
        video.src = videoUrl;
      } else {
        console.error('❌ No HLS support available');
      }
    } else {
      // Regular video file
      console.log('📹 Using regular video file');
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        console.log('🧹 Cleanup: destroying HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [introVideo, showIntroVideo]);

  const handleAuthentication = async (inputPassword: string) => {
    if (!stakeholder || !inputPassword || !session) return;

    // Don't allow authentication if session is not active
    if (sessionState !== 'active') {
      setError('This interview session is no longer available.');
      return;
    }

    console.log('🔐 Authenticating with password...');

    try {
      // Check if we've exceeded max attempts
      if (failedAttempts >= 5) {
        setError('Too many failed attempts. Please contact support.');
        setSessionState('locked');
        return;
      }

      // Verify password
      if (inputPassword === stakeholder.access_password) {
        console.log('✅ Authentication successful - setting authenticated to true');
        setAuthenticated(true);
        setError(null);
        setFailedAttempts(0);

        // Update session if it's still pending
        if (session.status === 'pending') {
          await supabase
            .from('interview_sessions')
            .update({ status: 'in_progress' })
            .eq('id', session.id);

          setSession((prev: any) => ({ ...prev, status: 'in_progress' }));
        }

        console.log('✅ Authentication state updated');
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setError(`Incorrect password. ${5 - newAttempts} attempts remaining.`);

        if (newAttempts >= 5) {
          setSessionState('locked');
        }
      }
    } catch (err) {
      console.error('❌ Authentication error:', err);
      setError('Authentication failed. Please try again.');
    }
  };

  // Hash IP for privacy
  const hashIp = async (ip: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Get client IP (in production, this would come from a header set by your proxy/CDN)
  const getClientIp = (): string => {
    // In a real implementation, you'd get this from headers like X-Forwarded-For
    // For now, we'll use a placeholder
    return 'client-ip-placeholder';
  };

  // Check session security state
  const checkSessionState = (sessionData: any): SessionState => {
    if (!sessionData) return 'not_found';

    // Check if locked
    if (sessionData.is_locked) return 'locked';

    // Check if closed (completed)
    if (sessionData.is_closed) return 'closed';

    // Check if expired
    const expiresAt = new Date(sessionData.expires_at);
    if (expiresAt < new Date()) return 'expired';

    return 'active';
  };

  // Record access attempt to session
  const recordAccess = useCallback(async (sessionId: string, success: boolean) => {
    try {
      const ip = getClientIp();
      const ipHash = await hashIp(ip);

      const { data, error } = await supabase.rpc('record_session_access', {
        p_session_token: sessionToken || '',
        p_ip_hash: ipHash,
        p_success: success
      });

      if (error) {
        console.error('Error recording access:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in recordAccess:', err);
      return null;
    }
  }, [sessionToken]);

  const markVideoAsWatched = useCallback(async () => {
    if (!videoWatched && session?.id && introVideo?.id) {
      setVideoWatched(true);
      // Could track this in the database if needed
      console.log('✅ Video watched');
    }
  }, [videoWatched, session, introVideo]);

  useEffect(() => {
    if (sessionToken || (projectId && stakeholderId)) {
      loadSession();
    } else {
      setError('Invalid interview link.');
      setSessionState('not_found');
      setLoading(false);
    }
  }, [sessionToken, projectId, stakeholderId, loadSession]);

  // Also load stakeholder separately if we have the ID from project/stakeholder route
  useEffect(() => {
    const loadStakeholder = async () => {
      if (stakeholderId && !stakeholder) {
        const { data, error } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', stakeholderId)
          .maybeSingle();

        if (!error && data) {
          setStakeholder(data);
        }
      }
    };

    loadStakeholder();
  }, [stakeholderId, stakeholder]);

  // Render error states based on session state (but only if we don't have a session - otherwise it's an auth error)
  if (sessionState === 'not_found' && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || 'The interview session you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <p className="text-sm text-gray-500">
            Please check your link or contact the project administrator.
          </p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600 mb-4">
            This interview session has expired and is no longer accepting responses.
          </p>
          {session?.expires_at && (
            <p className="text-sm text-gray-500">
              Expired on {new Date(session.expires_at).toLocaleDateString()}
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (sessionState === 'locked') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Locked</h2>
          <p className="text-gray-600 mb-4">
            This interview session has been locked due to too many failed authentication attempts.
          </p>
          <p className="text-sm text-gray-500">
            Please contact the project administrator to unlock your session.
          </p>
        </Card>
      </div>
    );
  }

  if (sessionState === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Complete</h2>
          <p className="text-gray-600 mb-4">
            Thank you for completing this interview. Your responses have been recorded.
          </p>
          <p className="text-sm text-gray-500">
            You can now close this window.
          </p>
        </Card>
      </div>
    );
  }

  // Show authentication form if not authenticated
  if (!authenticated && session && stakeholder) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: projectBranding.primary_color
            ? `linear-gradient(135deg, ${projectBranding.primary_color}15 0%, ${projectBranding.secondary_color}15 100%)`
            : 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)'
        }}
      >
        <Card className="max-w-md w-full shadow-2xl border-0">
          {/* Logo */}
          {projectBranding.logo_url && (
            <div className="flex justify-center mb-6">
              <img
                src={projectBranding.logo_url}
                alt="Project logo"
                className="h-20 object-contain"
              />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{
                backgroundColor: projectBranding.primary_color || '#3B82F6',
                color: projectBranding.text_color || '#FFFFFF'
              }}
            >
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Secure Interview Access
            </h1>
            <p className="text-gray-600">
              Welcome, <span className="font-semibold">{stakeholder.name}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {project.name}
            </p>
          </div>

          {/* Authentication Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAuthentication(password);
                  }
                }}
                placeholder="Enter your password"
                className="w-full"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              onClick={() => handleAuthentication(password)}
              disabled={!password}
              className="w-full"
              size="lg"
              style={{
                backgroundColor: projectBranding.primary_color || '#3B82F6',
                color: projectBranding.text_color || '#FFFFFF',
                borderColor: projectBranding.primary_color || '#3B82F6'
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Access Interview
            </Button>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-500">
                Need help? Contact your project administrator
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (loading || !session || !stakeholder || !project) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: projectBranding.primary_color
            ? `linear-gradient(135deg, ${projectBranding.primary_color}15 0%, ${projectBranding.secondary_color}15 100%)`
            : 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)'
        }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-4 shadow-lg"
            style={{
              borderColor: projectBranding.primary_color ? `${projectBranding.primary_color}30` : '#DBEAFE',
              borderTopColor: 'transparent'
            }}
          ></div>
          <p className="text-gray-600 font-medium">Loading your interview...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering main interview UI', {
    authenticated,
    hasSession: !!session,
    hasStakeholder: !!stakeholder,
    hasProject: !!project,
    sessionStatus: session?.status
  });

  const primaryColor = projectBranding.primary_color || '#3B82F6';
  const secondaryColor = projectBranding.secondary_color || '#10B981';
  const textColor = projectBranding.text_color || '#FFFFFF';

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header with Logo */}
        {projectBranding.logo_url && (
          <div className="flex justify-center mb-8 animate-fade-in">
            <img
              src={projectBranding.logo_url}
              alt="Project logo"
              className="h-16 object-contain"
            />
          </div>
        )}

        {/* Welcome Hero Section */}
        <Card className="mb-8 overflow-hidden shadow-xl border-0 animate-slide-up">
          <div
            className="p-8 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`
            }}
          >
            <div className="flex items-start gap-6 relative z-10">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{
                  backgroundColor: primaryColor,
                  color: textColor
                }}
              >
                <User className="h-10 w-10" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome, {stakeholder.name}!
                </h1>
                <p className="text-lg text-gray-700 mb-3">
                  {stakeholder.role} {stakeholder.department ? `• ${stakeholder.department}` : ''}
                </p>
                <p className="text-gray-600 mb-4">
                  Thank you for participating in the <span className="font-semibold">{project.name}</span> interview.
                  Your insights will help shape the future of this project.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Started {new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>~15-20 minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative element */}
            <div
              className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-20"
              style={{ backgroundColor: primaryColor }}
            ></div>
          </div>
        </Card>

        {/* Progress Card */}
        <Card className="mb-8 shadow-lg border-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Progress</h3>
                <p className="text-sm text-gray-600">
                  {session.answered_questions || 0} of {session.total_questions || 0} questions answered
                </p>
              </div>
              <div className="text-right">
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: primaryColor }}
                >
                  {session.completion_percentage || 0}%
                </div>
                <Badge
                  variant={session.status === 'completed' ? 'success' : 'info'}
                  className="text-xs"
                >
                  {session.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{
                  width: `${session.completion_percentage || 0}%`,
                  background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                }}
              >
                {session.completion_percentage > 10 && (
                  <div className="absolute inset-0 animate-pulse bg-white opacity-20"></div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Introduction Video */}
        {introVideo && !showQuestions && (
          <Card className="mb-8 shadow-lg border-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor
                  }}
                >
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{introVideo.title}</h3>
                  {introVideo.description && (
                    <p className="text-sm text-gray-600">{introVideo.description}</p>
                  )}
                </div>
              </div>

              {!showIntroVideo ? (
                <div
                  className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden group cursor-pointer shadow-lg"
                  onClick={() => setShowIntroVideo(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-300 backdrop-blur-sm"
                      style={{
                        backgroundColor: `${primaryColor}E6`,
                        color: textColor
                      }}
                    >
                      <Play className="h-12 w-12 ml-2" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <p className="text-white text-lg font-medium mb-1">Click to watch introduction</p>
                    <p className="text-white/80 text-sm">Learn more about this interview</p>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                  {introVideo.video_type === 'upload' ? (
                    <video
                      ref={videoRef}
                      key={introVideo.mux_playback_id || introVideo.video_url}
                      controls
                      preload="none"
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-contain"
                      onPlay={() => {
                        markVideoAsWatched();
                        const video = document.querySelector('video');
                        if (video) video.muted = false;
                      }}
                    />
                  ) : (
                    <iframe
                      src={introVideo.video_url}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* CTA Section */}
        {!showQuestions && (
          <Card className="shadow-xl border-0 overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div
              className="p-8 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}12 0%, ${secondaryColor}12 100%)`
              }}
            >
              <div className="relative z-10">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  style={{
                    backgroundColor: primaryColor,
                    color: textColor
                  }}
                >
                  <Sparkles className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Share Your Insights?</h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                  {introVideo && !videoWatched
                    ? 'Watch the introduction video above to learn more, then click the button below when you\'re ready to begin.'
                    : 'You can answer questions using text, audio, or video responses. Take your time and provide as much detail as you\'d like.'}
                </p>
                <Button
                  onClick={() => setShowQuestions(true)}
                  size="lg"
                  icon={ChevronRight}
                  className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{
                    backgroundColor: primaryColor,
                    color: textColor,
                    borderColor: primaryColor
                  }}
                >
                  Begin Interview
                </Button>
              </div>

              {/* Decorative elements */}
              <div
                className="absolute -left-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: primaryColor }}
              ></div>
              <div
                className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: secondaryColor }}
              ></div>
            </div>
          </Card>
        )}

        {/* Questions Modal */}
        {showQuestions && (
          <AnswerQuestionsModal
            session={session}
            onClose={() => setShowQuestions(false)}
            onComplete={async () => {
              await loadSession();
              setShowQuestions(false);
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};
