import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Search, Lock, Unlock, RefreshCw, Clock, CheckCircle, Ban, ExternalLink, Calendar, AlertCircle } from 'lucide-react';

interface InterviewSession {
  id: string;
  session_token: string;
  project_id: string;
  stakeholder_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  last_accessed_at?: string;
  access_count: number;
  failed_attempts: number;
  is_locked: boolean;
  locked_at?: string;
  is_closed: boolean;
  closed_at?: string;
  stakeholder: {
    name: string;
    email: string;
  };
  project: {
    name: string;
  };
}

export const InterviewSessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'locked' | 'closed'>('all');
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(30);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, filterStatus]);

  const loadSessions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('interview_sessions')
        .select(`
          *,
          stakeholder:stakeholders(name, email),
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(session =>
        session.stakeholder?.name.toLowerCase().includes(search) ||
        session.stakeholder?.email.toLowerCase().includes(search) ||
        session.project?.name.toLowerCase().includes(search) ||
        session.session_token.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter(session => {
        switch (filterStatus) {
          case 'active':
            return !session.is_locked && !session.is_closed && new Date(session.expires_at) > now;
          case 'expired':
            return !session.is_closed && new Date(session.expires_at) <= now;
          case 'locked':
            return session.is_locked;
          case 'closed':
            return session.is_closed;
          default:
            return true;
        }
      });
    }

    setFilteredSessions(filtered);
  };

  const getSessionState = (session: InterviewSession): 'active' | 'expired' | 'locked' | 'closed' => {
    if (session.is_locked) return 'locked';
    if (session.is_closed) return 'closed';
    if (new Date(session.expires_at) <= new Date()) return 'expired';
    return 'active';
  };

  const unlockSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('interview_sessions')
        .update({
          is_locked: false,
          locked_at: null,
          failed_attempts: 0
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      alert('Session unlocked successfully');
    } catch (err) {
      console.error('Error unlocking session:', err);
      alert('Failed to unlock session');
    }
  };

  const extendSession = async (sessionId: string, days: number) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const newExpiration = new Date(session.expires_at);
      newExpiration.setDate(newExpiration.getDate() + days);

      const { error } = await supabase
        .from('interview_sessions')
        .update({
          expires_at: newExpiration.toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      setShowExtendModal(false);
      setSelectedSession(null);
      alert(`Session extended by ${days} days`);
    } catch (err) {
      console.error('Error extending session:', err);
      alert('Failed to extend session');
    }
  };

  const resetFailedAttempts = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('interview_sessions')
        .update({
          failed_attempts: 0,
          ip_access_log: []
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      alert('Failed attempts reset successfully');
    } catch (err) {
      console.error('Error resetting attempts:', err);
      alert('Failed to reset attempts');
    }
  };

  const reopenSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('interview_sessions')
        .update({
          is_closed: false,
          closed_at: null,
          status: 'in_progress'
        })
        .eq('id', sessionId);

      if (error) throw error;

      await loadSessions();
      alert('Session reopened successfully');
    } catch (err) {
      console.error('Error reopening session:', err);
      alert('Failed to reopen session');
    }
  };

  const getInterviewUrl = (session: InterviewSession): string => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5173'
      : 'https://interviews.solprojectos.com';
    return `${baseUrl}/i/${session.session_token}`;
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'success';
      case 'expired': return 'warning';
      case 'locked': return 'danger';
      case 'closed': return 'info';
      default: return 'default';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'active': return CheckCircle;
      case 'expired': return Clock;
      case 'locked': return Ban;
      case 'closed': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => getSessionState(s) === 'active').length,
    expired: sessions.filter(s => getSessionState(s) === 'expired').length,
    locked: sessions.filter(s => s.is_locked).length,
    closed: sessions.filter(s => s.is_closed).length
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading interview sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Session Security</h2>
        <p className="text-gray-600">
          Manage interview sessions, expiration dates, and security settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Sessions</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">{stats.active}</div>
            <div className="text-sm text-gray-600 mt-1">Active</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">{stats.expired}</div>
            <div className="text-sm text-gray-600 mt-1">Expired</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.locked}</div>
            <div className="text-sm text-gray-600 mt-1">Locked</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.closed}</div>
            <div className="text-sm text-gray-600 mt-1">Closed</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search by stakeholder, email, project, or token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'expired', 'locked', 'closed'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'primary' : 'secondary'}
                onClick={() => setFilterStatus(status)}
                size="sm"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Stakeholder</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Project</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">State</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Expires</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Access</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Failed</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No sessions found
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const state = getSessionState(session);
                  const StateIcon = getStateIcon(state);

                  return (
                    <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{session.stakeholder?.name}</div>
                          <div className="text-sm text-gray-500">{session.stakeholder?.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">{session.project?.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStateColor(state)}>
                          <StateIcon className="h-3 w-3 mr-1" />
                          {state}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          {new Date(session.expires_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.ceil((new Date(session.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">{session.access_count}</div>
                        {session.last_accessed_at && (
                          <div className="text-xs text-gray-500">
                            {new Date(session.last_accessed_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`text-sm font-medium ${session.failed_attempts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {session.failed_attempts}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={ExternalLink}
                            onClick={() => window.open(getInterviewUrl(session), '_blank')}
                          />

                          {session.is_locked && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Unlock}
                              onClick={() => unlockSession(session.id)}
                            />
                          )}

                          {session.is_closed && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={RefreshCw}
                              onClick={() => reopenSession(session.id)}
                            />
                          )}

                          {state === 'expired' && !session.is_closed && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Calendar}
                              onClick={() => {
                                setSelectedSession(session);
                                setShowExtendModal(true);
                              }}
                            />
                          )}

                          {session.failed_attempts > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={RefreshCw}
                              onClick={() => resetFailedAttempts(session.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Extend Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => {
          setShowExtendModal(false);
          setSelectedSession(null);
        }}
        title="Extend Session Expiration"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Extend the expiration date for <strong>{selectedSession?.stakeholder?.name}</strong>'s interview session.
          </p>

          <Input
            label="Extend by (days)"
            type="number"
            value={extendDays}
            onChange={(e) => setExtendDays(parseInt(e.target.value))}
            min={1}
            max={365}
          />

          {selectedSession && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">
                <div>Current expiration: <strong>{new Date(selectedSession.expires_at).toLocaleDateString()}</strong></div>
                <div>New expiration: <strong>{new Date(new Date(selectedSession.expires_at).getTime() + extendDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowExtendModal(false);
                setSelectedSession(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedSession && extendSession(selectedSession.id, extendDays)}
            >
              Extend Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
