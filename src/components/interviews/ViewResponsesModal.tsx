import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { Download, Eye, FileText, Mic, Video, File } from 'lucide-react';

interface ViewResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  questionText: string;
  projectId: string;
}

interface Response {
  id: string;
  stakeholder_id: string;
  response_type: 'text' | 'audio' | 'video' | 'file';
  response_text?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  duration_seconds?: number;
  transcription?: string;
  ai_summary?: string;
  created_at: string;
  stakeholder: {
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

export const ViewResponsesModal: React.FC<ViewResponsesModalProps> = ({
  isOpen,
  onClose,
  questionId,
  questionText,
  projectId
}) => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && questionId) {
      loadResponses();
    }
  }, [isOpen, questionId]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('interview_responses')
        .select(`
          *,
          stakeholder:stakeholders(name, email, role, department)
        `)
        .eq('question_id', questionId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      console.error('Error loading responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResponseIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="h-5 w-5" />;
      case 'audio': return <Mic className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'file': return <File className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Responses"
      size="xl"
    >
      <div className="space-y-6">
        {/* Question */}
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-900">{questionText}</p>
        </Card>

        {/* Responses */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading responses...</p>
          </div>
        ) : responses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No responses yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {responses.map((response) => (
              <Card key={response.id}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                        {getResponseIcon(response.response_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{response.stakeholder.name}</p>
                        <p className="text-sm text-gray-500">{response.stakeholder.role} • {response.stakeholder.department}</p>
                      </div>
                    </div>
                    <Badge variant="info">{response.response_type}</Badge>
                  </div>

                  {/* Text Response */}
                  {response.response_text && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.response_text}</p>
                    </div>
                  )}

                  {/* File/Audio/Video Response */}
                  {response.file_url && (
                    <div className="space-y-2">
                      {response.response_type === 'audio' && (
                        <audio controls className="w-full">
                          <source src={response.file_url} />
                        </audio>
                      )}

                      {response.response_type === 'video' && (
                        <video controls className="w-full rounded-lg">
                          <source src={response.file_url} />
                        </video>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          {response.file_name && (
                            <span>📎 {response.file_name}</span>
                          )}
                          {response.file_size && (
                            <span>💾 {formatFileSize(response.file_size)}</span>
                          )}
                          {response.duration_seconds && (
                            <span>⏱️ {formatDuration(response.duration_seconds)}</span>
                          )}
                        </div>
                        <a
                          href={response.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Transcription */}
                  {response.transcription && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">TRANSCRIPTION</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.transcription}</p>
                    </div>
                  )}

                  {/* AI Summary */}
                  {response.ai_summary && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">AI SUMMARY</p>
                      <p className="text-sm text-gray-700">{response.ai_summary}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-xs text-gray-400">
                    Submitted {new Date(response.created_at).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
