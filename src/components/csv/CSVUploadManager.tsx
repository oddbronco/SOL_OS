import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText, Users, MessageSquare, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';

interface CSVUploadManagerProps {
  type: 'agencies' | 'stakeholders' | 'questions';
  projectId?: string;
  projectQuestions?: any[];
  onSuccess?: () => void;
  currentUsage?: {
    stakeholders?: number;
    questions?: number;
  };
  limits?: {
    maxStakeholders?: number;
    maxQuestions?: number;
  };
}

export const CSVUploadManager: React.FC<CSVUploadManagerProps> = ({
  type,
  projectId,
  projectQuestions = [],
  onSuccess,
  currentUsage = {},
  limits = {}
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const templates = {
    agencies: {
      filename: 'agencies_template.csv',
      headers: [
        'name*', 'owner_email*', 'website', 'industry', 'size', 
        'billing_email', 'billing_phone', 'subscription_plan', 'max_projects', 'max_stakeholders'
      ],
      requiredFields: ['name', 'owner_email'],
      description: 'Upload multiple agencies with their billing information and limits'
    },
    stakeholders: {
      filename: 'stakeholders_template.csv',
      headers: [
        'name*', 'email*', 'role*', 'department*', 'phone', 
        'seniority', 'experience_years', 'mentioned_context'
      ],
      requiredFields: ['name', 'email', 'role', 'department'],
      description: 'Upload stakeholders for this project'
    },
    questions: {
      filename: 'questions_template.csv',
      headers: [
        'text*', 'category*', 'target_roles', 'is_required', 'response_format'
      ],
      requiredFields: ['text', 'category'],
      description: 'Upload questions for this project'
    }
  };

  const currentTemplate = templates[type];

  const generateTemplate = () => {
    const csvContent = currentTemplate.headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentTemplate.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportQuestionsAsCSV = () => {
    if (projectQuestions.length === 0) {
      alert('No questions to export');
      return;
    }

    const headers = ['text', 'category', 'target_roles'];
    const rows = projectQuestions.map(q => [
      q.text,
      q.category || '',
      (q.target_roles || []).join(';')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_questions_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveAsQuestionCollection = async () => {
    if (!user || !user.customerId) {
      alert('User information not available. Please try logging out and back in.');
      return;
    }

    if (!collectionName.trim()) {
      alert('Please enter a collection name');
      return;
    }

    if (projectQuestions.length === 0) {
      alert('No questions to save');
      return;
    }

    try {
      const questions = projectQuestions.map(q => ({
        text: q.text,
        category: q.category || '',
        target_roles: q.target_roles || []
      }));

      const { error } = await supabase
        .from('question_collections')
        .insert({
          customer_id: user.customerId,
          created_by: user.id,
          scope: 'personal',
          name: collectionName,
          description: collectionDescription,
          tags: [],
          questions
        });

      if (error) {
        console.error('Error saving collection:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      alert('Question collection saved successfully!');
      setShowSaveModal(false);
      setCollectionName('');
      setCollectionDescription('');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message || 'Failed to save collection'}`);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        const cleanHeader = header.replace('*', '');
        row[cleanHeader] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    try {
      const text = await file.text();
      const data = parseCSV(text);
      setPreviewData(data);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    }
  };

  const validateData = (data: any[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      currentTemplate.requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push(`Row ${index + 2}: Missing required field '${field}'`);
        }
      });

      // Validate email format
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${index + 2}: Invalid email format`);
      }

      if (row.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.owner_email)) {
        errors.push(`Row ${index + 2}: Invalid owner email format`);
      }
    });

    // Check limits for stakeholders and questions
    if (type === 'stakeholders' && limits.maxStakeholders) {
      const newTotal = (currentUsage.stakeholders || 0) + data.length;
      if (newTotal > limits.maxStakeholders) {
        errors.push(`Upload would exceed stakeholder limit (${newTotal}/${limits.maxStakeholders}). Upgrade your plan or reduce the number of stakeholders.`);
      }
    }

    if (type === 'questions' && limits.maxQuestions) {
      const newTotal = (currentUsage.questions || 0) + data.length;
      if (newTotal > limits.maxQuestions) {
        errors.push(`Upload would exceed question limit (${newTotal}/${limits.maxQuestions}). Upgrade your plan or reduce the number of questions.`);
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewData.length) return;

    const validation = validateData(previewData);
    if (!validation.valid) {
      alert('Validation errors:\n' + validation.errors.join('\n'));
      return;
    }

    setUploading(true);
    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i];
        
        try {
          if (type === 'agencies') {
            await uploadAgency(row);
          } else if (type === 'stakeholders' && projectId) {
            await uploadStakeholder(row, projectId);
          } else if (type === 'questions' && projectId) {
            await uploadQuestion(row, projectId);
          }
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Upload failed'}`);
        }
      }

      setUploadResults({
        total: previewData.length,
        successful,
        failed,
        errors
      });

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadAgency = async (data: any) => {
    // Create agency
    const { data: agencyData, error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: data.name,
        website: data.website,
        industry: data.industry,
        size: data.size || 'small',
        subscription_plan: data.subscription_plan || 'starter',
        max_projects: parseInt(data.max_projects) || 3,
        max_stakeholders: parseInt(data.max_stakeholders) || 15,
        billing_contact_email: data.billing_email,
        billing_contact_phone: data.billing_phone,
        owner_id: user?.id
      })
      .select()
      .single();

    if (agencyError) throw agencyError;

    // Create owner user if email provided
    if (data.owner_email) {
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: data.owner_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: data.owner_name || data.name + ' Admin',
          company_name: data.name,
          agency_id: agencyData.id
        }
      });

      if (userError) throw userError;

      // Create user profile
      await supabase
        .from('users')
        .insert({
          id: userData.user.id,
          email: data.owner_email,
          full_name: data.owner_name || data.name + ' Admin',
          company_name: data.name,
          role: 'agency_admin'
        });
    }
  };

  const uploadStakeholder = async (data: any, projectId: string) => {
    const { error } = await supabase
      .from('stakeholders')
      .insert({
        project_id: projectId,
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department,
        phone: data.phone,
        seniority: data.seniority,
        experience_years: parseInt(data.experience_years) || 0,
        mentioned_context: data.mentioned_context,
        status: 'pending'
      });

    if (error) throw error;
  };

  const uploadQuestion = async (data: any, projectId: string) => {
    const targetRoles = data.target_roles ? data.target_roles.split(';').map((r: string) => r.trim()) : [];
    
    const { error } = await supabase
      .from('questions')
      .insert({
        project_id: projectId,
        text: data.text,
        category: data.category,
        target_roles: targetRoles,
        is_required: data.is_required === 'true' || data.is_required === '1',
        response_format: data.response_format || 'text'
      });

    if (error) throw error;
  };

  const getIcon = () => {
    switch (type) {
      case 'agencies': return Users;
      case 'customers': return Users;
      case 'stakeholders': return Users;
      case 'questions': return MessageSquare;
      default: return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              CSV Upload - {type.charAt(0).toUpperCase() + type.slice(1)}
            </h4>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentTemplate.description}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            icon={Download}
            onClick={generateTemplate}
            size="sm"
          >
            Download Template
          </Button>
          {type === 'questions' && projectQuestions && projectQuestions.length > 0 && (
            <>
              <Button
                variant="outline"
                icon={Download}
                onClick={exportQuestionsAsCSV}
                size="sm"
              >
                Export Questions
              </Button>
              <Button
                variant="outline"
                icon={Save}
                onClick={() => setShowSaveModal(true)}
                size="sm"
              >
                Save as Collection
              </Button>
            </>
          )}
          <Button
            icon={Upload}
            onClick={() => setShowUploadModal(true)}
            size="sm"
          >
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Usage Limits Display */}
      {(type === 'stakeholders' || type === 'questions') && limits && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                Current Usage: {type === 'stakeholders' ? currentUsage.stakeholders : currentUsage.questions} / {type === 'stakeholders' ? limits.maxStakeholders : limits.maxQuestions}
              </p>
              <div className="w-48 bg-blue-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min(100, ((type === 'stakeholders' ? currentUsage.stakeholders : currentUsage.questions) || 0) / (type === 'stakeholders' ? limits.maxStakeholders : limits.maxQuestions || 1) * 100)}%` 
                  }}
                />
              </div>
            </div>
            <Badge variant="info">
              {((type === 'stakeholders' ? limits.maxStakeholders : limits.maxQuestions) || 0) - ((type === 'stakeholders' ? currentUsage.stakeholders : currentUsage.questions) || 0)} remaining
            </Badge>
          </div>
        </Card>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedFile(null);
          setPreviewData([]);
          setUploadResults(null);
        }}
        title={`Upload ${type.charAt(0).toUpperCase() + type.slice(1)} CSV`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Template Info */}
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">CSV Format Requirements</h4>
                <div className="text-sm text-yellow-700 mt-2">
                  <p className="mb-2"><strong>Required fields (marked with *):</strong></p>
                  <p className="font-mono text-xs bg-yellow-100 p-2 rounded">
                    {currentTemplate.headers.join(', ')}
                  </p>
                  <p className="mt-2">
                    <strong>Required:</strong> {currentTemplate.requiredFields.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          {!selectedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">
                  Upload CSV File
                </p>
                <p className="text-sm text-gray-500">
                  Click to browse or drag and drop
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <Card className="bg-primary-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-primary-900">{selectedFile.name}</p>
                      <p className="text-sm text-primary-700">
                        {previewData.length} records found
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewData([]);
                    }}
                  >
                    Change File
                  </Button>
                </div>
              </Card>

              {/* Preview */}
              {previewData.length > 0 && (
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Preview ({previewData.length} records)
                  </h4>
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(previewData[0]).map(header => (
                            <th key={header} className="px-3 py-2 text-left font-medium text-gray-900">
                              {header}
                              {currentTemplate.requiredFields.includes(header) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-gray-700">
                                {value || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.length > 5 && (
                      <p className="text-center text-gray-500 py-2">
                        ... and {previewData.length - 5} more records
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Validation Results */}
              {previewData.length > 0 && (() => {
                const validation = validateData(previewData);
                return (
                  <Card className={validation.valid ? 'bg-primary-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <div className="flex items-start space-x-3">
                      {validation.valid ? (
                        <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`font-medium ${validation.valid ? 'text-primary-800' : 'text-red-800'}`}>
                          {validation.valid ? 'Validation Passed' : 'Validation Errors'}
                        </h4>
                        {!validation.valid && (
                          <ul className="text-sm text-red-700 mt-2 space-y-1">
                            {validation.errors.slice(0, 10).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {validation.errors.length > 10 && (
                              <li>• ... and {validation.errors.length - 10} more errors</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <Card className="bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Upload Results</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p>Total records: {uploadResults.total}</p>
                <p>Successful: {uploadResults.successful}</p>
                <p>Failed: {uploadResults.failed}</p>
                {uploadResults.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Errors:</p>
                    <ul className="mt-1 space-y-1">
                      {uploadResults.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {uploadResults.errors.length > 5 && (
                        <li>• ... and {uploadResults.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFile(null);
                setPreviewData([]);
                setUploadResults(null);
              }}
              disabled={uploading}
            >
              Close
            </Button>
            {selectedFile && previewData.length > 0 && !uploadResults && (
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={!validateData(previewData).valid}
                icon={Upload}
              >
                Upload {previewData.length} Records
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Save as Collection Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setCollectionName('');
          setCollectionDescription('');
        }}
        title="Save Questions as Collection"
        size="md"
      >
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Save to Question Library</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Save these {projectQuestions.length} questions as a reusable collection.
                  You can import this collection into future projects from the Question Collections page.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Website Discovery Questions"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Optional description for this collection..."
              value={collectionDescription}
              onChange={(e) => setCollectionDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveModal(false);
                setCollectionName('');
                setCollectionDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              icon={Save}
              onClick={saveAsQuestionCollection}
              disabled={!collectionName.trim()}
            >
              Save Collection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};