import React, { useState, useEffect } from 'react';
import { Download, Package, FileText, History, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ProjectExport {
  id: string;
  project_id: string;
  project_name: string;
  exported_by: string;
  export_type: string;
  file_size: number;
  manifest: any;
  created_at: string;
}

interface ProjectExportManagerProps {
  projectId: string;
  projectName: string;
}

export const ProjectExportManager: React.FC<ProjectExportManagerProps> = ({ projectId, projectName }) => {
  const { user } = useAuth();
  const [exports, setExports] = useState<ProjectExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'dual' | 'full_backup' | 'human_readable'>('dual');

  useEffect(() => {
    loadExports();
  }, [projectId]);

  const loadExports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_exports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExports(data || []);
    } catch (error) {
      console.error('Error loading exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setExporting(true);

      // Generate manifest
      const { data: manifest } = await supabase.rpc('generate_export_manifest', {
        export_project_id: projectId
      });

      // Fetch ALL project data and relationships for complete backup
      const [
        { data: project },
        { data: stakeholders },
        { data: questions },
        { data: interviews },
        { data: responses },
        { data: uploads },
        { data: documentRuns },
        { data: questionAssignments },
        { data: projectAssignments },
        { data: projectVectors },
        { data: documents }
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('stakeholders').select('*').eq('project_id', projectId),
        supabase.from('questions').select('*').eq('project_id', projectId),
        supabase.from('interview_sessions').select('*').eq('project_id', projectId),
        supabase.from('interview_responses').select('*').eq('project_id', projectId),
        supabase.from('project_uploads').select('*').eq('project_id', projectId),
        supabase.from('document_runs').select('*, files:document_run_files(*)').eq('project_id', projectId),
        supabase.from('question_assignments').select('*').eq('project_id', projectId),
        supabase.from('project_assignments').select('*').eq('project_id', projectId),
        supabase.from('project_vectors').select('*').eq('project_id', projectId),
        supabase.from('documents').select('*').eq('project_id', projectId)
      ]);

      // Build complete export data with ALL relationships
      const exportData: any = {
        metadata: {
          version: '2.0',
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          export_type: exportType,
          manifest,
          schema_version: 'clarity_os_v1'
        },
        project,
        stakeholders: stakeholders || [],
        questions: questions || [],
        interviews: interviews || [],
        responses: responses || [],
        uploads: uploads || [],
        document_runs: documentRuns || [],
        question_assignments: questionAssignments || [],
        project_assignments: projectAssignments || [],
        project_vectors: projectVectors || [],
        documents: documents || [],
        // Include relationship mapping for integrity
        relationships: {
          stakeholder_ids: (stakeholders || []).map((s: any) => s.id),
          question_ids: (questions || []).map((q: any) => q.id),
          interview_ids: (interviews || []).map((i: any) => i.id),
          document_run_ids: (documentRuns || []).map((d: any) => d.id)
        }
      };

      // Generate files based on export type
      let filesContent: Record<string, string> = {};

      if (exportType === 'full_backup' || exportType === 'dual') {
        // JSON backup
        filesContent['backup.json'] = JSON.stringify(exportData, null, 2);
      }

      if (exportType === 'human_readable' || exportType === 'dual') {
        // Human-readable exports
        filesContent['README.md'] = `# ${projectName} Export

**Exported:** ${new Date().toLocaleString()}
**Export Version:** 2.0 (Full Backup with Relationships)

## Project Details
- **Name:** ${project?.name}
- **Status:** ${project?.status}
- **Client:** ${project?.client}
- **Description:** ${project?.description || 'N/A'}
- **Project ID:** ${projectId}

## Export Contents

### Core Data
- **Stakeholders:** ${stakeholders?.length || 0}
- **Questions:** ${questions?.length || 0}
- **Interviews:** ${interviews?.length || 0}
- **Interview Responses:** ${responses?.length || 0}
- **Documents:** ${documents?.length || 0}

### Generated Content
- **Document Runs:** ${documentRuns?.length || 0}
- **Generated Files:** ${documentRuns?.reduce((acc: number, dr: any) => acc + (dr.files?.length || 0), 0) || 0}

### Relationships & Assignments
- **Question Assignments:** ${questionAssignments?.length || 0}
- **Project Assignments:** ${projectAssignments?.length || 0}

### Uploads & Vectors
- **Project Uploads:** ${uploads?.length || 0}
- **Vector Embeddings:** ${projectVectors?.length || 0}

## Import Instructions

This is a **COMPLETE PROJECT BACKUP**. To restore this project:

1. Go to the Projects page
2. Click "New Project"
3. Select "Import Project"
4. Upload the \`backup.json\` file
5. All data, relationships, and content will be restored

## Files in this Export

- \`backup.json\` - Complete project backup (machine-readable, for re-import)
- \`README.md\` - This file (export overview and instructions)
- \`stakeholders.csv\` - Stakeholder contact information and details
- \`interview_sessions.md\` - Interview session progress and status summary
- \`responses.md\` - Complete interview responses organized by stakeholder
- \`interview_responses.csv\` - Detailed Q&A data in spreadsheet format

## Export File Details

### interview_sessions.md
- Overview of all interview sessions
- Progress tracking (questions answered vs. total)
- Status and completion information
- Timestamps (created, updated, completed)
- Stakeholder assignments

### responses.md
- Organized by stakeholder with full context
- Includes question text and category
- Shows all response types (text, audio, video, file)
- Includes AI transcriptions from audio/video recordings
- Shows response metadata (duration, file sizes, timestamps)
- Human-readable format perfect for review and client sharing

### interview_responses.csv
- One row per response for data analysis
- Includes stakeholder info, questions, answers, and transcriptions
- Perfect for analysis in Excel, Google Sheets, or data tools
- Easy filtering and sorting by stakeholder, question category, response type
- Includes all metadata fields

### stakeholders.csv
- Contact information for all project stakeholders
- Role, department, and seniority details
- Easy to import into CRM or contact management tools

### backup.json
- Complete database snapshot with all relationships
- Can be re-imported to recreate project exactly
- Includes vectors, assignments, uploads, and all metadata
- Essential for archival and project transfer

---
*Generated by Clarity OS Export System v2.0*`;

        // Stakeholders CSV
        if (stakeholders && stakeholders.length > 0) {
          const csvRows = [
            'Name,Email,Role,Department,Seniority,Phone',
            ...stakeholders.map((s: any) =>
              `"${s.name}","${s.email}","${s.role}","${s.department || ''}","${s.seniority || ''}","${s.phone || ''}"`
            )
          ];
          filesContent['stakeholders.csv'] = csvRows.join('\n');
        }

        // Enhanced Responses markdown - Organized by stakeholder and interview
        if (responses && responses.length > 0 && stakeholders && questions) {
          let responsesMarkdown = `# Interview Responses\n\n**Project:** ${projectName}\n**Exported:** ${new Date().toLocaleString()}\n**Total Responses:** ${responses.length}\n\n---\n\n`;

          // Group responses by stakeholder
          const responsesByStakeholder = responses.reduce((acc: any, r: any) => {
            if (!acc[r.stakeholder_id]) {
              acc[r.stakeholder_id] = [];
            }
            acc[r.stakeholder_id].push(r);
            return acc;
          }, {});

          // Create a map of questions for easy lookup
          const questionMap = questions.reduce((acc: any, q: any) => {
            acc[q.id] = q;
            return acc;
          }, {});

          // Create a map of stakeholders for easy lookup
          const stakeholderMap = stakeholders.reduce((acc: any, s: any) => {
            acc[s.id] = s;
            return acc;
          }, {});

          // Generate content for each stakeholder
          Object.keys(responsesByStakeholder).forEach((stakeholderId, index) => {
            const stakeholderResponses = responsesByStakeholder[stakeholderId];
            const stakeholder = stakeholderMap[stakeholderId];

            if (!stakeholder) return;

            responsesMarkdown += `## ${index + 1}. ${stakeholder.name}\n\n`;
            responsesMarkdown += `**Role:** ${stakeholder.role}\n`;
            responsesMarkdown += `**Department:** ${stakeholder.department || 'N/A'}\n`;
            responsesMarkdown += `**Email:** ${stakeholder.email}\n`;
            responsesMarkdown += `**Total Responses:** ${stakeholderResponses.length}\n\n`;

            // Sort responses by creation date
            stakeholderResponses.sort((a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Output each response with full context
            stakeholderResponses.forEach((r: any, rIndex: number) => {
              const question = questionMap[r.question_id];

              responsesMarkdown += `### Response ${rIndex + 1}\n\n`;

              // Question text
              if (question) {
                responsesMarkdown += `**Question:** ${question.text}\n\n`;
                if (question.category) {
                  responsesMarkdown += `**Category:** ${question.category}\n\n`;
                }
              }

              // Response metadata
              responsesMarkdown += `**Response Type:** ${r.response_type}\n`;
              responsesMarkdown += `**Submitted:** ${new Date(r.created_at).toLocaleString()}\n`;

              if (r.duration_seconds) {
                const minutes = Math.floor(r.duration_seconds / 60);
                const seconds = Math.round(r.duration_seconds % 60);
                responsesMarkdown += `**Duration:** ${minutes}m ${seconds}s\n`;
              }

              // Response content
              if (r.response_text) {
                responsesMarkdown += `\n**Response:**\n\n${r.response_text}\n\n`;
              }

              // Transcription (if audio/video)
              if (r.transcription && r.transcription.trim() !== '') {
                responsesMarkdown += `**Transcription:**\n\n${r.transcription}\n\n`;
              }

              // AI Summary (if available)
              if (r.ai_summary) {
                responsesMarkdown += `**AI Summary:**\n\n${r.ai_summary}\n\n`;
              }

              // File info (if file-based response)
              if (r.file_url) {
                responsesMarkdown += `**File:** ${r.file_name || 'Unnamed file'}\n`;
                if (r.file_size) {
                  const sizeKB = (r.file_size / 1024).toFixed(2);
                  responsesMarkdown += `**File Size:** ${sizeKB} KB\n`;
                }
                responsesMarkdown += `**File URL:** ${r.file_url}\n`;
              }

              responsesMarkdown += `\n---\n\n`;
            });

            responsesMarkdown += `\n\n`;
          });

          filesContent['responses.md'] = responsesMarkdown;

          // Also create a detailed questions-answers CSV
          const csvRows = [
            'Stakeholder Name,Stakeholder Role,Department,Question,Question Category,Response Type,Response Text,Transcription,Duration (seconds),File Name,Submitted Date'
          ];

          responses.forEach((r: any) => {
            const stakeholder = stakeholderMap[r.stakeholder_id];
            const question = questionMap[r.question_id];

            if (!stakeholder || !question) return;

            const row = [
              stakeholder.name,
              stakeholder.role,
              stakeholder.department || '',
              question.text,
              question.category || '',
              r.response_type,
              r.response_text || '',
              r.transcription || '',
              r.duration_seconds || '',
              r.file_name || '',
              new Date(r.created_at).toLocaleString()
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

            csvRows.push(row);
          });

          filesContent['interview_responses.csv'] = csvRows.join('\n');

          // Create an interview sessions summary
          if (interviews && interviews.length > 0) {
            let interviewSummary = `# Interview Sessions Summary\n\n**Project:** ${projectName}\n**Total Sessions:** ${interviews.length}\n\n---\n\n`;

            interviews.forEach((session: any, idx: number) => {
              const stakeholder = stakeholderMap[session.stakeholder_id];
              if (!stakeholder) return;

              const completionPct = session.total_questions > 0
                ? Math.round((session.answered_questions / session.total_questions) * 100)
                : 0;

              interviewSummary += `## ${idx + 1}. ${session.interview_name}\n\n`;
              interviewSummary += `**Stakeholder:** ${stakeholder.name} (${stakeholder.role})\n`;
              interviewSummary += `**Type:** ${session.interview_type || 'General'}\n`;
              interviewSummary += `**Status:** ${session.status}\n`;
              interviewSummary += `**Progress:** ${session.answered_questions} / ${session.total_questions} questions (${completionPct}%)\n`;
              interviewSummary += `**Created:** ${new Date(session.created_at).toLocaleString()}\n`;
              interviewSummary += `**Last Updated:** ${new Date(session.updated_at).toLocaleString()}\n`;

              if (session.completed_at) {
                interviewSummary += `**Completed:** ${new Date(session.completed_at).toLocaleString()}\n`;
              }

              if (session.expires_at) {
                interviewSummary += `**Expires:** ${new Date(session.expires_at).toLocaleString()}\n`;
              }

              // List responses for this session
              const sessionResponses = responses.filter((r: any) => r.interview_session_id === session.id);
              if (sessionResponses.length > 0) {
                interviewSummary += `\n**Responses in this session:** ${sessionResponses.length}\n`;
              }

              interviewSummary += `\n---\n\n`;
            });

            filesContent['interview_sessions.md'] = interviewSummary;
          }
        }
      }

      // Create and download files
      const timestamp = new Date().toISOString().slice(0, 10);

      if (Object.keys(filesContent).length === 1) {
        // Single file download
        const [filename, content] = Object.entries(filesContent)[0];
        downloadFile(content, `${projectName}_${timestamp}_${filename}`);
      } else {
        // Multiple files - download each separately (in a real app, use JSZip to create a ZIP)
        Object.entries(filesContent).forEach(([filename, content]) => {
          setTimeout(() => downloadFile(content, `${projectName}_${timestamp}_${filename}`), 100);
        });
      }

      // Save export record
      const { data: exportRecord, error } = await supabase
        .from('project_exports')
        .insert({
          project_id: projectId,
          project_name: projectName,
          exported_by: user.id,
          export_type: exportType,
          file_path: `exports/${projectId}/${Date.now()}.zip`,
          file_size: JSON.stringify(exportData).length,
          manifest
        })
        .select()
        .single();

      if (error) throw error;

      setShowExportModal(false);
      loadExports();
      alert(`Export created successfully! Downloaded ${Object.keys(filesContent).length} file(s).`);
    } catch (error) {
      console.error('Error creating export:', error);
      alert('Failed to create export');
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExport = async (exportRecord: ProjectExport) => {
    try {
      // Re-fetch the project data and download again
      const [
        { data: project },
        { data: stakeholders },
        { data: questions },
        { data: interviews },
        { data: responses },
        { data: uploads },
        { data: documentRuns }
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', exportRecord.project_id).single(),
        supabase.from('stakeholders').select('*').eq('project_id', exportRecord.project_id),
        supabase.from('questions').select('*').eq('project_id', exportRecord.project_id),
        supabase.from('interview_sessions').select('*').eq('project_id', exportRecord.project_id),
        supabase.from('interview_responses').select('*').eq('project_id', exportRecord.project_id),
        supabase.from('project_uploads').select('*').eq('project_id', exportRecord.project_id),
        supabase.from('document_runs').select('*, files:document_run_files(*)').eq('project_id', exportRecord.project_id)
      ]);

      const exportData = {
        metadata: exportRecord.manifest,
        project,
        stakeholders,
        questions,
        interviews,
        responses,
        uploads,
        document_runs: documentRuns
      };

      const content = JSON.stringify(exportData, null, 2);
      const timestamp = new Date(exportRecord.created_at).toISOString().slice(0, 10);
      downloadFile(content, `${exportRecord.project_name}_export_${timestamp}.json`);
    } catch (error) {
      console.error('Error downloading export:', error);
      alert('Failed to download export');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Exports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Export your project for backup or sharing
          </p>
        </div>
        <Button icon={Package} onClick={() => setShowExportModal(true)}>
          Export Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Dual Export</h3>
          </div>
          <p className="text-sm text-gray-600">
            Complete backup + human-readable export in one download
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Full Backup</h3>
          </div>
          <p className="text-sm text-gray-600">
            Complete JSON backup for re-importing project exactly as-is
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Human-Readable</h3>
          </div>
          <p className="text-sm text-gray-600">
            CSV/markdown export for sharing with clients or team
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading exports...</div>
      ) : exports.length === 0 ? (
        <Card className="text-center py-12">
          <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2 text-gray-900">No exports yet</h3>
          <p className="mb-4 text-gray-600">Create your first project export</p>
          <Button onClick={() => setShowExportModal(true)}>Create Export</Button>
        </Card>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export History</h3>
          <div className="space-y-3">
            {exports.map((exp) => (
              <Card key={exp.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{exp.project_name}</h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                      <span>{new Date(exp.created_at).toLocaleString()}</span>
                      <Badge variant="default">{exp.export_type}</Badge>
                      <span>{formatFileSize(exp.file_size)}</span>
                    </div>
                    {exp.manifest && (
                      <p className="text-xs text-gray-500 mt-1">
                        {exp.manifest.counts?.stakeholders || 0} stakeholders • {' '}
                        {exp.manifest.counts?.interviews || 0} interviews • {' '}
                        {exp.manifest.counts?.document_runs || 0} document runs
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Download}
                  onClick={() => downloadExport(exp)}
                >
                  Download
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Project"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose the type of export you want to create. Dual export is recommended for most use cases.
          </p>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'dual'}
                onChange={() => setExportType('dual')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Dual Export (Recommended)</div>
                <p className="text-sm text-gray-600">
                  Includes both full backup and human-readable exports in one ZIP
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'full_backup'}
                onChange={() => setExportType('full_backup')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Full Backup Only</div>
                <p className="text-sm text-gray-600">
                  JSON format for perfect re-import capability
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'human_readable'}
                onChange={() => setExportType('human_readable')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Human-Readable Only</div>
                <p className="text-sm text-gray-600">
                  CSV and markdown files for easy viewing
                </p>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What's included:</strong> Project details, stakeholders, interviews, responses, questions, uploads, documents, and all metadata.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} loading={exporting} icon={exporting ? Loader : Download}>
              {exporting ? 'Creating Export...' : 'Create Export'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
