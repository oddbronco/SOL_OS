import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, RefreshCw, FileText, Users } from 'lucide-react';
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
      content: `Hello! I'm your project assistant. I can answer questions about this project based on stakeholder interviews, uploaded documents, and project context. What would you like to know?`,
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
      // Generate embedding for user query
      const queryEmbedding = await openAIService.generateEmbedding(input);

      // Search vectors
      const { data: searchResults } = await supabase.rpc('search_project_vectors', {
        search_project_id: projectId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      });

      // Build context from search results
      const context = searchResults?.map((result: any) => ({
        text: result.chunk_text,
        metadata: result.metadata,
        type: result.source_type
      })) || [];

      // Build sources for display
      const sources: Source[] = context.map((c: any, i: number) => ({
        type: c.type,
        name: c.metadata.stakeholder_name || c.metadata.file_name || 'Project Info',
        excerpt: c.text.slice(0, 150) + '...',
        sourceId: `source-${i}`
      }));

      // Generate response using GPT with context
      const systemPrompt = `You are a helpful project assistant. Answer questions ONLY based on the provided project context. If the information is not in the context, say so clearly.

Project Context:
${context.map((c: any, i: number) => `[${i + 1}] ${c.type}: ${c.text}`).join('\n\n')}`;

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
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-600 font-medium">Sources:</p>
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
            Ask questions about stakeholder responses, project goals, requirements, and more.
          </p>
        </div>
      </Card>
    </div>
  );
};
