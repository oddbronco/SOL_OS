import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnswerQuestionsModal } from '../components/interviews/AnswerQuestionsModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Lock, MessageSquare, CheckCircle, User, Calendar, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';

type SessionState = 'active' | 'expired' | 'locked' | 'closed' | 'not_found';

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

  useEffect(() => {
    if (sessionToken || (projectId && stakeholderId)) {
      loadSession();
    } else {
      // No valid interview identifier found
      setLoading(false);
      setError('Invalid interview link. Please check your URL.');
      setSessionState('not_found');
    }
  }, [sessionToken, projectId, stakeholderId, loadSession]);

  // Hash IP address for privacy-compliant tracking
  const hashIp = async (ip: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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

  const loadSession = useCallback(async () => {
    console.log('🚀 loadSession called');
    try {
      setLoading(true);

      if (projectId && stakeholderId) {
        // Handle /interview?project=X&stakeholder=Y format OR /{projectId}/{stakeholderId} format
        console.log('🔍 Loading stakeholder interview:', projectId, stakeholderId);

        // Get stakeholder data first
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', stakeholderId)
          .eq('project_id', projectId)
          .single();

        if (stakeholderError) {
          console.error('❌ Stakeholder error:', stakeholderError);
          setError('Interview not found. Please check your link.');
          return;
        }

        setStakeholder(stakeholderData);

        // Get or create interview session
        let { data: sessionData, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('stakeholder_id', stakeholderId)
          .eq('project_id', projectId)
          .single();

        if (sessionError && sessionError.code === 'PGRST116') {
          // Create new session if none exists
          const { data: newSession, error: createError } = await supabase
            .from('interview_sessions')
            .insert({
              project_id: projectId,
              stakeholder_id: stakeholderId,
              status: 'pending'
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Create session error:', createError);
            setError('Failed to create interview session.');
            return;
          }

          sessionData = newSession;
        } else if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Interview session not found.');
          return;
        }

        // Check session state
        const state = checkSessionState(sessionData);
        setSessionState(state);
        setSession(sessionData);

        // Get project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) {
          console.error('❌ Project error:', projectError);
          setError('Project not found.');
          return;
        }

        setProject(projectData);
        
      } else if (sessionToken) {
        // Handle original /interview/{sessionToken} format
        console.log('🔍 Loading interview session:', sessionToken);

        // First get the session
        const { data: sessionData, error: sessionError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('session_token', sessionToken)
          .single();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Interview session not found. Please check your link.');
          return;
        }

        // Check session state
        const state = checkSessionState(sessionData);
        setSessionState(state);
        console.log('✅ Session loaded:', sessionData);
        console.log('🔍 Session state:', state);
        setSession(sessionData);

        // Get stakeholder data
        const { data: stakeholderData, error: stakeholderError } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('id', sessionData.stakeholder_id)
          .single();

        if (stakeholderError) {
          console.error('❌ Stakeholder error:', stakeholderError);
          setError('Stakeholder not found.');
          return;
        }

        console.log('✅ Stakeholder loaded:', stakeholderData);
        setStakeholder(stakeholderData);

        // Get project data
        console.log('🔍 Fetching project with ID:', sessionData.project_id);
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', sessionData.project_id)
          .single();

        if (projectError) {
          console.error('❌ Project error:', projectError);
          setError('Project not found.');
          setLoading(false);
          return;
        }

        console.log('✅ Project loaded:', projectData);
        setProject(projectData);
      } else {
        setError('Invalid interview link.');
        setSessionState('not_found');
        return;
      }

      console.log('✅ Session loaded successfully');
    } catch (err) {
      console.error('💥 Error loading session:', err);
      setError('Failed to load interview session.');
      setSessionState('not_found');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, projectId, stakeholderId]);

  const handleAuthentication = useCallback(async (inputPassword: string) => {
    if (!stakeholder || !inputPassword || !session) return;

    // Don't allow authentication if session is not active
    if (sessionState !== 'active') {
      return;
    }

    try {
      console.log('🔐 Authenticating with password...');

      if (inputPassword === stakeholder.interview_password) {
        // Record successful access
        const accessResult = await recordAccess(session.id, true);

        // Check for rate limiting
        if (accessResult && accessResult.rate_limited) {
          setError('Too many attempts. Please wait before trying again.');
          return;
        }

        console.log('✅ Authentication successful - setting authenticated to true');
        setAuthenticated(true);
        setError(null);
        setFailedAttempts(0);
        console.log('✅ Authentication state updated');

        // Update session status to in_progress if it's pending
        if (session?.status === 'pending') {
          await supabase
            .from('interview_sessions')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString()
            })
            .eq('id', session.id);
        }
      } else {
        // Record failed access
        const accessResult = await recordAccess(session.id, false);

        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        // Check if locked
        if (accessResult && accessResult.locked) {
          setSessionState('locked');
          setError('Account locked due to too many failed attempts. Please contact the project team.');
        } else if (accessResult && accessResult.rate_limited) {
          setError('Too many attempts. Please wait before trying again.');
        } else {
          const remainingAttempts = 5 - newFailedAttempts;
          setError(`Invalid password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before lockout.`);
        }

        console.log('❌ Authentication failed');
      }
    } catch (err) {
      console.error('💥 Authentication error:', err);
      setError('Authentication failed. Please try again.');
    }
  }, [stakeholder, session, sessionState, failedAttempts, recordAccess]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthentication(password);
  };

  const handleInterviewComplete = async () => {
    try {
      // Update session status to completed and close it
      await supabase
        .from('interview_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_percentage: 100,
          is_closed: true,
          closed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      // Update stakeholder status
      await supabase
        .from('stakeholders')
        .update({ status: 'completed' })
        .eq('id', stakeholder.id);

      setShowQuestions(false);
      setSessionState('closed');

      // Update local session state
      setSession({
        ...session,
        status: 'completed',
        is_closed: true,
        closed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  // Auto-authenticate if password is in URL (only runs once when data is ready)
  useEffect(() => {
    console.log('🔍 Auto-auth check:', {
      passwordFromUrl: !!passwordFromUrl,
      stakeholder: !!stakeholder,
      session: !!session,
      authenticated,
      autoAuthAttempted,
      sessionState,
      loading
    });

    if (passwordFromUrl && stakeholder && session && !authenticated && !autoAuthAttempted && sessionState === 'active' && !loading) {
      console.log('🔓 Auto-authenticating with URL password...');
      setAutoAuthAttempted(true);
      handleAuthentication(passwordFromUrl);
    }
  }, [passwordFromUrl, stakeholder, session, authenticated, autoAuthAttempted, sessionState, loading, handleAuthentication]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  // Show expired state
  if (sessionState === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Link Expired</h3>
            <p className="text-gray-600 mb-4">
              This interview was available until {session?.expires_at ? new Date(session.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the expiration date'} and has now expired.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Interview links are valid for 30 days from creation for security purposes.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              If you still need to complete this interview, please contact the project team for a new link.
            </p>
            {project && (
              <p className="text-xs text-gray-400">
                Project: {project.name}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Show locked state
  if (sessionState === 'locked') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Locked</h3>
            <p className="text-gray-600 mb-4">
              This interview has been locked due to too many incorrect password attempts.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                For security purposes, this interview link has been temporarily disabled.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Please contact the project team to unlock this interview or request a new link.
            </p>
            {session?.locked_at && (
              <p className="text-xs text-gray-400">
                Locked on: {new Date(session.locked_at).toLocaleString()}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Show closed/completed state
  if (sessionState === 'closed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Completed</h3>
            <p className="text-gray-600 mb-4">
              Thank you for completing this interview. This link is no longer active.
            </p>
            <div className="bg-primary-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-primary-800">
                Your responses have been recorded and the project team has been notified.
              </p>
            </div>
            {session?.closed_at && (
              <p className="text-xs text-gray-500">
                Completed on: {new Date(session.closed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            {stakeholder && (
              <p className="text-xs text-gray-400 mt-2">
                Stakeholder: {stakeholder.name}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Show not found state
  if (sessionState === 'not_found' || (error && !session)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'This interview link is invalid or does not exist.'}</p>
            <p className="text-sm text-gray-500">
              Please check your link or contact the project team for a valid interview link.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <img
              src="https://cdn.prod.website-files.com/6793f087a090d6d2f4fc2822/68811a8d090b45917647017b_speak-lightmode.png"
              alt="SOL Project OS"
              className="h-12 w-auto mx-auto mb-4"
            />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Stakeholder Interview
            </h3>
            <p className="text-gray-600">
              {project?.name}
            </p>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </Card>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Interview Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your interview password"
              required
            />
            
            <Button type="submit" className="w-full">
              Access Interview
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Don't have a password? Contact the project team.
            </p>
            {session?.expires_at && (
              <p className="text-xs text-gray-400">
                This link expires on {new Date(session.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Add SEO protection meta tags for interview pages
  React.useEffect(() => {
    // Add robots meta tag to prevent indexing
    const robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    robotsMeta.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
    document.head.appendChild(robotsMeta);

    const googlebotMeta = document.createElement('meta');
    googlebotMeta.name = 'googlebot';
    googlebotMeta.content = 'noindex, nofollow';
    document.head.appendChild(googlebotMeta);

    // Add X-Robots-Tag header via meta
    const xRobotsMeta = document.createElement('meta');
    xRobotsMeta.httpEquiv = 'X-Robots-Tag';
    xRobotsMeta.content = 'noindex, nofollow';
    document.head.appendChild(xRobotsMeta);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(robotsMeta);
      document.head.removeChild(googlebotMeta);
      document.head.removeChild(xRobotsMeta);
    };
  }, []);

  // Don't render the main UI until we have all required data
  if (!session || !stakeholder || !project) {
    console.log('⚠️ Missing data, not rendering UI:', {
      hasSession: !!session,
      hasStakeholder: !!stakeholder,
      hasProject: !!project,
      authenticated,
      loading
    });
    console.log('📊 Data values:', { session, stakeholder, project });

    // Show loading if not authenticated yet and still loading
    if (!authenticated && loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading interview...</p>
          </div>
        </div>
      );
    }

    // If authenticated but missing data, show error
    if (authenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Error</h3>
              <p className="text-gray-600 mb-4">
                Unable to load interview data. Please refresh the page or contact support.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    // Show loading spinner while data is being fetched
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">Stakeholder Interview</p>
            </div>
            <Badge variant="info">
              {session.status.replace('_', ' ')}
            </Badge>
          </div>
        </Card>

        {/* Stakeholder Info */}
        <Card className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Welcome, {stakeholder.name}!</h3>
              <p className="text-sm text-gray-600">{stakeholder.role} • {stakeholder.department}</p>
              <p className="text-xs text-gray-500">
                This interview will help us understand your perspective on the project.
              </p>
            </div>
          </div>
        </Card>

        {/* Interview Progress */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Interview Progress</h4>
              <p className="text-sm text-gray-600">
                {session.answered_questions || 0} of {session.total_questions || 0} questions completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {session.completion_percentage || 0}%
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${session.completion_percentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Start Interview */}
        {!showQuestions ? (
          <Card className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Begin?</h3>
            <p className="text-gray-600 mb-6">
              You can answer questions using text, audio, or video responses. 
              The interview should take about 15-20 minutes to complete.
            </p>
            <Button
              onClick={() => setShowQuestions(true)}
              size="lg"
              icon={MessageSquare}
            >
              Start Interview
            </Button>
          </Card>
        ) : (
          <AnswerQuestionsModal
            isOpen={showQuestions}
            onClose={() => setShowQuestions(false)}
            stakeholder={stakeholder}
            project={project}
            session={session}
            onSuccess={handleInterviewComplete}
          />
        )}

        {/* Security Info Footer */}
        <Card className="bg-gray-50 border-gray-200 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <p>This is a secure, private interview link</p>
          </div>
          {session.expires_at && (
            <p className="text-xs text-gray-400 mt-1">
              Link expires: {new Date(session.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};