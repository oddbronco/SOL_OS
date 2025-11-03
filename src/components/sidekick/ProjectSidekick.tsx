import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, RefreshCw, FileText, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { openAIService } from '../../services/openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface Source {
  type: string;
  name: string;
  excerpt: string;
  sourceId: string;
}

interface ProjectSidekickProps {
  projectId: string;
}

export const ProjectSidekick: React.FC<ProjectSidekickProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [vectorCount, setVectorCount] = useState(0);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVectorCount();
    addWelcomeMessage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addWelcomeMessage = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your Project Sidekick - your AI assistant with full access to this project's data.

I can help you with:
• Project overview and timeline information
• Stakeholder details (who they are, their roles, experience)
• Interview questions and who they were assigned to
• Stakeholder responses (what each person said and when)
• Uploaded files and transcriptions
• Generated documents and exports
• Project status and progress

Ask me anything about this project!`,
      timestamp: new Date()
    }]);
  };

  const loadVectorCount = async () => {
    try {
      const { count } = await supabase
        .from('project_vectors')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      setVectorCount(count || 0);
    } catch (error) {
      console.error('Error loading vector count:', error);
    }
  };

  const handleReindex = async () => {
    if (!user) return;

    if (!confirm('Re-indexing will analyze all project content. This may take a few minutes. Continue?')) {
      return;
    }

    try {
      setIndexing(true);

      // Delete existing vectors for this project
      await supabase
        .from('project_vectors')
        .delete()
        .eq('project_id', projectId);

      // 1. Get comprehensive project overview data
      const { data: project } = await supabase
        .from('projects')
        .select('name, description, status, start_date, target_completion_date, created_at, updated_at, transcript')
        .eq('id', projectId)
        .single();

      if (project) {
        // Index project overview
        const overviewText = `
Project: ${project.name}
Status: ${project.status}
Description: ${project.description || 'No description'}
Start Date: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
Target Completion: ${project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : 'Not set'}
Created: ${new Date(project.created_at).toLocaleDateString()}
Last Updated: ${new Date(project.updated_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(overviewText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'project_overview',
          chunk_text: overviewText,
          embedding,
          metadata: {
            project_name: project.name,
            status: project.status,
            start_date: project.start_date,
            target_completion_date: project.target_completion_date,
            created_at: project.created_at,
            updated_at: project.updated_at
          }
        });

        // Index transcript if available
        if (project.transcript) {
          const transcriptEmbedding = await openAIService.generateEmbedding(project.transcript);
          await supabase.from('project_vectors').insert({
            project_id: projectId,
            source_type: 'kickoff_transcript',
            chunk_text: project.transcript,
            embedding: transcriptEmbedding,
            metadata: {
              project_name: project.name,
              source: 'Kickoff meeting transcript'
            }
          });
        }
      }

      // 2. Index all stakeholders with their complete information
      const { data: stakeholders } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId);

      for (const stakeholder of stakeholders || []) {
        const stakeholderText = `
Stakeholder: ${stakeholder.name}
Role: ${stakeholder.role}
Department: ${stakeholder.department}
Email: ${stakeholder.email || 'Not provided'}
Phone: ${stakeholder.phone || 'Not provided'}
Status: ${stakeholder.status}
Seniority: ${stakeholder.seniority || 'Not specified'}
Experience: ${stakeholder.experience_years ? `${stakeholder.experience_years} years` : 'Not specified'}
Added: ${new Date(stakeholder.created_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(stakeholderText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'stakeholder_info',
          source_id: stakeholder.id,
          chunk_text: stakeholderText,
          embedding,
          metadata: {
            stakeholder_id: stakeholder.id,
            stakeholder_name: stakeholder.name,
            role: stakeholder.role,
            department: stakeholder.department,
            status: stakeholder.status,
            created_at: stakeholder.created_at
          }
        });
      }

      // 3. Index all questions with metadata
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('project_id', projectId);

      for (const question of questions || []) {
        const questionText = `
Question: ${question.text}
Category: ${question.category}
Target Roles: ${question.target_roles?.join(', ') || 'All'}
Created: ${new Date(question.created_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(questionText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'question',
          source_id: question.id,
          chunk_text: questionText,
          embedding,
          metadata: {
            question_id: question.id,
            category: question.category,
            target_roles: question.target_roles,
            created_at: question.created_at
          }
        });
      }

      // 4. Index all interview responses with comprehensive context
      const { data: responses } = await supabase
        .from('interview_responses')
        .select(`
          *,
          stakeholders!inner(id, name, role, department),
          questions!inner(id, text, category)
        `)
        .eq('project_id', projectId);

      for (const response of responses || []) {
        if (response.response_text) {
          const responseText = `
Question: ${response.questions.text}
Category: ${response.questions.category}
Stakeholder: ${response.stakeholders.name} (${response.stakeholders.role}, ${response.stakeholders.department})
Response: ${response.response_text}
Answered: ${new Date(response.created_at).toLocaleDateString()} at ${new Date(response.created_at).toLocaleTimeString()}
Status: ${response.status}
          `.trim();

          const embedding = await openAIService.generateEmbedding(responseText);
          await supabase.from('project_vectors').insert({
            project_id: projectId,
            source_type: 'interview_response',
            source_id: response.id,
            chunk_text: responseText,
            embedding,
            metadata: {
              response_id: response.id,
              stakeholder_id: response.stakeholders.id,
              stakeholder_name: response.stakeholders.name,
              stakeholder_role: response.stakeholders.role,
              stakeholder_department: response.stakeholders.department,
              question_id: response.questions.id,
              question_text: response.questions.text,
              question_category: response.questions.category,
              status: response.status,
              created_at: response.created_at,
              answered_date: new Date(response.created_at).toLocaleDateString(),
              answered_time: new Date(response.created_at).toLocaleTimeString()
            }
          });
        }
      }

      // 5. Index all documents with timestamps and metadata
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId);

      for (const doc of documents || []) {
        const docText = `
Document: ${doc.title}
Type: ${doc.type}
Status: ${doc.status}
Version: ${doc.version || 1}
Content Summary: ${doc.content ? doc.content.substring(0, 500) : 'No content'}
Created: ${new Date(doc.created_at).toLocaleDateString()}
Last Updated: ${new Date(doc.updated_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(docText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'document',
          source_id: doc.id,
          chunk_text: docText,
          embedding,
          metadata: {
            document_id: doc.id,
            title: doc.title,
            type: doc.type,
            status: doc.status,
            version: doc.version,
            created_at: doc.created_at,
            updated_at: doc.updated_at
          }
        });

        // Also index full document content if available
        if (doc.content && doc.content.length > 500) {
          const contentEmbedding = await openAIService.generateEmbedding(doc.content);
          await supabase.from('project_vectors').insert({
            project_id: projectId,
            source_type: 'document_content',
            source_id: doc.id,
            chunk_text: doc.content,
            embedding: contentEmbedding,
            metadata: {
              document_id: doc.id,
              document_title: doc.title,
              document_type: doc.type
            }
          });
        }
      }

      // 6. Index all file uploads with metadata
      const { data: uploads } = await supabase
        .from('project_uploads')
        .select('*')
        .eq('project_id', projectId)
        .eq('include_in_generation', true);

      for (const upload of uploads || []) {
        const uploadText = `
File: ${upload.file_name}
Type: ${upload.upload_type}
Size: ${(upload.file_size / 1024).toFixed(2)} KB
Description: ${upload.description || 'No description'}
Meeting Date: ${upload.meeting_date ? new Date(upload.meeting_date).toLocaleDateString() : 'Not specified'}
Uploaded: ${new Date(upload.created_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(uploadText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'upload',
          source_id: upload.id,
          chunk_text: uploadText,
          embedding,
          metadata: {
            upload_id: upload.id,
            file_name: upload.file_name,
            upload_type: upload.upload_type,
            file_size: upload.file_size,
            meeting_date: upload.meeting_date,
            created_at: upload.created_at
          }
        });
      }

      // 7. Index transcriptions from audio/video files
      const { data: transcriptions } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('project_id', projectId);

      for (const transcription of transcriptions || []) {
        if (transcription.transcription_text) {
          const transcriptText = `
Transcription from: ${transcription.original_file_url || 'Unknown file'}
Language: ${transcription.language || 'Not specified'}
Word Count: ${transcription.word_count || 0}
Confidence: ${transcription.confidence_score ? (transcription.confidence_score * 100).toFixed(1) + '%' : 'Not available'}
Created: ${new Date(transcription.created_at).toLocaleDateString()}

Transcript:
${transcription.transcription_text}
          `.trim();

          const embedding = await openAIService.generateEmbedding(transcriptText);
          await supabase.from('project_vectors').insert({
            project_id: projectId,
            source_type: 'transcription',
            source_id: transcription.id,
            chunk_text: transcriptText,
            embedding,
            metadata: {
              transcription_id: transcription.id,
              file_url: transcription.original_file_url,
              language: transcription.language,
              word_count: transcription.word_count,
              confidence_score: transcription.confidence_score,
              created_at: transcription.created_at
            }
          });
        }
      }

      // 8. Index interview sessions (what questions were assigned to whom)
      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select(`
          *,
          stakeholders!inner(id, name, role, department)
        `)
        .eq('project_id', projectId);

      for (const session of sessions || []) {
        const sessionText = `
Interview Session: ${session.interview_name}
Stakeholder: ${session.stakeholders.name} (${session.stakeholders.role}, ${session.stakeholders.department})
Total Questions: ${session.total_questions}
Answered: ${session.answered_questions}
Status: ${session.status}
Created: ${new Date(session.created_at).toLocaleDateString()}
Last Activity: ${session.last_activity_at ? new Date(session.last_activity_at).toLocaleDateString() : 'None'}
Completion: ${session.total_questions > 0 ? Math.round((session.answered_questions / session.total_questions) * 100) : 0}%
        `.trim();

        const embedding = await openAIService.generateEmbedding(sessionText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'interview_session',
          source_id: session.id,
          chunk_text: sessionText,
          embedding,
          metadata: {
            session_id: session.id,
            interview_name: session.interview_name,
            stakeholder_id: session.stakeholder_id,
            stakeholder_name: session.stakeholders.name,
            stakeholder_role: session.stakeholders.role,
            total_questions: session.total_questions,
            answered_questions: session.answered_questions,
            status: session.status,
            created_at: session.created_at
          }
        });
      }

      // 9. Index document templates
      const { data: templates } = await supabase
        .from('document_templates')
        .select('*')
        .or(`project_id.eq.${projectId},is_system_template.eq.true`);

      for (const template of templates || []) {
        const templateText = `
Document Template: ${template.name}
Type: ${template.is_system_template ? 'System Template' : 'Custom Template'}
Description: ${template.description || 'No description'}
Output Format: ${template.output_format}
Category: ${template.category || 'General'}
Created: ${new Date(template.created_at).toLocaleDateString()}
        `.trim();

        const embedding = await openAIService.generateEmbedding(templateText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'document_template',
          source_id: template.id,
          chunk_text: templateText,
          embedding,
          metadata: {
            template_id: template.id,
            template_name: template.name,
            is_system: template.is_system_template,
            output_format: template.output_format,
            category: template.category,
            created_at: template.created_at
          }
        });
      }

      // 10. Index document runs (generated documents)
      const { data: docRuns } = await supabase
        .from('document_runs')
        .select(`
          *,
          document_templates!inner(name, output_format)
        `)
        .eq('project_id', projectId);

      for (const run of docRuns || []) {
        const runText = `
Generated Document: ${run.document_templates.name}
Format: ${run.document_templates.output_format}
Status: ${run.status}
Generated: ${new Date(run.created_at).toLocaleDateString()}
Completed: ${run.completed_at ? new Date(run.completed_at).toLocaleDateString() : 'In progress'}
Duration: ${run.processing_time_seconds ? `${run.processing_time_seconds} seconds` : 'N/A'}
        `.trim();

        const embedding = await openAIService.generateEmbedding(runText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'document_run',
          source_id: run.id,
          chunk_text: runText,
          embedding,
          metadata: {
            run_id: run.id,
            template_name: run.document_templates.name,
            output_format: run.document_templates.output_format,
            status: run.status,
            created_at: run.created_at,
            completed_at: run.completed_at
          }
        });
      }

      // 11. Index project exports
      const { data: exports } = await supabase
        .from('project_exports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      for (const exp of exports || []) {
        const exportText = `
Project Export
Format: ${exp.export_format}
Type: ${exp.export_type}
Status: ${exp.status}
File: ${exp.file_name || 'Not available'}
Size: ${exp.file_size ? (exp.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
Created: ${new Date(exp.created_at).toLocaleDateString()} at ${new Date(exp.created_at).toLocaleTimeString()}
Completed: ${exp.completed_at ? new Date(exp.completed_at).toLocaleDateString() : 'In progress'}
        `.trim();

        const embedding = await openAIService.generateEmbedding(exportText);
        await supabase.from('project_vectors').insert({
          project_id: projectId,
          source_type: 'project_export',
          source_id: exp.id,
          chunk_text: exportText,
          embedding,
          metadata: {
            export_id: exp.id,
            export_format: exp.export_format,
            export_type: exp.export_type,
            status: exp.status,
            file_name: exp.file_name,
            file_size: exp.file_size,
            created_at: exp.created_at,
            completed_at: exp.completed_at
          }
        });
      }

      await loadVectorCount();
      alert(`✅ Project re-indexed successfully! ${vectorCount} knowledge chunks created.`);
    } catch (error) {
      console.error('Error re-indexing:', error);
      let errorMessage = 'Failed to re-index project. ';

      if (error?.message?.includes('API key')) {
        errorMessage += 'OpenAI API key not configured. Please set up your API key in Settings.';
      } else if (error?.message?.includes('quota') || error?.message?.includes('billing')) {
        errorMessage += 'OpenAI API quota exceeded. Please check your OpenAI billing.';
      } else if (error?.message?.includes('rate limit')) {
        errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
      } else {
        errorMessage += error?.message || 'Unknown error occurred.';
      }

      alert(errorMessage);
    } finally {
      setIndexing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Intelligent query categorization
      const lowerInput = input.toLowerCase();
      const queryCategories = {
        stakeholders: /stakeholder|who (are|is)|people|team member|participant/i.test(input),
        overview: /overview|summary|about|describe|what is|project detail|status/i.test(input),
        interviews: /interview|session|answered|responded|completion|progress/i.test(input),
        questions: /question|ask|inquiry/i.test(input),
        responses: /response|answer|said|mentioned|feedback|opinion/i.test(input),
        documents: /document|file|upload|template|generated/i.test(input),
        exports: /export|download|output/i.test(input),
        timeline: /when|date|timeline|schedule|deadline|created|uploaded|added|completed/i.test(input),
        client: /client|company|customer|how many project|other project/i.test(input)
      };

      // Build comprehensive context using hybrid approach
      let context: any[] = [];
      let directDataFetched = false;

      // Strategy 1: Direct data fetching for specific entity queries
      if (queryCategories.stakeholders || queryCategories.timeline) {
        directDataFetched = true;
        const { data: stakeholders } = await supabase
          .from('stakeholders')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        stakeholders?.forEach(s => {
          const addedDate = new Date(s.created_at).toLocaleString();
          const updatedDate = new Date(s.updated_at).toLocaleString();
          context.push({
            text: `Stakeholder: ${s.name}\nRole: ${s.role}\nDepartment: ${s.department}\nEmail: ${s.email || 'Not provided'}\nPhone: ${s.phone || 'Not provided'}\nStatus: ${s.status}\nSeniority: ${s.seniority || 'Not specified'}\nExperience: ${s.experience_years ? `${s.experience_years} years` : 'Not specified'}\nAdded to Project: ${addedDate}\nLast Updated: ${updatedDate}`,
            metadata: { stakeholder_id: s.id, stakeholder_name: s.name, role: s.role, department: s.department, created_at: s.created_at, updated_at: s.updated_at },
            type: 'stakeholder_info'
          });
        });
      }

      if (queryCategories.overview || queryCategories.timeline) {
        directDataFetched = true;
        const { data: project } = await supabase
          .from('projects')
          .select('name, description, status, start_date, target_completion_date, created_at, updated_at, transcript')
          .eq('id', projectId)
          .single();

        if (project) {
          const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set';
          const targetDate = project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : 'Not set';
          const createdDate = new Date(project.created_at).toLocaleDateString();
          const updatedDate = new Date(project.updated_at).toLocaleDateString();

          context.push({
            text: `Project: ${project.name}\nStatus: ${project.status}\nDescription: ${project.description || 'No description'}\nStart Date: ${startDate}\nDue Date / Target Completion: ${targetDate}\nCreated: ${createdDate}\nLast Updated: ${updatedDate}`,
            metadata: { project_name: project.name, status: project.status, target_completion_date: project.target_completion_date },
            type: 'project_overview'
          });

          if (project.transcript) {
            context.push({
              text: `Kickoff Transcript:\n${project.transcript}`,
              metadata: { source: 'Kickoff meeting' },
              type: 'kickoff_transcript'
            });
          }
        }
      }

      if (queryCategories.interviews || queryCategories.timeline) {
        directDataFetched = true;
        const { data: sessions } = await supabase
          .from('interview_sessions')
          .select(`*, stakeholders!inner(id, name, role, department)`)
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false });

        if (sessions && sessions.length > 0) {
          for (const s of sessions) {
            const createdDate = new Date(s.created_at).toLocaleString();
            const updatedDate = new Date(s.updated_at).toLocaleString();
            const isComplete = s.status === 'completed' || s.answered_questions === s.total_questions;
            const completionDate = isComplete ? updatedDate : 'Not completed';

            let sessionText = `Interview: ${s.interview_name}\nStakeholder: ${s.stakeholders.name} (${s.stakeholders.role}, ${s.stakeholders.department})\nQuestions: ${s.total_questions}\nAnswered: ${s.answered_questions}\nStatus: ${s.status}\nCompletion: ${s.total_questions > 0 ? Math.round((s.answered_questions / s.total_questions) * 100) : 0}%\nCreated: ${createdDate}\nLast Updated: ${updatedDate}`;

            if (isComplete) {
              sessionText += `\nCompleted: ${completionDate}`;
            }

            context.push({
              text: sessionText,
              metadata: {
                session_id: s.id,
                stakeholder_name: s.stakeholders.name,
                total_questions: s.total_questions,
                answered_questions: s.answered_questions,
                status: s.status,
                created_at: s.created_at,
                updated_at: s.updated_at,
                is_complete: isComplete
              },
              type: 'interview_session'
            });

            // If asking about completion or timeline, get the actual response timestamps
            if (queryCategories.timeline && s.answered_questions > 0) {
              const { data: responses } = await supabase
                .from('interview_responses')
                .select('response_text, created_at, updated_at')
                .eq('session_id', s.id)
                .order('created_at', { ascending: true });

              if (responses && responses.length > 0) {
                const firstResponse = new Date(responses[0].created_at).toLocaleString();
                const lastResponse = new Date(responses[responses.length - 1].created_at).toLocaleString();

                context.push({
                  text: `${s.stakeholders.name}'s Response Timeline:\nFirst Response: ${firstResponse}\nLast Response: ${lastResponse}\nTotal Responses: ${responses.length}\nTime Span: ${responses.length > 1 ? 'Multiple sessions' : 'Single session'}`,
                  metadata: {
                    session_id: s.id,
                    stakeholder_name: s.stakeholders.name,
                    first_response: responses[0].created_at,
                    last_response: responses[responses.length - 1].created_at,
                    response_count: responses.length
                  },
                  type: 'response_timeline'
                });
              }
            }
          }
        }
      }

      if (queryCategories.documents || queryCategories.timeline) {
        directDataFetched = true;
        const { data: docs } = await supabase
          .from('documents')
          .select('id, title, type, status, version, created_at, updated_at')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false })
          .limit(10);

        docs?.forEach(d => {
          const createdDate = new Date(d.created_at).toLocaleString();
          const updatedDate = new Date(d.updated_at).toLocaleString();
          context.push({
            text: `Document: ${d.title}\nType: ${d.type}\nStatus: ${d.status}\nVersion: ${d.version || 1}\nCreated: ${createdDate}\nLast Updated: ${updatedDate}`,
            metadata: { document_id: d.id, title: d.title, type: d.type, created_at: d.created_at, updated_at: d.updated_at },
            type: 'document'
          });
        });

        const { data: uploads } = await supabase
          .from('project_uploads')
          .select('*')
          .eq('project_id', projectId)
          .eq('include_in_generation', true)
          .order('created_at', { ascending: false })
          .limit(10);

        uploads?.forEach(u => {
          const uploadedDate = new Date(u.created_at).toLocaleString();
          context.push({
            text: `File Upload: ${u.file_name}\nType: ${u.upload_type}\nSize: ${(u.file_size / 1024).toFixed(2)} KB\nDescription: ${u.description || 'No description'}\nUploaded: ${uploadedDate}\nUploaded By User ID: ${u.uploaded_by}`,
            metadata: { upload_id: u.id, file_name: u.file_name, upload_type: u.upload_type, created_at: u.created_at, uploaded_by: u.uploaded_by },
            type: 'upload'
          });
        });
      }

      if (queryCategories.exports || queryCategories.timeline) {
        directDataFetched = true;
        const { data: exports } = await supabase
          .from('project_exports')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(10);

        exports?.forEach(e => {
          const createdDate = new Date(e.created_at).toLocaleString();
          context.push({
            text: `Export: ${e.file_name || 'Unnamed'}\nFormat: ${e.export_format}\nType: ${e.export_type}\nStatus: ${e.status}\nSize: ${e.file_size ? (e.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}\nCreated: ${createdDate}`,
            metadata: { export_id: e.id, export_format: e.export_format, status: e.status, created_at: e.created_at },
            type: 'project_export'
          });
        });
      }

      if (queryCategories.client) {
        directDataFetched = true;

        // Get current project's client info
        const { data: currentProject } = await supabase
          .from('projects')
          .select('client_company_id, companies(id, name)')
          .eq('id', projectId)
          .single();

        if (currentProject?.companies) {
          const clientName = currentProject.companies.name;
          const clientId = currentProject.companies.id;

          // Get all projects for this client
          const { data: clientProjects } = await supabase
            .from('projects')
            .select('id, name, status, created_at, target_completion_date, updated_at')
            .eq('client_company_id', clientId)
            .order('created_at', { ascending: false });

          if (clientProjects && clientProjects.length > 0) {
            const projectsList = clientProjects.map(p => {
              const created = new Date(p.created_at).toLocaleString();
              const dueDate = p.target_completion_date ? new Date(p.target_completion_date).toLocaleDateString() : 'Not set';
              return `  - ${p.name} (${p.status}) - Created: ${created}, Due: ${dueDate}`;
            }).join('\n');

            context.push({
              text: `Client: ${clientName}\nTotal Projects: ${clientProjects.length}\n\nAll Projects for ${clientName}:\n${projectsList}`,
              metadata: {
                client_name: clientName,
                client_id: clientId,
                total_projects: clientProjects.length,
                projects: clientProjects
              },
              type: 'client_history'
            });

            // Add time-based analysis
            const now = new Date();
            const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

            const projectsLastYear = clientProjects.filter(p => new Date(p.created_at) >= lastYear).length;
            const projectsLast6Months = clientProjects.filter(p => new Date(p.created_at) >= last6Months).length;
            const projectsLast3Months = clientProjects.filter(p => new Date(p.created_at) >= last3Months).length;

            context.push({
              text: `${clientName} Project Activity:\nLast 3 months: ${projectsLast3Months} project(s)\nLast 6 months: ${projectsLast6Months} project(s)\nLast 12 months: ${projectsLastYear} project(s)\nAll time: ${clientProjects.length} project(s)`,
              metadata: {
                client_name: clientName,
                last_3_months: projectsLast3Months,
                last_6_months: projectsLast6Months,
                last_year: projectsLastYear,
                all_time: clientProjects.length
              },
              type: 'client_activity'
            });
          }
        }
      }

      // Strategy 2: Semantic search for responses and content-heavy queries
      const needsSemanticSearch = queryCategories.responses || queryCategories.questions || !directDataFetched;

      if (needsSemanticSearch) {
        const queryEmbedding = await openAIService.generateEmbedding(input);
        const matchCount = directDataFetched ? 5 : 10;
        const matchThreshold = 0.65;

        const { data: searchResults } = await supabase.rpc('search_project_vectors', {
          search_project_id: projectId,
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: matchCount
        });

        const vectorContext = searchResults?.map((result: any) => ({
          text: result.chunk_text,
          metadata: result.metadata,
          type: result.source_type
        })) || [];

        // Merge with existing context, avoiding duplicates
        const existingIds = new Set(context.map(c => c.metadata?.stakeholder_id || c.metadata?.session_id || c.metadata?.document_id).filter(Boolean));

        vectorContext.forEach(vc => {
          const id = vc.metadata?.stakeholder_id || vc.metadata?.session_id || vc.metadata?.document_id;
          if (!id || !existingIds.has(id)) {
            context.push(vc);
          }
        });
      }

      // Limit total context to prevent token overflow
      if (context.length > 20) {
        context = context.slice(0, 20);
      }

      // Build sources for display with better naming
      const sources: Source[] = context.map((c: any, i: number) => {
        let name = 'Project Info';

        if (c.type === 'interview_response') {
          name = `${c.metadata.stakeholder_name} - ${c.metadata.question_category || 'Response'}`;
        } else if (c.type === 'stakeholder_info') {
          name = `${c.metadata.stakeholder_name} (${c.metadata.role})`;
        } else if (c.type === 'interview_session') {
          name = `Session: ${c.metadata.interview_name}`;
        } else if (c.type === 'question') {
          name = `Question: ${c.metadata.category}`;
        } else if (c.type === 'document') {
          name = `Doc: ${c.metadata.title}`;
        } else if (c.type === 'document_run') {
          name = `Generated: ${c.metadata.template_name}`;
        } else if (c.type === 'document_template') {
          name = `Template: ${c.metadata.template_name}`;
        } else if (c.type === 'project_export') {
          name = `Export: ${c.metadata.export_format}`;
        } else if (c.type === 'transcription') {
          name = `Transcript: ${c.metadata.file_url?.split('/').pop() || 'Audio/Video'}`;
        } else if (c.type === 'upload') {
          name = `File: ${c.metadata.file_name}`;
        } else if (c.type === 'project_overview') {
          name = 'Project Overview';
        } else if (c.type === 'kickoff_transcript') {
          name = 'Kickoff Transcript';
        }

        return {
          type: c.type,
          name,
          excerpt: c.text.slice(0, 150) + '...',
          sourceId: `source-${i}`
        };
      });

      // Generate response using GPT with context
      const systemPrompt = `You are an accurate and helpful project assistant. Answer questions using ONLY the provided context below.

CONTEXT PROVIDED (${context.length} items):
${context.map((c: any, i: number) => `[${i + 1}] ${c.type}:\n${c.text}`).join('\n\n---\n\n')}

INSTRUCTIONS:
1. Answer accurately based on the context above
2. Be specific: mention WHO (names, roles), WHAT (actions, responses), and WHEN (dates, times)
3. If comparing or listing multiple items, be comprehensive - don't skip any
4. If the context contains stakeholder lists, interview sessions, or documents, include ALL of them in your response
5. When discussing completeness (e.g., "who hasn't responded"), use the complete lists in the context
6. If information is not in the context, clearly state "I don't have information about [topic] in the current project data"
7. Do NOT make assumptions or add information not in the context
8. Format lists clearly with bullet points or numbers when appropriate`;

      const assistantResponse = await openAIService.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ]);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        sources: sources.length > 0 ? sources : undefined,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Sidekick</h2>
          <p className="text-sm text-gray-600 mt-1">
            {vectorCount} knowledge chunks indexed
          </p>
        </div>
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={handleReindex}
          loading={indexing}
          disabled={indexing || loading}
          size="sm"
        >
          {indexing ? 'Indexing...' : 'Re-index'}
        </Button>
      </div>

      {vectorCount === 0 && (
        <Card className="mb-4 p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            This project hasn't been indexed yet. Click "Re-index" to enable AI-powered search across interviews, documents, and uploads.
          </p>
        </Card>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
              )}

              <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSources);
                        if (newExpanded.has(message.id)) {
                          newExpanded.delete(message.id);
                        } else {
                          newExpanded.add(message.id);
                        }
                        setExpandedSources(newExpanded);
                      }}
                      className="flex items-center space-x-2 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                      {expandedSources.has(message.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <span>{message.sources.length} {message.sources.length === 1 ? 'Source' : 'Sources'}</span>
                    </button>

                    {expandedSources.has(message.id) && (
                      <div className="mt-2 space-y-2">
                        {message.sources.map((source) => (
                          <div key={source.sourceId} className="bg-gray-50 border border-gray-200 rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              {source.type === 'interview_response' ? (
                                <Users className="h-3 w-3 text-gray-400" />
                              ) : (
                                <FileText className="h-3 w-3 text-gray-400" />
                              )}
                              <span className="text-xs font-medium text-gray-700">{source.name}</span>
                              <Badge variant="default" size="sm">{source.type}</Badge>
                            </div>
                            <p className="text-xs text-gray-600">{source.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-primary-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about this project..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || indexing}
            />
            <Button
              icon={Send}
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              Send
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Ask about stakeholder responses, interview sessions, project status, uploaded files, generated documents, and more.
          </p>
        </div>
      </Card>
    </div>
  );
};
