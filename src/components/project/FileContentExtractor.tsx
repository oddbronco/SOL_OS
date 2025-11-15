import React, { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface FileContentExtractorProps {
  projectId: string;
}

interface Upload {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  extraction_status: string;
  content_type: string | null;
  word_count: number;
  extraction_error: string | null;
  extracted_content: string | null;
  created_at: string;
}

export const FileContentExtractor: React.FC<FileContentExtractorProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUploads();
  }, [projectId]);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_uploads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error loading uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractContent = async (uploadId: string) => {
    if (!user) return;

    try {
      setExtracting(prev => new Set(prev).add(uploadId));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-file-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Extraction failed');
      }

      console.log('✅ Extraction result:', result);
      await loadUploads();

    } catch (error: any) {
      console.error('Error extracting content:', error);
      alert(`Failed to extract content: ${error.message}`);
    } finally {
      setExtracting(prev => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  };

  const extractAll = async () => {
    const pendingUploads = uploads.filter(u =>
      u.extraction_status === 'pending' || u.extraction_status === 'failed'
    );

    for (const upload of pendingUploads) {
      await extractContent(upload.id);
    }
  };

  const getStatusBadge = (upload: Upload) => {
    switch (upload.extraction_status) {
      case 'completed':
        return <Badge variant="success">Extracted</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'not_applicable':
        return <Badge variant="default">Not Applicable</Badge>;
      default:
        return <Badge variant="default">{upload.extraction_status}</Badge>;
    }
  };

  const getContentTypeBadge = (contentType: string | null) => {
    if (!contentType) return null;

    const labels: Record<string, string> = {
      'text': 'Text',
      'video_transcript': 'Video Transcript',
      'audio_transcript': 'Audio Transcript',
      'image_ocr': 'OCR Text',
      'structured_data': 'JSON/CSV',
      'binary': 'Binary'
    };

    return <Badge size="sm" variant="info">{labels[contentType] || contentType}</Badge>;
  };

  const downloadContent = (upload: Upload) => {
    if (!upload.extracted_content) return;

    const blob = new Blob([upload.extracted_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${upload.file_name}-extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2">Loading files...</span>
        </div>
      </Card>
    );
  }

  const pendingCount = uploads.filter(u => u.extraction_status === 'pending').length;
  const completedCount = uploads.filter(u => u.extraction_status === 'completed').length;
  const totalWords = uploads.reduce((sum, u) => sum + (u.word_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">File Content Extraction</h3>
          <p className="text-sm text-gray-600 mt-1">
            Extract text from files for AI document generation
          </p>
        </div>
        {pendingCount > 0 && (
          <Button
            icon={RefreshCw}
            onClick={extractAll}
            disabled={extracting.size > 0}
          >
            Extract All Pending ({pendingCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Files</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{uploads.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Extracted</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{completedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Words</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalWords.toLocaleString()}</div>
        </Card>
      </div>

      {uploads.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No files uploaded yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {uploads.map(upload => (
            <Card key={upload.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{upload.file_name}</span>
                    {getStatusBadge(upload)}
                    {getContentTypeBadge(upload.content_type)}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{(upload.file_size / 1024).toFixed(2)} KB</span>
                    {upload.word_count > 0 && (
                      <span>{upload.word_count.toLocaleString()} words</span>
                    )}
                    <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                  </div>

                  {upload.extraction_error && (
                    <div className="mt-2 flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{upload.extraction_error}</span>
                    </div>
                  )}

                  {upload.extraction_status === 'completed' && upload.extracted_content && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2 text-green-600 font-medium mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Content extracted successfully</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Preview: {upload.extracted_content.substring(0, 150)}...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {upload.extraction_status === 'completed' && upload.extracted_content && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Download}
                      onClick={() => downloadContent(upload)}
                      title="Download extracted content"
                    >
                      Download
                    </Button>
                  )}

                  {(upload.extraction_status === 'pending' || upload.extraction_status === 'failed') && (
                    <Button
                      size="sm"
                      onClick={() => extractContent(upload.id)}
                      loading={extracting.has(upload.id)}
                      disabled={extracting.has(upload.id)}
                    >
                      {upload.extraction_status === 'failed' ? 'Retry' : 'Extract'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">How Content Extraction Works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Video/Audio files:</strong> Automatically transcribed using OpenAI Whisper with timestamps</li>
              <li><strong>Text files:</strong> Full content extracted and formatted for AI</li>
              <li><strong>JSON/CSV:</strong> Structured data parsed and made available</li>
              <li><strong>Document Generation:</strong> All extracted content is included in the {`{{uploads}}`} variable</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
