import React, { useState } from 'react';
import { Plus, Search, FileText, Download, Eye, Sparkles, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Document } from '../types';
import { openAIService } from '../services/openai';
import { useTheme } from '../contexts/ThemeContext';

export const Documents: React.FC = () => {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [documentType, setDocumentType] = useState<Document['type']>('sprint0_summary');

  // Mock documents data with more realistic content
  const mockDocuments: Document[] = [
    {
      id: '1',
      customer_id: 'customer-1',
      client_company_id: 'client-1',
      project_id: '1',
      type: 'sprint0_summary',
      title: 'Sprint 0 Summary - E-commerce Platform',
      content_md: `# Sprint 0 Summary: E-commerce Platform Redesign

## Executive Summary
This document outlines the initial project scope and stakeholder requirements for the e-commerce platform redesign project.

## Key Stakeholders
- **Sarah Johnson** (Product Manager): Focused on user experience improvements
- **Michael Chen** (UX Designer): Responsible for design system modernization
- **Emily Rodriguez** (CTO): Technical architecture and constraints

## Primary Objectives
1. Increase conversion rate from 2.3% to 4%+
2. Reduce checkout abandonment by 40%
3. Improve mobile experience ratings
4. Implement personalization features

## Technical Requirements
- Legacy system integration required
- API rate limit: 1000 requests/minute
- Mobile-first responsive design
- Performance optimization for Core Web Vitals

## Next Steps
1. Detailed technical architecture review
2. User research and testing plan
3. Design system documentation
4. Development sprint planning`,
      format: 'markdown',
      version: 1,
      status: 'final',
      created_by: 'user-1',
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z'
    },
    {
      id: '2',
      customer_id: 'customer-1',
      client_company_id: 'client-1',
      project_id: '1',
      type: 'exec_summary',
      title: 'Executive Summary - E-commerce Platform',
      content_md: `# Executive Summary: E-commerce Platform Redesign

## Business Impact
The proposed e-commerce platform redesign will deliver significant business value through improved user experience and conversion optimization.

## Key Findings
- Current conversion rate of 2.3% is below industry average
- 67% of users abandon checkout process
- Mobile experience scores poorly in user testing
- Personalization features are completely missing

## Recommended Approach
1. **Phase 1**: Checkout optimization and mobile improvements
2. **Phase 2**: Personalization engine implementation
3. **Phase 3**: Advanced analytics and A/B testing framework

## Investment & ROI
- **Estimated Investment**: $75,000
- **Expected ROI**: 300% within 12 months
- **Break-even Point**: 4 months post-launch

## Success Metrics
- Conversion rate increase to 4%+
- Checkout abandonment reduction to 40%
- Mobile satisfaction score improvement to 4.5/5
- Revenue increase of $500K annually`,
      format: 'markdown',
      version: 2,
      status: 'approved',
      created_by: 'user-1',
      created_at: '2025-01-08T00:00:00Z',
      updated_at: '2025-01-09T00:00:00Z'
    },
    {
      id: '3',
      customer_id: 'customer-1',
      client_company_id: 'client-2',
      project_id: '2',
      type: 'technical_scope',
      title: 'Technical Scope - Mobile Banking App',
      content_md: `# Technical Scope: Mobile Banking Application

## Architecture Overview
The mobile banking application will be built using a microservices architecture with React Native for cross-platform compatibility.

## Technical Stack
- **Frontend**: React Native, TypeScript
- **Backend**: Node.js, Express, PostgreSQL
- **Security**: OAuth 2.0, JWT, biometric authentication
- **Infrastructure**: AWS, Docker, Kubernetes

## Security Requirements
- End-to-end encryption for all transactions
- Biometric authentication (fingerprint, face ID)
- Multi-factor authentication
- PCI DSS compliance
- SOC 2 Type II certification

## Integration Points
- Core banking system API
- Payment processing gateway
- Identity verification service
- Push notification service
- Analytics and monitoring

## Performance Requirements
- App launch time: < 2 seconds
- Transaction processing: < 5 seconds
- 99.9% uptime SLA
- Support for 10,000+ concurrent users

## Development Timeline
- **Phase 1**: Core banking features (8 weeks)
- **Phase 2**: Advanced features (6 weeks)
- **Phase 3**: Testing and deployment (4 weeks)`,
      format: 'markdown',
      version: 1,
      status: 'draft',
      created_by: 'user-2',
      created_at: '2025-01-07T00:00:00Z',
      updated_at: '2025-01-07T00:00:00Z'
    }
  ];

  const [documents, setDocuments] = useState(mockDocuments);

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const handleDownloadDocument = (document: Document) => {
    const blob = new Blob([document.content_md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }
  };

  const handleGenerateDocument = async () => {
    setLoading(true);
    try {
      const mockResponses = [
        {
          stakeholder: 'Sarah Johnson',
          role: 'Product Manager',
          question: 'What are your primary objectives for this project?',
          response: 'We need to increase conversion rates by 25% and improve the overall user experience. The current checkout process is too complex and users are dropping off.',
          summary: 'Focus on conversion optimization and UX improvements'
        },
        {
          stakeholder: 'Mike Chen',
          role: 'CTO',
          question: 'What technical constraints should we be aware of?',
          response: 'We have legacy systems that need to be integrated. The current API can handle about 1000 requests per minute. We need to ensure backward compatibility.',
          summary: 'Legacy system integration and API limitations'
        }
      ];

      const document = await openAIService.generateProjectDocument({
        projectName: 'E-commerce Platform Redesign',
        projectDescription: 'Complete overhaul of the existing e-commerce platform to improve user experience and increase conversions.',
        stakeholderResponses: mockResponses,
        documentType
      });

      setGeneratedDocument(document);
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = () => {
    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      agency_id: 'agency-1',
      client_company_id: 'client-1',
      project_id: '1',
      type: documentType,
      title: `${getTypeLabel(documentType)} - Generated Document`,
      content_md: generatedDocument,
      format: 'markdown',
      version: 1,
      status: 'draft',
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDocuments(prev => [newDocument, ...prev]);
    setShowGenerateModal(false);
    setGeneratedDocument('');
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'final':
        return 'success';
      case 'approved':
        return 'info';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: Document['type']) => {
    switch (type) {
      case 'sprint0_summary':
        return 'Sprint 0 Summary';
      case 'exec_summary':
        return 'Executive Summary';
      case 'technical_scope':
        return 'Technical Scope';
      case 'implementation_plan':
        return 'Implementation Plan';
      default:
        return type;
    }
  };

  return (
    <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        title="Documents" 
        subtitle={`${documents.length} generated documents`}
        actions={
          <Button 
            icon={Plus}
            onClick={() => setShowGenerateModal(true)}
          >
            Generate Document
          </Button>
        }
      />
      
      <div className="p-6">
        {/* Search */}
        <div className={`rounded-lg shadow-sm border p-4 mb-6 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search documents..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              Filter
            </Button>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {document.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getTypeLabel(document.type)}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(document.status)}>
                  {document.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>Version {document.version}</p>
                  <p>Created {new Date(document.created_at).toLocaleDateString()}</p>
                  <p>Updated {new Date(document.updated_at).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      icon={Trash2}
                      onClick={() => handleDeleteDocument(document.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <span className="text-xs text-gray-500 uppercase">
                    {document.format}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          </div>
        )}
      </div>

      {/* View Document Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={selectedDocument?.title || 'Document'}
        size="xl"
      >
        {selectedDocument && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant={getStatusColor(selectedDocument.status)}>
                  {selectedDocument.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Version {selectedDocument.version}
                </span>
                <span className="text-sm text-gray-500">
                  {getTypeLabel(selectedDocument.type)}
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
                <Button
                  size="sm"
                  variant="outline"
                  icon={ExternalLink}
                  onClick={() => {
                    const newWindow = window.open();
                    if (newWindow) {
                      newWindow.document.write(`
                        <html>
                          <head><title>${selectedDocument.title}</title></head>
                          <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                            <pre style="white-space: pre-wrap; font-family: inherit;">${selectedDocument.content_md}</pre>
                          </body>
                        </html>
                      `);
                    }
                  }}
                >
                  Open in New Tab
                </Button>
              </div>
            </div>
            
            <Card>
              <div className="bg-white rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans p-4">
                  {selectedDocument.content_md}
                </pre>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* Generate Document Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Project Document"
        size="xl"
      >
        <div className="space-y-6">
          <Select
            label="Document Type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as Document['type'])}
            options={[
              { value: 'sprint0_summary', label: 'Sprint 0 Summary' },
              { value: 'exec_summary', label: 'Executive Summary' },
              { value: 'technical_scope', label: 'Technical Scope' },
              { value: 'implementation_plan', label: 'Implementation Plan' }
            ]}
          />
          
          {!generatedDocument ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generate AI Document
              </h3>
              <p className="text-gray-600 mb-6">
                Create a professional {getTypeLabel(documentType).toLowerCase()} based on stakeholder responses
              </p>
              <Button
                onClick={handleGenerateDocument}
                loading={loading}
                icon={Sparkles}
                size="lg"
              >
                Generate Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <h4 className="font-medium text-gray-900 mb-3">Generated Document</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {generatedDocument}
                  </pre>
                </div>
              </Card>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setGeneratedDocument('');
                    setShowGenerateModal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDocument}
                  icon={FileText}
                >
                  Save Document
                </Button>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Generating document with AI...</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};