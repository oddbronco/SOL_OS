import React, { useState, useEffect } from 'react';
import { FileText, Play, Eye, Download, Clock, User, ChevronDown, ChevronUp, Copy, RefreshCw, Save, Search, FolderArchive, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { openAIService } from '../../services/openai';

interface DocumentRun {
  id: string;
  project_id: string;
  run_label: string;
  generated_by: string;
  llm_model: string;
  templates_used: any[];
  custom_document: boolean;
  custom_prompt?: string;
  custom_document_name?: string;
  stakeholders_used: string[];
  interviews_used: string[];
  uploads_used: string[];
  questions_used: any;
  notes?: string;
  folder_path: string;
  status: string;
  error_message?: string;
  created_at: string;
  files?: DocumentRunFile[];
}

interface DocumentRunFile {
  id: string;
  document_run_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content?: string;
  created_at: string;
}

interface DocumentRunsManagerProps {
  projectId: string;
}

export const DocumentRunsManager: React.FC<DocumentRunsManagerProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [runs, setRuns] = useState<DocumentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateToSave, setTemplateToSave] = useState<any>(null);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);

  const [generateForm, setGenerateForm] = useState({
    selectedTemplates: [] as string[],
    templateFormats: {} as Record<string, string[]>,
    includeCustom: false,
    customName: '',
    customPrompt: '',
    customFormats: [] as string[],
    selectedStakeholders: [] as string[],
    selectedInterviews: [] as string[],
    selectedUploads: [] as string[],
    runLabel: '',
    notes: ''
  });

  const [saveTemplateForm, setSaveTemplateForm] = useState({
    name: '',
    description: '',
    category: 'custom'
  });

  useEffect(() => {
    loadRuns();
    loadProjectData();
  }, [projectId]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_runs')
        .select(`
          *,
          files:document_run_files(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRuns(data || []);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async () => {
    try {
      const [projectRes, stakeholdersRes, interviewsRes, uploadsRes, templatesRes, questionsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('stakeholders').select('*').eq('project_id', projectId),
        supabase.from('interview_sessions').select('*').eq('project_id', projectId),
        supabase.from('project_uploads').select('*').eq('project_id', projectId).eq('include_in_generation', true),
        supabase.from('document_templates').select('*').eq('is_active', true),
        supabase.from('questions').select('*').eq('project_id', projectId)
      ]);

      setProject(projectRes.data);
      setStakeholders(stakeholdersRes.data || []);
      setInterviews(interviewsRes.data || []);
      setUploads(uploadsRes.data || []);
      setTemplates(templatesRes.data || []);
      setQuestions(questionsRes.data || []);
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  const formatStructuredData = (structuredData: any, targetFormat: string): string => {
    switch (targetFormat) {
      case 'json':
        return JSON.stringify(structuredData, null, 2);

      case 'csv': {
        let csv = 'Section,Subsection,Type,Content\n';

        structuredData.sections?.forEach((section: any) => {
          const sectionName = section.heading || section.title || 'General';

          if (section.summary) {
            csv += `"${sectionName}","Summary","Text","${section.summary.replace(/"/g, '""')}"\n`;
          }

          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              if (typeof item === 'string') {
                csv += `"${sectionName}","","Item","${item.replace(/"/g, '""')}"\n`;
              } else if (item.title) {
                csv += `"${sectionName}","${item.title}","Item","${(item.description || item.content || '').replace(/"/g, '""')}"\n`;
              }
            });
          }

          if (section.content) {
            const content = typeof section.content === 'string' ? section.content : JSON.stringify(section.content);
            csv += `"${sectionName}","","Content","${content.replace(/"/g, '""')}"\n`;
          }

          if (section.subsections && Array.isArray(section.subsections)) {
            section.subsections.forEach((sub: any) => {
              csv += `"${sectionName}","${sub.title || sub.heading}","Subsection","${(sub.content || sub.description || '').replace(/"/g, '""')}"\n`;
              if (sub.items) {
                sub.items.forEach((item: any) => {
                  const itemText = typeof item === 'string' ? item : (item.description || item.title || '');
                  csv += `"${sectionName}","${sub.title || sub.heading}","Item","${itemText.replace(/"/g, '""')}"\n`;
                });
              }
            });
          }
        });

        return csv;
      }

      case 'markdown': {
        let md = `# ${structuredData.title || 'Document'}\n\n`;

        if (structuredData.metadata) {
          md += '---\n';
          Object.entries(structuredData.metadata).forEach(([key, value]) => {
            md += `**${key}:** ${value}\n`;
          });
          md += '---\n\n';
        }

        if (structuredData.summary) {
          md += `## Executive Summary\n\n${structuredData.summary}\n\n`;
        }

        structuredData.sections?.forEach((section: any) => {
          md += `## ${section.heading || section.title}\n\n`;

          if (section.summary) {
            md += `${section.summary}\n\n`;
          }

          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              if (typeof item === 'string') {
                md += `- ${item}\n`;
              } else if (item.title) {
                md += `### ${item.title}\n\n`;
                if (item.description) md += `${item.description}\n\n`;
                if (item.content) md += `${item.content}\n\n`;
                if (item.details && Array.isArray(item.details)) {
                  item.details.forEach((detail: string) => md += `- ${detail}\n`);
                  md += '\n';
                }
              }
            });
          }

          if (section.subsections && Array.isArray(section.subsections)) {
            section.subsections.forEach((sub: any) => {
              md += `### ${sub.title || sub.heading}\n\n`;
              if (sub.content) md += `${sub.content}\n\n`;
              if (sub.items && Array.isArray(sub.items)) {
                sub.items.forEach((item: any) => {
                  const itemText = typeof item === 'string' ? item : item.title || item.description;
                  md += `- ${itemText}\n`;
                });
                md += '\n';
              }
            });
          }

          if (section.content && typeof section.content === 'string') {
            md += `${section.content}\n\n`;
          }
        });

        return md;
      }

      case 'txt': {
        let txt = `${structuredData.title || 'DOCUMENT'}\n`;
        txt += '='.repeat((structuredData.title || 'DOCUMENT').length) + '\n\n';

        if (structuredData.summary) {
          txt += `EXECUTIVE SUMMARY\n\n${structuredData.summary}\n\n`;
        }

        structuredData.sections?.forEach((section: any) => {
          txt += `\n${(section.heading || section.title).toUpperCase()}\n`;
          txt += '-'.repeat((section.heading || section.title).length) + '\n\n';

          if (section.summary) txt += `${section.summary}\n\n`;

          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any) => {
              if (typeof item === 'string') {
                txt += `• ${item}\n`;
              } else if (item.title) {
                txt += `\n  ${item.title}\n`;
                if (item.description) txt += `  ${item.description}\n`;
                if (item.details) {
                  item.details.forEach((d: string) => txt += `    - ${d}\n`);
                }
              }
            });
            txt += '\n';
          }

          if (section.content) txt += `${section.content}\n\n`;
        });

        return txt;
      }

      case 'docx':
      case 'pdf': {
        // Professional document format
        let doc = `${structuredData.title || 'Document'}\n`;
        doc += '═'.repeat(80) + '\n\n';

        if (structuredData.metadata) {
          Object.entries(structuredData.metadata).forEach(([key, value]) => {
            doc += `${key}: ${value}\n`;
          });
          doc += '\n' + '─'.repeat(80) + '\n\n';
        }

        if (structuredData.summary) {
          doc += `EXECUTIVE SUMMARY\n\n${structuredData.summary}\n\n`;
          doc += '─'.repeat(80) + '\n\n';
        }

        structuredData.sections?.forEach((section: any, idx: number) => {
          doc += `${idx + 1}. ${section.heading || section.title}\n\n`;

          if (section.summary) doc += `   ${section.summary}\n\n`;

          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item: any, itemIdx: number) => {
              if (typeof item === 'string') {
                doc += `   • ${item}\n`;
              } else if (item.title) {
                doc += `   ${idx + 1}.${itemIdx + 1} ${item.title}\n`;
                if (item.description) doc += `       ${item.description}\n`;
                if (item.details && Array.isArray(item.details)) {
                  item.details.forEach((d: string) => doc += `       ○ ${d}\n`);
                }
                doc += '\n';
              }
            });
          }

          if (section.subsections) {
            section.subsections.forEach((sub: any, subIdx: number) => {
              doc += `   ${idx + 1}.${subIdx + 1} ${sub.title || sub.heading}\n`;
              if (sub.content) doc += `       ${sub.content}\n`;
              if (sub.items) {
                sub.items.forEach((item: any) => {
                  const text = typeof item === 'string' ? item : item.title || item.description;
                  doc += `       • ${text}\n`;
                });
              }
              doc += '\n';
            });
          }

          doc += '\n';
        });

        return doc;
      }

      default:
        return JSON.stringify(structuredData, null, 2);
    }
  };

  const generateDetailedManifest = async (run: any, responses: any[]) => {
    const timestamp = new Date().toLocaleString();
    const selectedTemplateNames = generateForm.selectedTemplates
      .map(id => templates.find(t => t.id === id)?.name)
      .filter(Boolean);

    let manifest = `================================
DOCUMENT GENERATION RUN MANIFEST
================================

Run ID: ${run.id}
Run Label: ${run.run_label}
Generated At: ${timestamp}
Generated By: ${user?.email || 'Unknown'}
Project: ${project?.name || 'Unknown'}
LLM Model: ${run.llm_model}
Status: ${run.status}

================================
DOCUMENTS GENERATED
================================

Templates Used: ${selectedTemplateNames.length}
${selectedTemplateNames.map((name, idx) => `  ${idx + 1}. ${name}`).join('\n')}

${generateForm.includeCustom ? `Custom Document: ${generateForm.customName}\n` : ''}
Total Files Generated: ${generateForm.selectedTemplates.length + (generateForm.includeCustom ? 1 : 0) + 1} (including this manifest)

================================
DATA SOURCES USED
================================

STAKEHOLDERS (${generateForm.selectedStakeholders.length}):
${stakeholders
  .filter(s => generateForm.selectedStakeholders.includes(s.id))
  .map(s => `  • ${s.name} - ${s.role} (${s.department})
    Email: ${s.email || 'N/A'}
    Status: ${s.status}
    Added: ${new Date(s.created_at).toLocaleDateString()}`)
  .join('\n\n')}

INTERVIEW SESSIONS (${generateForm.selectedInterviews.length}):
${interviews
  .filter(i => generateForm.selectedInterviews.includes(i.id))
  .map(i => `  • ${i.interview_name || 'Interview'}
    Created: ${new Date(i.created_at).toLocaleDateString()}`)
  .join('\n\n')}

INTERVIEW RESPONSES BY STAKEHOLDER:
${await Promise.all(
  stakeholders
    .filter(s => generateForm.selectedStakeholders.includes(s.id))
    .map(async stakeholder => {
      const stakeholderResponses = responses.filter(r => r.stakeholder_id === stakeholder.id);
      if (stakeholderResponses.length === 0) return `  ${stakeholder.name}: No responses`;

      return `  ${stakeholder.name} (${stakeholderResponses.length} responses):
${stakeholderResponses.map(r => `    - Q: ${r.questions?.text || 'Unknown question'}
      Category: ${r.questions?.category || 'N/A'}
      Answered: ${new Date(r.created_at).toLocaleDateString()} at ${new Date(r.created_at).toLocaleTimeString()}
      Status: ${r.status}`).join('\n\n')}`;
    })
).then(results => results.join('\n\n'))}

SUPPLEMENTAL FILES (${generateForm.selectedUploads.length}):
${uploads
  .filter(u => generateForm.selectedUploads.includes(u.id))
  .map(u => `  • ${u.file_name}
    Type: ${u.upload_type}
    Size: ${(u.file_size / 1024).toFixed(2)} KB
    Description: ${u.description || 'N/A'}
    Uploaded: ${new Date(u.created_at).toLocaleDateString()}`)
  .join('\n\n')}

================================
QUESTIONS CATEGORIES INCLUDED
================================

${questions.length > 0 ?
  [...new Set(questions.map(q => q.category))].map(cat =>
    `${cat}:
${questions.filter(q => q.category === cat).map(q => `  - ${q.text}`).join('\n')}`
  ).join('\n\n')
  : 'No questions available'}

================================
RUN NOTES
================================

${run.notes || 'No additional notes'}

================================
FOLDER STRUCTURE
================================

${run.folder_path}/
  ├── MANIFEST.txt (this file)
${selectedTemplateNames.map(name => `  ├── ${name}.md`).join('\n')}
${generateForm.includeCustom ? `  └── ${generateForm.customName}.md\n` : ''}

================================
END OF MANIFEST
================================
`;

    return manifest;
  };

  const handleGenerate = async () => {
    if (!user) return;

    try {
      setGenerating(true);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const sanitizedProjectName = project?.name.replace(/[^a-zA-Z0-9]/g, '-') || 'Project';
      const label = generateForm.runLabel || 'Run';
      const folderPath = `${timestamp}_${sanitizedProjectName}_${label}`;

      const { data: run, error: runError } = await supabase
        .from('document_runs')
        .insert({
          project_id: projectId,
          run_label: label,
          generated_by: user.id,
          llm_model: 'gpt-4o',
          templates_used: generateForm.selectedTemplates,
          custom_document: generateForm.includeCustom,
          custom_prompt: generateForm.customPrompt,
          custom_document_name: generateForm.customName,
          stakeholders_used: generateForm.selectedStakeholders,
          interviews_used: generateForm.selectedInterviews,
          uploads_used: generateForm.selectedUploads,
          notes: generateForm.notes,
          folder_path: folderPath,
          status: 'processing'
        })
        .select()
        .single();

      if (runError) throw runError;

      const { data: responses } = await supabase
        .from('interview_responses')
        .select('*, stakeholders(*), questions(*)')
        .in('interview_session_id', generateForm.selectedInterviews);

      const context = {
        projectName: project?.name,
        projectDescription: project?.description,
        transcript: project?.transcript,
        stakeholderResponses: responses || [],
        uploads: uploads.filter(u => generateForm.selectedUploads.includes(u.id)),
        questions: questions
      };

      const filesToSave: any[] = [];

      // Generate documents for each selected template
      for (const templateId of generateForm.selectedTemplates) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          // Create enhanced prompt that requests structured JSON
          let basePrompt = template.prompt_template
            .replace('{{project_name}}', context.projectName || '')
            .replace('{{project_description}}', context.projectDescription || '')
            .replace('{{transcript}}', context.transcript || '')
            .replace('{{stakeholder_responses}}', JSON.stringify(context.stakeholderResponses, null, 2))
            .replace('{{uploads}}', JSON.stringify(context.uploads, null, 2))
            .replace('{{questions}}', JSON.stringify(context.questions, null, 2));

          // Request structured JSON output
          const structuredPrompt = `${basePrompt}

IMPORTANT: Return your response as a valid JSON object with this structure:
{
  "title": "Document Title",
  "metadata": {
    "project": "${context.projectName}",
    "date": "${new Date().toLocaleDateString()}",
    "version": "1.0"
  },
  "summary": "2-3 sentence executive summary",
  "sections": [
    {
      "heading": "Section Name",
      "summary": "Brief section overview",
      "items": [
        {
          "title": "Item Title",
          "description": "Detailed description",
          "details": ["detail 1", "detail 2"]
        }
      ],
      "subsections": [
        {
          "title": "Subsection Name",
          "content": "Subsection content",
          "items": ["item 1", "item 2"]
        }
      ]
    }
  ]
}

Make the content comprehensive, professional, and well-organized. Use clear headings and detailed descriptions.`;

          const jsonResponse = await openAIService.generateText(structuredPrompt);

          // Parse JSON response
          let structuredData;
          try {
            // Try to extract JSON if wrapped in markdown code blocks
            const jsonMatch = jsonResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : jsonResponse;
            structuredData = JSON.parse(jsonString);
          } catch (e) {
            console.error('Failed to parse JSON, using fallback structure:', e);
            structuredData = {
              title: template.name,
              metadata: { project: context.projectName, date: new Date().toLocaleDateString() },
              summary: jsonResponse.substring(0, 200),
              sections: [{ heading: "Content", content: jsonResponse }]
            };
          }

          // Generate file for each selected format
          const selectedFormats = generateForm.templateFormats[templateId] || [template.output_format];
          for (const format of selectedFormats) {
            const extension = format === 'markdown' ? 'md' : format;
            const fileName = `${template.name}.${extension}`;
            const formattedContent = formatStructuredData(structuredData, format);

            filesToSave.push({
              document_run_id: run.id,
              file_name: fileName,
              file_path: `${folderPath}/${fileName}`,
              file_type: format,
              content: formattedContent
            });
          }
        }
      }

      // Generate custom document if requested
      if (generateForm.includeCustom && generateForm.customPrompt) {
        const structuredPrompt = `${generateForm.customPrompt}

Context:
${JSON.stringify(context, null, 2)}

IMPORTANT: Return your response as a valid JSON object with this structure:
{
  "title": "${generateForm.customName || 'Custom Document'}",
  "metadata": {
    "project": "${context.projectName}",
    "date": "${new Date().toLocaleDateString()}",
    "version": "1.0"
  },
  "summary": "Brief overview of the document",
  "sections": [
    {
      "heading": "Section Name",
      "summary": "Section overview",
      "items": [
        {
          "title": "Item Title",
          "description": "Description",
          "details": ["detail 1", "detail 2"]
        }
      ]
    }
  ]
}

Make it comprehensive, professional, and well-structured.`;

        const jsonResponse = await openAIService.generateText(structuredPrompt);

        // Parse JSON response
        let structuredData;
        try {
          const jsonMatch = jsonResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : jsonResponse;
          structuredData = JSON.parse(jsonString);
        } catch (e) {
          console.error('Failed to parse custom JSON, using fallback:', e);
          structuredData = {
            title: generateForm.customName || 'Custom Document',
            metadata: { project: context.projectName, date: new Date().toLocaleDateString() },
            summary: jsonResponse.substring(0, 200),
            sections: [{ heading: "Content", content: jsonResponse }]
          };
        }

        // Generate file for each selected custom format
        const selectedFormats = generateForm.customFormats.length > 0 ? generateForm.customFormats : ['markdown'];
        for (const format of selectedFormats) {
          const extension = format === 'markdown' ? 'md' : format;
          const fileName = `${generateForm.customName || 'custom'}.${extension}`;
          const formattedContent = formatStructuredData(structuredData, format);

          filesToSave.push({
            document_run_id: run.id,
            file_name: fileName,
            file_path: `${folderPath}/${fileName}`,
            file_type: format,
            content: formattedContent
          });
        }
      }

      const manifest = await generateDetailedManifest(run, responses || []);

      filesToSave.unshift({
        document_run_id: run.id,
        file_name: 'MANIFEST.txt',
        file_path: `${folderPath}/MANIFEST.txt`,
        file_type: 'txt',
        content: manifest
      });

      const { error: filesError } = await supabase.from('document_run_files').insert(filesToSave);

      if (filesError) {
        console.error('Error saving files:', filesError);
        await supabase
          .from('document_runs')
          .update({ status: 'failed' })
          .eq('id', run.id);
        throw new Error(`Failed to save files: ${filesError.message}`);
      }

      await supabase
        .from('document_runs')
        .update({ status: 'completed' })
        .eq('id', run.id);

      setShowGenerateModal(false);
      resetForm();
      loadRuns();
    } catch (error: any) {
      console.error('Error generating document:', error);
      alert(`Failed to generate documents: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setGenerateForm({
      selectedTemplates: [],
      templateFormats: {},
      includeCustom: false,
      customName: '',
      customPrompt: '',
      customFormats: [],
      selectedStakeholders: [],
      selectedInterviews: [],
      selectedUploads: [],
      runLabel: '',
      notes: ''
    });
  };

  const handleReRunWithSettings = (run: DocumentRun) => {
    // Build templateFormats from previous run files
    const prevFormats: Record<string, string[]> = {};
    if (run.templates_used && run.files) {
      run.templates_used.forEach(tid => {
        const template = templates.find(t => t.id === tid);
        if (template) {
          // Find all file formats generated for this template
          const templateFiles = run.files!.filter(f => f.file_name.startsWith(template.name));
          const formats = [...new Set(templateFiles.map(f => f.file_type))];
          prevFormats[tid] = formats.length > 0 ? formats : [template.output_format];
        }
      });
    }

    // Extract custom formats if custom document was used
    let customFormats: string[] = ['markdown'];
    if (run.custom_document && run.files) {
      const customFiles = run.files.filter(f => f.file_name.startsWith(run.custom_document_name || 'custom'));
      if (customFiles.length > 0) {
        customFormats = [...new Set(customFiles.map(f => f.file_type))];
      }
    }

    // Calculate next version number
    const baseLabel = run.run_label.split('-v')[0];
    const existingVersions = runs.filter(r => r.run_label.startsWith(baseLabel));
    const nextVersion = existingVersions.length + 1;

    setGenerateForm({
      selectedTemplates: run.templates_used || [],
      templateFormats: prevFormats,
      includeCustom: run.custom_document,
      customName: run.custom_document_name || '',
      customPrompt: run.custom_prompt || '',
      customFormats: customFormats,
      selectedStakeholders: run.stakeholders_used,
      selectedInterviews: run.interviews_used,
      selectedUploads: run.uploads_used,
      runLabel: `${baseLabel}-v${nextVersion}`,
      notes: `Re-run of v${getVersionNumber(run)}`
    });
    setShowGenerateModal(true);
  };

  const handleSaveAsTemplate = (run: DocumentRun) => {
    if (run.custom_document) {
      setTemplateToSave({
        prompt: run.custom_prompt,
        name: run.custom_document_name
      });
      setSaveTemplateForm({
        name: run.custom_document_name || '',
        description: `Saved from run: ${run.run_label}`,
        category: 'custom'
      });
      setShowSaveTemplateModal(true);
    }
  };

  const saveCustomAsTemplate = async () => {
    if (!templateToSave) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .insert({
          name: saveTemplateForm.name,
          description: saveTemplateForm.description,
          category: saveTemplateForm.category,
          prompt_template: templateToSave.prompt,
          output_format: 'markdown',
          is_custom: true,
          is_active: true
        });

      if (error) throw error;

      alert('Template saved successfully!');
      setShowSaveTemplateModal(false);
      setSaveTemplateForm({ name: '', description: '', category: 'custom' });
      setTemplateToSave(null);
      loadProjectData();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const downloadRunFile = (file: DocumentRunFile) => {
    if (file.content) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadAllAsZip = async (run: DocumentRun) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const folder = zip.folder(run.folder_path);

      if (run.files && folder) {
        for (const file of run.files) {
          if (file.content) {
            folder.file(file.file_name, file.content);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${run.folder_path}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Failed to create zip file. Please download files individually.');
    }
  };

  const filteredRuns = runs.filter(run =>
    run.run_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.folder_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVersionNumber = (run: DocumentRun) => {
    const baseLabel = run.run_label.split('-v')[0];
    return runs.filter(r => r.run_label.startsWith(baseLabel) && r.created_at <= run.created_at).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Document Runs</h2>
          <p className="text-sm text-gray-600 mt-1">
            {runs.length} generation{runs.length !== 1 ? 's' : ''} • Track versions and iterations
          </p>
        </div>
        <Button icon={Play} onClick={() => setShowGenerateModal(true)}>
          Generate Documents
        </Button>
      </div>

      {runs.length > 0 && (
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search runs by label, notes, or folder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          {searchTerm && (
            <Button
              size="sm"
              variant="outline"
              icon={X}
              onClick={() => setSearchTerm('')}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading runs...</div>
      ) : filteredRuns.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2 text-gray-900">
            {searchTerm ? 'No matching runs found' : 'No documents generated yet'}
          </h3>
          <p className="mb-4 text-gray-600">
            {searchTerm ? 'Try a different search term' : 'Generate your first document run'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowGenerateModal(true)}>Generate Now</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run) => {
            const versionNum = getVersionNumber(run);
            return (
              <Card key={run.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {run.run_label} <span className="text-gray-500">v{versionNum}</span>
                      </h3>
                      <Badge variant={
                        run.status === 'completed' ? 'success' :
                        run.status === 'processing' ? 'warning' :
                        run.status === 'failed' ? 'error' : 'default'
                      }>
                        {run.status}
                      </Badge>
                      {run.custom_document && (
                        <Badge variant="info">Custom</Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                      <span>{run.files?.length || 0} files</span>
                      <span>{run.stakeholders_used.length} stakeholders</span>
                      <span>{run.interviews_used.length} interviews</span>
                      <span>{run.uploads_used.length} uploads</span>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      Folder: {run.folder_path}
                    </div>

                    {run.templates_used && run.templates_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs text-gray-500">Templates:</span>
                        {run.templates_used.map((templateId, idx) => {
                          const template = templates.find(t => t.id === templateId);
                          return template ? (
                            <Badge key={idx} variant="default" size="sm">
                              {template.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}

                    {run.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{run.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {run.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={FolderArchive}
                        onClick={() => downloadAllAsZip(run)}
                        title="Download all files as ZIP"
                      >
                        ZIP
                      </Button>
                    )}
                    {run.custom_document && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Save}
                        onClick={() => handleSaveAsTemplate(run)}
                        title="Save as template"
                      >
                        Save
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={RefreshCw}
                      onClick={() => handleReRunWithSettings(run)}
                      title="Re-run with same settings"
                    >
                      Re-run
                    </Button>
                    <button
                      onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {expandedRun === run.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedRun === run.id && run.files && run.files.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Generated Files</h4>
                      <Badge variant="default">{run.files.length} files</Badge>
                    </div>
                    {run.files.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{file.file_name}</span>
                          <Badge size="sm" variant="default">{file.file_type}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Download}
                          onClick={() => downloadRunFile(file)}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Documents"
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Document Templates
              <span className="text-gray-500 ml-1">(select templates and output formats)</span>
            </label>

            {templates.length > 0 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates by name or category..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm"
                />
                {templateSearchTerm && (
                  <button
                    onClick={() => setTemplateSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="border border-gray-300 rounded-md p-3 max-h-96 overflow-y-auto space-y-3 bg-gray-50">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">No templates available. Create templates in the Document Templates page.</p>
              ) : (() => {
                const filteredTemplates = templates.filter(template =>
                  template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                  template.category?.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                  template.description?.toLowerCase().includes(templateSearchTerm.toLowerCase())
                );

                if (filteredTemplates.length === 0) {
                  return <p className="text-sm text-gray-500 text-center py-4">No templates match your search.</p>;
                }

                return filteredTemplates.map(template => {
                  const isSelected = generateForm.selectedTemplates.includes(template.id);
                  const selectedFormats = generateForm.templateFormats[template.id] || [];
                  // Use template's supported formats, or all formats if not specified
                  const availableFormats = (template as any).supported_formats ||
                    ['markdown', 'pdf', 'docx', 'txt', 'csv', 'json'];

                  return (
                    <div key={template.id} className="bg-white p-3 rounded-md border border-gray-200">
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...generateForm.selectedTemplates, template.id]
                              : generateForm.selectedTemplates.filter(id => id !== template.id);

                            const updatedFormats = { ...generateForm.templateFormats };
                            if (e.target.checked) {
                              updatedFormats[template.id] = [template.output_format || 'markdown'];
                            } else {
                              delete updatedFormats[template.id];
                            }

                            setGenerateForm({
                              ...generateForm,
                              selectedTemplates: updated,
                              templateFormats: updatedFormats
                            });
                          }}
                          className="mt-0.5 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">{template.name}</span>
                            <Badge size="sm">{template.output_format}</Badge>
                            <Badge size="sm" variant="default">{template.category}</Badge>
                          </div>
                          {template.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                          )}

                          {isSelected && (
                            <div className="mt-2 pl-4 border-l-2 border-blue-300">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Output Formats:
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {availableFormats.map(format => (
                                  <label key={format} className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedFormats.includes(format)}
                                      onChange={(e) => {
                                        const updatedFormats = { ...generateForm.templateFormats };
                                        const currentFormats = updatedFormats[template.id] || [];

                                        if (e.target.checked) {
                                          updatedFormats[template.id] = [...currentFormats, format];
                                        } else {
                                          updatedFormats[template.id] = currentFormats.filter(f => f !== format);
                                        }

                                        setGenerateForm({
                                          ...generateForm,
                                          templateFormats: updatedFormats
                                        });
                                      }}
                                      className="rounded text-blue-600"
                                    />
                                    <span className="text-xs text-gray-700 uppercase">{format}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Selected: {generateForm.selectedTemplates.length} template(s)
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center space-x-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={generateForm.includeCustom}
                onChange={(e) => setGenerateForm({ ...generateForm, includeCustom: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Include Custom Document</span>
            </label>

            {generateForm.includeCustom && (
              <div className="space-y-3 pl-6 bg-blue-50 p-3 rounded-md">
                <Input
                  placeholder="Document name"
                  value={generateForm.customName}
                  onChange={(e) => setGenerateForm({ ...generateForm, customName: e.target.value })}
                />
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="Custom prompt for document generation..."
                  value={generateForm.customPrompt}
                  onChange={(e) => setGenerateForm({ ...generateForm, customPrompt: e.target.value })}
                />
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Output Formats:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['markdown', 'pdf', 'docx', 'txt', 'csv', 'json'].map(format => (
                      <label key={format} className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateForm.customFormats.includes(format)}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...generateForm.customFormats, format]
                              : generateForm.customFormats.filter(f => f !== format);
                            setGenerateForm({ ...generateForm, customFormats: updated });
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-xs text-gray-700 uppercase">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Stakeholders <span className="text-gray-500">({generateForm.selectedStakeholders.length} selected)</span>
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                {stakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500">No stakeholders available</p>
                ) : (
                  stakeholders.map(s => (
                    <label key={s.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-white rounded">
                      <input
                        type="checkbox"
                        checked={generateForm.selectedStakeholders.includes(s.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...generateForm.selectedStakeholders, s.id]
                            : generateForm.selectedStakeholders.filter(id => id !== s.id);
                          setGenerateForm({ ...generateForm, selectedStakeholders: updated });
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{s.name} - {s.role}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Interviews <span className="text-gray-500">({generateForm.selectedInterviews.length} selected)</span>
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                {interviews.length === 0 ? (
                  <p className="text-sm text-gray-500">No interviews available</p>
                ) : (
                  interviews.map(i => (
                    <label key={i.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-white rounded">
                      <input
                        type="checkbox"
                        checked={generateForm.selectedInterviews.includes(i.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...generateForm.selectedInterviews, i.id]
                            : generateForm.selectedInterviews.filter(id => id !== i.id);
                          setGenerateForm({ ...generateForm, selectedInterviews: updated });
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{i.interview_name || 'Interview'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <label className="block text-sm font-medium text-gray-700">
              Supplemental Files <span className="text-gray-500">({generateForm.selectedUploads.length} selected)</span>
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto space-y-2 bg-gray-50">
              {uploads.length === 0 ? (
                <p className="text-sm text-gray-500">No supplemental files available</p>
              ) : (
                uploads.map(u => (
                  <label key={u.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-white rounded">
                    <input
                      type="checkbox"
                      checked={generateForm.selectedUploads.includes(u.id)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...generateForm.selectedUploads, u.id]
                          : generateForm.selectedUploads.filter(id => id !== u.id);
                        setGenerateForm({ ...generateForm, selectedUploads: updated });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{u.file_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <Input
              placeholder="Run label (e.g., 'Sprint-0', 'Updated-With-Late-Responses')"
              value={generateForm.runLabel}
              onChange={(e) => setGenerateForm({ ...generateForm, runLabel: e.target.value })}
            />
          </div>

          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Notes (optional)"
            value={generateForm.notes}
            onChange={(e) => setGenerateForm({ ...generateForm, notes: e.target.value })}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowGenerateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={
                generating ||
                (generateForm.selectedTemplates.length === 0 && !generateForm.includeCustom) ||
                (generateForm.includeCustom && (!generateForm.customName || !generateForm.customPrompt)) ||
                generateForm.selectedInterviews.length === 0
              }
            >
              {generating ? 'Generating...' : `Generate ${generateForm.selectedTemplates.length + (generateForm.includeCustom ? 1 : 0)} Document(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        title="Save as Template"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="My Custom Template"
            value={saveTemplateForm.name}
            onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Describe what this template generates..."
              value={saveTemplateForm.description}
              onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, description: e.target.value })}
            />
          </div>
          <Input
            label="Category"
            placeholder="custom"
            value={saveTemplateForm.category}
            onChange={(e) => setSaveTemplateForm({ ...saveTemplateForm, category: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowSaveTemplateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveCustomAsTemplate}
              disabled={!saveTemplateForm.name}
            >
              Save Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
