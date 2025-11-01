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
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
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
      const { error } = await supabase
        .from('project_uploads')
        .update({ include_in_generation: !upload.include_in_generation })
        .eq('id', upload.id);

      if (error) throw error;
      setUploads(uploads.map(u =>
        u.id === upload.id ? { ...u, include_in_generation: !u.include_in_generation } : u
      ));
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Files</h2>
          <p className="text-sm text-gray-600 mt-1">
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button icon={Upload} onClick={() => setShowUploadModal(true)}>
          Upload File
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading files...</div>
      ) : uploads.length === 0 ? (
        <Card className="text-center py-12">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2 text-gray-900">No files yet</h3>
          <p className="mb-4 text-gray-600">Upload supplemental documents, transcripts, RFPs, and more</p>
          <Button onClick={() => setShowUploadModal(true)}>Upload First File</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {uploads.map((upload) => {
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
              <p className="text-sm text-gray-600 mt-2">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
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
