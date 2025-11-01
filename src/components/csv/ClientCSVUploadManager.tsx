import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ClientCSVUploadManagerProps {
  onSuccess?: () => void;
}

export const ClientCSVUploadManager: React.FC<ClientCSVUploadManagerProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const template = {
    filename: 'clients_template.csv',
    headers: ['name*', 'industry*', 'email*', 'contact_person*', 'phone', 'website'],
    requiredFields: ['name', 'industry', 'email', 'contact_person'],
    description: 'Upload multiple clients at once'
  };

  const generateTemplate = () => {
    const csvContent = template.headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      template.requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push(`Row ${index + 2}: Missing required field '${field}'`);
        }
      });

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${index + 2}: Invalid email format`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewData.length || !user) return;

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
          const { error } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              customer_id: user.customerId,
              name: row.name,
              industry: row.industry,
              email: row.email,
              contact_person: row.contact_person,
              phone: row.phone || null,
              website: row.website || null,
              status: 'active'
            });

          if (error) throw error;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">CSV Import - Clients</h4>
            <p className="text-sm text-gray-600">{template.description}</p>
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
          <Button
            icon={Upload}
            onClick={() => setShowUploadModal(true)}
            size="sm"
          >
            Upload CSV
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedFile(null);
          setPreviewData([]);
          setUploadResults(null);
        }}
        title="Upload Clients CSV"
        size="xl"
      >
        <div className="space-y-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">CSV Format Requirements</h4>
                <div className="text-sm text-yellow-700 mt-2">
                  <p className="mb-2"><strong>Required fields (marked with *):</strong></p>
                  <p className="font-mono text-xs bg-yellow-100 p-2 rounded">
                    {template.headers.join(', ')}
                  </p>
                  <p className="mt-2">
                    <strong>Required:</strong> {template.requiredFields.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

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
                <p className="text-lg font-medium text-gray-900">Upload CSV File</p>
                <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-sm text-green-700">{previewData.length} records found</p>
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
                              {template.requiredFields.includes(header) && (
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

              {previewData.length > 0 && (() => {
                const validation = validateData(previewData);
                return (
                  <Card className={validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <div className="flex items-start space-x-3">
                      {validation.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`font-medium ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
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
    </div>
  );
};
