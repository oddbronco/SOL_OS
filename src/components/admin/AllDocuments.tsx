import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Eye, Edit, Trash2, Calendar, User, Building2, FolderOpen } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

interface PlatformDocument {
  id: string;
  project_id: string;
  title: string;
  type: string;
  content: string;
  created_at: string;
  updated_at: string;
  project?: {
    name: string;
    client_id: string;
    user_id: string;
  };
  client_company?: string;
  project_owner?: string;
  word_count?: number;
}

export const AllDocuments: React.FC = () => {
  const { isDark } = useTheme();
  const [documents, setDocuments] = useState<PlatformDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PlatformDocument | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      console.log('📄 Loading all documents...');

      // Get documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('❌ Documents error:', documentsError);
        throw documentsError;
      }

      // Get project, client, and owner data for each document
      const documentsWithData = await Promise.all(
        (documentsData || []).map(async (document) => {
          let projectData = null;
          let clientData = null;
          let ownerData = null;

          try {
            // Get project data
            const { data: project } = await supabase
              .from('projects')
              .select('name, client_id, user_id')
              .eq('id', document.project_id)
              .single();

            if (project) {
              projectData = project;

              // Get client data
              const { data: client } = await supabase
                .from('clients')
                .select('name')
                .eq('id', project.client_id)
                .single();

              clientData = client;

              // Get project owner data
              const { data: owner } = await supabase
                .from('users')
                .select('full_name, email')
                .eq('id', project.user_id)
                .single();

              ownerData = owner;
            }
          } catch (error) {
            console.warn('⚠️ Could not load related data for document:', document.id);
          }

          return {
            ...document,
            project: projectData,
            client_company: clientData?.name || 'Unknown Company',
            project_owner: ownerData?.full_name || 'Unknown User',
            word_count: document.content ? document.content.split(' ').length : 0
          };
        })
      );

      setDocuments(documentsWithData);
      console.log('✅ Loaded documents:', documentsWithData.length);
    } catch (error) {
      console.error('💥 Failed to load documents:', error);
      // Don't show alert on load - just log the error
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (document: PlatformDocument) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const handleDownloadDocument = (document: PlatformDocument) => {
    const blob = new Blob([document.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setLoading(true);
      console.log('🗑️ Deleting document:', documentId);

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('❌ Delete document error:', error);
        throw error;
      }

      console.log('✅ Document deleted successfully');
      await loadDocuments();
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('💥 Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         document.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (document.client_company && document.client_company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (document.project?.name && document.project.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (document.project_owner && document.project_owner.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || document.type === typeFilter;
    const matchesCompany = companyFilter === 'all' || document.client_company === companyFilter;
    
    return matchesSearch && matchesType && matchesCompany;
  });

  const uniqueTypes = [...new Set(documents.map(d => d.type))].sort();
  const uniqueCompanies = [...new Set(documents.map(d => d.client_company))].sort();

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sprint0_summary': return 'info';
      case 'exec_summary': return 'success';
      case 'technical_scope': return 'warning';
      case 'implementation_plan': return 'error';
      default: return 'default';
    }
  };

  const totalDocuments = documents.length;
  const documentsThisMonth = documents.filter(d => 
    new Date(d.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;
  const totalWordCount = documents.reduce((sum, d) => sum + (d.word_count || 0), 0);

  return (
    <div className="space-y-6 max-w-full">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalDocuments}</div>
          <div className="text-sm text-gray-600">Total Documents</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">{documentsThisMonth}</div>
          <div className="text-sm text-gray-600">This Month</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-purple-600">{uniqueTypes.length}</div>
          <div className="text-sm text-gray-600">Document Types</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-orange-600">{totalWordCount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Words</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search documents..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                ...uniqueTypes.map(type => ({ value: type, label: type.replace('_', ' ') }))
              ]}
            />
            <Select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Companies' },
                ...uniqueCompanies.map(company => ({ value: company, label: company }))
              ]}
            />
            <Button variant="outline" icon={Filter} onClick={loadDocuments} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Documents Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDocuments.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {document.title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {document.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <Badge variant={getTypeColor(document.type)} size="sm">
                {document.type.replace('_', ' ')}
              </Badge>
            </div>

            <div className="space-y-2 mb-4 text-xs">
              <div className="flex items-center text-gray-600">
                <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{document.client_company}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FolderOpen className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{document.project?.name || 'Unknown Project'}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{document.project_owner}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
              </div>
              {document.word_count && (
                <div className="text-gray-500">
                  {document.word_count.toLocaleString()} words
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="flex space-x-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  icon={Eye}
                  onClick={() => handleViewDocument(document)}
                >
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  icon={Download}
                  onClick={() => handleDownloadDocument(document)}
                >
                  Download
                </Button>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                icon={Trash2}
                onClick={() => handleDeleteDocument(document.id)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className={`h-12 w-12 mx-auto mb-4 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <h4 className={`text-lg font-medium mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            No documents found
          </h4>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {loading && documents.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading documents...</p>
        </div>
      )}

      {/* View Document Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedDocument(null);
        }}
        title={selectedDocument?.title || 'Document'}
        size="xl"
      >
        {selectedDocument && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getTypeColor(selectedDocument.type)}>
                  {selectedDocument.type.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-gray-500">
                  {selectedDocument.client_company} • {selectedDocument.project?.name}
                </span>
                <span className="text-sm text-gray-500">
                  by {selectedDocument.project_owner}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Download}
                  onClick={() => handleDownloadDocument(selectedDocument)}
                >
                  Download
                </Button>
              </div>
            </div>
            
            <Card>
              <div className="bg-white rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans p-4">
                  {selectedDocument.content}
                </pre>
              </div>
            </Card>

            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>Created: {new Date(selectedDocument.created_at).toLocaleString()}</span>
              <span>Words: {selectedDocument.word_count?.toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};