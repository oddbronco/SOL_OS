import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, Image, Trash2, Download, Calendar, Tag } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileContentExtractor } from './FileContentExtractor';

interface ProjectUpload {
  id: string;
  project_id: string;
  upload_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  meeting_date?: string;
  include_in_generation: boolean;
  description?: string;
  created_at: string;
  extraction_status?: string;
  content_type?: string;
  word_count?: number;
  extraction_error?: string;
}

interface FilesTabProps {
  projectId: string;
}

export const FilesTab: React.FC<FilesTabProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<ProjectUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadForm, setUploadForm] = useState({
    upload_type: 'supplemental_doc',
    description: '',
    meeting_date: '',
    include_in_generation: true
  });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);

      // Validate file size (200MB limit)
      const maxSize = 200 * 1024 * 1024; // 200MB in bytes
      if (selectedFile.size > maxSize) {
        alert(
          `File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB). ` +
          `Maximum file size is 200MB. ` +
          `\n\nFor larger files, please:\n` +
          `1. Compress the video using HandBrake or similar tool\n` +
          `2. Use a lower quality/bitrate setting\n` +
          `3. Or split into smaller segments`
        );
        setUploading(false);
        return;
      }

      // Show progress for large files
      if (selectedFile.size > 25 * 1024 * 1024) {
        console.log(`📤 Uploading large file: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`);
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('project_uploads')
        .insert({
          project_id: projectId,
          upload_type: uploadForm.upload_type,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user.id,
          description: uploadForm.description,
          meeting_date: uploadForm.meeting_date || null,
          include_in_generation: uploadForm.include_in_generation
        })
        .select()
        .single();

      if (error) throw error;

      setUploads([data, ...uploads]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({
        upload_type: 'supplemental_doc',
        description: '',
        meeting_date: '',
        include_in_generation: true
      });

      // Auto-extract content if include_in_generation is true
      if (uploadForm.include_in_generation && data) {
        triggerAutoExtraction(data.id);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);

      let errorMessage = 'Failed to upload file';

      if (error.message) {
        errorMessage += ': ' + error.message;
      }

      // Provide helpful context for common errors
      if (error.message?.includes('size')) {
        errorMessage += '\n\nThe file may be too large. Maximum size is 200MB.';
      } else if (error.message?.includes('type') || error.message?.includes('mime')) {
        errorMessage += '\n\nThis file type may not be supported.';
      } else if (error.message?.includes('storage')) {
        errorMessage += '\n\nThere may be a storage configuration issue. Please contact support.';
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const triggerAutoExtraction = async (uploadId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('🔄 Auto-extracting content for uploaded file...');

      // Call extraction edge function in background
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-file-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadId }),
        }
      ).then(async (response) => {
        const result = await response.json();
        if (response.ok) {
          console.log('✅ Auto-extraction completed:', result);
          loadUploads(); // Refresh to show extracted content
        } else {
          console.warn('⚠️ Auto-extraction failed:', result.error);
        }
      }).catch(err => {
        console.warn('⚠️ Auto-extraction error:', err);
      });

    } catch (error) {
      console.warn('⚠️ Could not trigger auto-extraction:', error);
    }
  };

  const handleDelete = async (upload: ProjectUpload) => {
    if (!confirm(`Delete ${upload.file_name}?`)) return;

    try {
      await supabase.storage
        .from('project-files')
        .remove([upload.file_path]);

      const { error } = await supabase
        .from('project_uploads')
        .delete()
        .eq('id', upload.id);

      if (error) throw error;
      setUploads(uploads.filter(u => u.id !== upload.id));
    } catch (error) {
      console.error('Error deleting upload:', error);
    }
  };

  const toggleIncludeInGeneration = async (upload: ProjectUpload) => {
    try {
      const newValue = !upload.include_in_generation;

      const { error } = await supabase
        .from('project_uploads')
        .update({ include_in_generation: newValue })
        .eq('id', upload.id);

      if (error) throw error;
      setUploads(uploads.map(u =>
        u.id === upload.id ? { ...u, include_in_generation: newValue } : u
      ));

      // If toggling ON and content not yet extracted, auto-extract
      if (newValue && (!upload.extraction_status || upload.extraction_status === 'pending')) {
        triggerAutoExtraction(upload.id);
      }
    } catch (error) {
      console.error('Error updating upload:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    return File;
  };

  // Filter uploads based on search and type
  const filteredUploads = uploads.filter(upload => {
    const matchesSearch = searchTerm === '' ||
      upload.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || upload.upload_type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Get unique upload types
  const uploadTypes = Array.from(new Set(uploads.map(u => u.upload_type)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Files</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredUploads.length} of {uploads.length} file{uploads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button icon={Upload} onClick={() => setShowUploadModal(true)}>
          Upload File
        </Button>
      </div>

      {/* File Content Extraction */}
      <FileContentExtractor projectId={projectId} />

      {/* Search and Filter */}
      {uploads.length > 0 && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Search Files
              </label>
              <Input
                placeholder="Search by filename or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                File Type
              </label>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {uploadTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {(searchTerm || typeFilter !== 'all') && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">Loading files...</div>
      ) : uploads.length === 0 ? (
        <Card className="text-center py-12">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2 text-gray-900">No files yet</h3>
          <p className="mb-4 text-gray-600">Upload supplemental documents, transcripts, RFPs, and more</p>
          <Button onClick={() => setShowUploadModal(true)}>Upload First File</Button>
        </Card>
      ) : filteredUploads.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600">No files match your filters</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUploads.map((upload) => {
            const Icon = getFileIcon(upload.mime_type);
            return (
              <Card key={upload.id} className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{upload.file_name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <Badge variant="default" size="sm">
                        {upload.upload_type.replace('_', ' ')}
                      </Badge>
                      <span>{formatFileSize(upload.file_size)}</span>
                      {upload.meeting_date && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(upload.meeting_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {upload.description && (
                      <p className="text-sm text-gray-600 mt-1">{upload.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={upload.include_in_generation}
                      onChange={() => toggleIncludeInGeneration(upload)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Use in docs</span>
                  </label>
                  <button
                    onClick={() => handleDelete(upload)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload File"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full"
            />
            {selectedFile && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
                {selectedFile.size > 200 * 1024 * 1024 && (
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ File exceeds 200MB limit. Please compress before uploading.
                  </p>
                )}
                {selectedFile.size > 25 * 1024 * 1024 && selectedFile.size <= 200 * 1024 * 1024 && (
                  <p className="text-sm text-blue-600">
                    ℹ️ Large file - will use AssemblyAI for transcription if configured
                  </p>
                )}
              </div>
            )}
          </div>

          <Select
            label="File Type"
            value={uploadForm.upload_type}
            onChange={(e) => setUploadForm({ ...uploadForm, upload_type: e.target.value })}
            options={[
              { value: 'kickoff_transcript', label: 'Kickoff Transcript' },
              { value: 'supplemental_doc', label: 'Supplemental Document' },
              { value: 'rfp', label: 'RFP' },
              { value: 'org_chart', label: 'Org Chart' },
              { value: 'asset', label: 'Asset' },
              { value: 'notes', label: 'Notes' },
              { value: 'other', label: 'Other' }
            ]}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Optional description..."
            />
          </div>

          <Input
            label="Meeting Date (optional)"
            type="date"
            value={uploadForm.meeting_date}
            onChange={(e) => setUploadForm({ ...uploadForm, meeting_date: e.target.value })}
          />

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uploadForm.include_in_generation}
              onChange={(e) => setUploadForm({ ...uploadForm, include_in_generation: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Include in document generation</span>
          </label>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              loading={uploading}
            >
              Upload File
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
