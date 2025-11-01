import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Phone, Mail, User, Calendar, MessageSquare, RefreshCw, Filter, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface SubscriptionRequest {
  id: string;
  user_id: string;
  request_type: 'upgrade' | 'downgrade' | 'cancel';
  current_plan: string;
  requested_plan?: string;
  reason?: string;
  contact_phone?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
    company_name: string;
  };
}

export const SubscriptionRequestManager: React.FC = () => {
  const { isDark } = useTheme();
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'approved' | 'rejected' | 'processed'>('approved');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading subscription requests...');
      
      // Get subscription requests with user data
      const { data: requestsData, error: requestsError } = await supabase
        .from('subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('❌ Requests error:', requestsError);
        throw requestsError;
      }

      // Get user data for each request
      const requestsWithUsers = await Promise.all(
        (requestsData || []).map(async (request) => {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('full_name, email, company_name')
              .eq('id', request.user_id)
              .single();

            if (userError) {
              console.warn('⚠️ User data not found for request:', request.id);
            }

            return {
              ...request,
              user: userData || {
                full_name: 'Unknown User',
                email: 'unknown@email.com',
                company_name: 'Unknown Company'
              }
            };
          } catch (error) {
            console.warn('⚠️ Error loading user for request:', request.id);
            return {
              ...request,
              user: {
                full_name: 'Unknown User',
                email: 'unknown@email.com',
                company_name: 'Unknown Company'
              }
            };
          }
        })
      );

      console.log('✅ Loaded requests:', requestsWithUsers.length);
      setRequests(requestsWithUsers);
    } catch (error) {
      console.error('💥 Failed to load requests:', error);
      // Don't show alert on load - just log the error
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      console.log('🔄 Processing request:', selectedRequest.id, 'Status:', newStatus);

      const { data: { user } } = await supabase.auth.getUser();

      // Update the subscription request status
      const { error: requestError } = await supabase
        .from('subscription_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (requestError) {
        console.error('❌ Error processing request:', requestError);
        throw requestError;
      }

      // If approved and it's an upgrade/downgrade, actually update the customer's plan
      if (newStatus === 'approved' && selectedRequest.requested_plan) {
        console.log('🔄 Updating customer subscription to:', selectedRequest.requested_plan);

        // Get the plan details from subscription_plans table
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_code', selectedRequest.requested_plan.toLowerCase())
          .single();

        if (planError) {
          console.error('❌ Error fetching plan details:', planError);
        } else {
          // Get the user's customer_id
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('customer_id')
            .eq('id', selectedRequest.user_id)
            .single();

          if (userError || !userData?.customer_id) {
            console.error('❌ Error fetching user customer_id:', userError);
          } else {
            // Update the customer's subscription
            const { error: customerError } = await supabase
              .from('customers')
              .update({
                subscription_plan: planData.plan_code,
                max_projects: planData.max_projects,
                max_stakeholders: planData.max_stakeholders_per_project,
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.customer_id);

            if (customerError) {
              console.error('❌ Error updating customer subscription:', customerError);
              throw new Error('Failed to update subscription plan. Request marked as approved but plan not changed.');
            } else {
              console.log('✅ Customer subscription updated successfully');
            }
          }
        }
      }

      console.log('✅ Request processed successfully');
      await loadRequests();
      setShowProcessModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      alert('Request processed successfully! The user\'s subscription has been updated.');
    } catch (error) {
      console.error('💥 Failed to process request:', error);
      alert(error instanceof Error ? error.message : 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'processed': return 'info';
      default: return 'default';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'upgrade': return 'success';
      case 'downgrade': return 'warning';
      case 'cancel': return 'error';
      default: return 'default';
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'pending') return request.status === 'pending';
    if (filter === 'completed') return ['approved', 'rejected', 'processed'].includes(request.status);
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedCount = requests.filter(r => ['approved', 'rejected', 'processed'].includes(r.status)).length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Stats and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-primary-600">{completedCount}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-blue-600">{requests.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </Card>
        </div>
        
        <div className="flex items-center space-x-3 flex-shrink-0">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Requests' },
              { value: 'pending', label: 'Pending Only' },
              { value: 'completed', label: 'Completed Only' }
            ]}
          />
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={loadRequests}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Requests List - Responsive Grid */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex items-start space-x-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  request.request_type === 'upgrade' ? 'bg-primary-100' :
                  request.request_type === 'cancel' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <User className={`h-6 w-6 ${
                    request.request_type === 'upgrade' ? 'text-primary-600' :
                    request.request_type === 'cancel' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {request.user?.full_name}
                    </h4>
                    <Badge variant={getRequestTypeColor(request.request_type)}>
                      {request.request_type.toUpperCase()}
                    </Badge>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className={`${isDark ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                          {request.user?.email}
                        </span>
                      </div>
                      {request.contact_phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                            {request.contact_phone}
                          </span>
                        </div>
                      )}
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Company:</strong> {request.user?.company_name}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                        <strong>Current:</strong> {request.current_plan}
                        {request.requested_plan && (
                          <span> → <strong>Requested:</strong> {request.requested_plan}</span>
                        )}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span>Submitted {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}</span>
                      </div>
                      {request.processed_at && (
                        <div className="flex items-center text-xs text-gray-500">
                          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>Processed {new Date(request.processed_at).toLocaleDateString()} at {new Date(request.processed_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {request.reason && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <strong>Reason:</strong>
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {request.reason}
                      </p>
                    </div>
                  )}

                  {request.admin_notes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-500">
                        <strong>Admin Notes:</strong>
                      </p>
                      <p className="text-sm text-blue-700">
                        {request.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 flex-shrink-0">
                {request.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setAdminNotes(request.admin_notes || '');
                      setShowProcessModal(true);
                    }}
                  >
                    Process
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  icon={MessageSquare}
                  onClick={() => {
                    setSelectedRequest(request);
                    setAdminNotes(request.admin_notes || '');
                    setShowProcessModal(true);
                  }}
                >
                  {request.admin_notes ? 'View Notes' : 'Add Notes'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <div className="text-center py-12">
          {filter === 'pending' ? (
            <Clock className={`h-12 w-12 mx-auto mb-4 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`} />
          ) : (
            <MessageSquare className={`h-12 w-12 mx-auto mb-4 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`} />
          )}
          <h4 className={`text-lg font-medium mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {filter === 'pending' ? 'No pending requests' : 'No requests found'}
          </h4>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            {filter === 'pending' ? 'All requests have been processed' : 'No requests match your filter'}
          </p>
        </div>
      )}

      {loading && requests.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading subscription requests...</p>
        </div>
      )}

      {/* Process Request Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setSelectedRequest(null);
          setAdminNotes('');
        }}
        title={`${selectedRequest?.request_type ? selectedRequest.request_type.charAt(0).toUpperCase() + selectedRequest.request_type.slice(1) : 'Process'} Request`}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Details */}
            <Card className={`${
              isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`font-medium mb-3 ${
                isDark ? 'text-blue-300' : 'text-blue-900'
              }`}>Request Details</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>User:</strong> {selectedRequest.user?.full_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.user?.email}</p>
                  <p><strong>Company:</strong> {selectedRequest.user?.company_name}</p>
                  <p><strong>Phone:</strong> {selectedRequest.contact_phone || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Current Plan:</strong> {selectedRequest.current_plan}</p>
                  {selectedRequest.requested_plan && (
                    <p><strong>Requested Plan:</strong> {selectedRequest.requested_plan}</p>
                  )}
                  <p><strong>Request Type:</strong> {selectedRequest.request_type}</p>
                  <p><strong>Submitted:</strong> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {selectedRequest.reason && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Reason:</p>
                  <p className={`text-sm p-3 rounded ${
                    isDark ? 'bg-blue-800/50' : 'bg-blue-100'
                  }`}>
                    {selectedRequest.reason}
                  </p>
                </div>
              )}
            </Card>

            {/* Processing Form */}
            {selectedRequest.status === 'pending' && (
              <>
                <Select
                  label="Action"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  options={[
                    { value: 'approved', label: 'Approve Request' },
                    { value: 'rejected', label: 'Reject Request' },
                    { value: 'processed', label: 'Mark as Processed' }
                  ]}
                />

                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Admin Notes
                  </label>
                  <textarea
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDark 
                        ? 'border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    style={{
                      backgroundColor: isDark ? '#2b2b2b' : '#f6f4ef'
                    }}
                    rows={4}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this request processing..."
                  />
                </div>
              </>
            )}

            {/* Existing Notes (Read-only) */}
            {selectedRequest.admin_notes && selectedRequest.status !== 'pending' && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-700">{selectedRequest.admin_notes}</p>
                {selectedRequest.processed_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Processed on {new Date(selectedRequest.processed_at).toLocaleString()}
                  </p>
                )}
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedRequest(null);
                  setAdminNotes('');
                }}
                disabled={loading}
              >
                Close
              </Button>
              
              {selectedRequest.status === 'pending' && (
                <Button
                  onClick={handleProcessRequest}
                  loading={loading}
                  icon={newStatus === 'approved' ? CheckCircle : newStatus === 'rejected' ? X : AlertCircle}
                >
                  {newStatus === 'approved' ? 'Approve' : 
                   newStatus === 'rejected' ? 'Reject' : 'Mark Processed'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};