import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { useSupabaseData } from './hooks/useSupabaseData';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { InterviewPage } from './pages/InterviewPage';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { QuestionCollections } from './pages/QuestionCollections';
import { DocumentTemplates } from './pages/DocumentTemplates';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Card } from './components/ui/Card';
import { Mail, Lock, Eye, EyeOff, MessageSquare } from 'lucide-react';

function App() {
  const { user, loading, signIn, signUp } = useAuth();
  const { metrics } = useSupabaseData();
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  
  // Check if we're on admin subdomain (production or development)
  const isAdminDomain = window.location.hostname === 'admin.withspeak.com' || 
                       (window.location.hostname === 'localhost' && window.location.port === '5173');
  
  // Check if we're on app subdomain (production or development)  
  const isAppDomain = window.location.hostname === 'app.withspeak.com' ||
                     (window.location.hostname === 'localhost' && window.location.port === '5173');
  
  // Interview pages are handled by React Router - see main.tsx for routes

  // Redirect non-admin users away from admin domain
  React.useEffect(() => {
    if (user && isAdminDomain && !user.isMasterAdmin && user.role !== 'master_admin') {
      if (window.location.hostname !== 'localhost') {
        window.location.href = 'https://app.withspeak.com';
      }
    }

    // Redirect admin users to admin domain when accessing app domain
    if (user && isAppDomain && (user.isMasterAdmin || user.role === 'master_admin')) {
      if (window.location.hostname !== 'localhost') {
        window.location.href = 'https://admin.withspeak.com';
      }
    }
  }, [user, isAdminDomain]);

  // Note: Interview pages are now handled by React Router in main.tsx
  // Routes: /i/:token, /interview/:token, /:projectId/:stakeholderId
  
  // Handle navigation - clear selected project when navigating away
  const handleNavigation = (path: string) => {
    setCurrentPath(path);
    setSelectedProject(null); // Clear selected project to return to main pages
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    companyName: '',
    fullName: '',
    accessCode: ''
  });

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        setResetSent(true);
      }
    } catch (error) {
      alert('Failed to send reset email. Please try again.');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Password updated successfully!');
        setShowPasswordReset(false);
        setShowForgotPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
      }
    } catch (error) {
      alert('Failed to update password. Please try again.');
    }
  };

  // Check for password reset token in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    
    if (type === 'recovery' && accessToken && refreshToken) {
      // Set the session with the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      setShowPasswordReset(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle auth operations with proper error handling
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        setAuthError(error);
      }
    } catch (err) {
      setAuthError('Sign in failed. Please try again.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      const { error } = await signUp(loginForm.email, loginForm.password, loginForm.companyName, loginForm.fullName, loginForm.accessCode);
      if (error) {
        setAuthError(error);
      }
    } catch (err) {
      setAuthError('Sign up failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#f6f4ef' }}>
        <div className="flex h-screen w-64 flex-col border-r border-gray-200" style={{ backgroundColor: '#f6f4ef' }}>
          <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4">
            <img
              src="https://cdn.prod.website-files.com/6793f087a090d6d2f4fc2822/68811a8d090b45917647017b_speak-lightmode.png"
              alt="Speak"
              className="h-16 w-auto max-w-full object-contain"
            />
          </div>
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i}>
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="h-16 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <main className="flex-1 p-6">
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded mb-2 animate-pulse"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center animated-gradient">
          <div className="max-w-md w-full mx-4">
            <Card className="shadow-xl">
              <div className="text-center mb-8">
                <img 
                  src="https://cdn.prod.website-files.com/6793f087a090d6d2f4fc2822/68811a8d090b45917647017b_speak-lightmode.png"
                  alt="Speak"
                  className="h-16 w-auto mx-auto mb-4"
                />
                <p className="text-gray-400 mt-2">
                  {isSignUp ? 'Turn complex projects into clear plans.' : 'Sign in to your account'}
                </p>
              </div>

              {showForgotPassword ? (
                <div className="space-y-6">
                  {resetSent ? (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
                      <p className="text-gray-600 mb-6">
                        We've sent a password reset link to {resetEmail}
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> If the email link doesn't work, you can also reset your password manually below.
                        </p>
                      </div>
                      <div className="space-y-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetSent(false);
                          setResetEmail('');
                        }}
                      >
                        Back to Sign In
                      </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Reset your password</h3>
                        <p className="text-gray-600">
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                      </div>
                      
                      <Input
                        label="Email Address"
                        type="email"
                        icon={Mail}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                      />
                      
                      <Button type="submit" className="w-full" size="lg">
                        Send Reset Link
                      </Button>
                      
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setResetEmail('');
                          }}
                          className="text-green-400 hover:text-green-300 font-medium"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : showPasswordReset ? (
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Set New Password</h3>
                    <p className="text-gray-600">
                      Enter your new password below.
                    </p>
                  </div>
                  
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      icon={Lock}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  <Input
                    label="Confirm New Password"
                    type="password"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  
                  <Button type="submit" className="w-full" size="lg">
                    Update Password
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setShowForgotPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-green-400 hover:text-green-300 font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
                  {authError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{authError}</p>
                    </div>
                  )}
                  
                  {isSignUp && (
                    <>
                      <Input
                        label="Access Code"
                        value={loginForm.accessCode}
                        onChange={(e) => setLoginForm({ ...loginForm, accessCode: e.target.value })}
                        placeholder="Enter your access code"
                        required
                      />
                      <Input
                        label="Company Name"
                        value={loginForm.companyName}
                        onChange={(e) => setLoginForm({ ...loginForm, companyName: e.target.value })}
                        placeholder="Your Company Name"
                        required
                      />
                      <Input
                        label="Full Name"
                        value={loginForm.fullName}
                        onChange={(e) => setLoginForm({ ...loginForm, fullName: e.target.value })}
                        placeholder="Your Full Name"
                        required
                      />
                    </>
                  )}
                  
                  <Input
                    label="Email Address"
                    type="email"
                    icon={Mail}
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="you@company.com"
                    required
                  />
                  
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      icon={Lock}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {!isSignUp && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-green-400 hover:text-green-300"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg">
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>
                </form>
              )}

              {!showForgotPassword && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-green-400 hover:text-green-300 font-medium"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const renderPage = () => {
    if (selectedProject) {
      return <ProjectDetail projectId={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    switch (currentPath) {
      case '/dashboard':
        return <Dashboard onSelectProject={setSelectedProject} onNavigate={handleNavigation} metrics={metrics} />;
      case '/clients':
        return <Clients />;
      case '/projects':
        return <Projects onSelectProject={setSelectedProject} />;
      case '/collections':
        return <QuestionCollections />;
      case '/templates':
        return <DocumentTemplates />;
      case '/settings':
        return <Settings />;
      case '/admin':
        // Only allow access to platform admin page for master admins
        if (!user.isMasterAdmin && user.role !== 'master_admin') {
          return <Dashboard onSelectProject={setSelectedProject} onNavigate={handleNavigation} metrics={metrics} />;
        }
        return <Admin />;
      default:
        return <Dashboard onSelectProject={setSelectedProject} onNavigate={setCurrentPath} metrics={metrics} />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{
      backgroundColor: '#f6f4ef'
    }}>
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigation}
        user={user}
        metrics={metrics}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
