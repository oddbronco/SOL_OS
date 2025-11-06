import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Edit, Trash2, Copy, Globe, Lock, HelpCircle, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface DocumentTemplate {
  id: string;
  customer_id: string;
  created_by: string;
  scope: 'org' | 'personal' | 'client';
  name: string;
  description: string;
  required_inputs: any;
  prompt_template: string;
  output_format: string;
  category: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export const DocumentTemplates: React.FC = () => {
  const { user } = useAuth();

  // ALL hooks must be declared before any returns
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'org' | 'personal'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'personal' as 'org' | 'personal',
    category: '',
    output_format: 'markdown' as 'markdown' | 'docx' | 'txt' | 'pdf' | 'csv' | 'json',
    supported_formats: ['markdown', 'txt', 'pdf', 'docx', 'csv', 'json'] as string[],
    prompt_template: '',
    example_output: ''
  });

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          customer_id: user.customer_id,
          created_by: user.id,
          scope: formData.scope,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          output_format: formData.output_format,
          supported_formats: formData.supported_formats,
          prompt_template: formData.prompt_template,
          example_output: formData.example_output,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([data, ...templates]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!user || !editingTemplate) return;

    try {
      const { data, error } = await supabase
        .from('document_templates')
        .update({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          output_format: formData.output_format,
          supported_formats: formData.supported_formats,
          prompt_template: formData.prompt_template,
          example_output: formData.example_output,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(templates.map(t => t.id === data.id ? data : t));
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!confirm(`Are you sure you want to delete "${template?.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Failed to delete template: ${error.message}`);
        throw error;
      }

      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEditClick = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      scope: template.scope as any,
      category: template.category || '',
      output_format: template.output_format as any,
      supported_formats: (template as any).supported_formats || ['markdown', 'txt', 'pdf', 'docx', 'csv', 'json'],
      prompt_template: template.prompt_template,
      example_output: template.example_output || ''
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scope: 'personal',
      category: '',
      output_format: 'markdown',
      supported_formats: ['markdown', 'txt', 'pdf', 'docx', 'csv', 'json'],
      prompt_template: '',
      example_output: ''
    });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScope = scopeFilter === 'all' || template.scope === scopeFilter;
    return matchesSearch && matchesScope && template.is_active;
  });

  // Conditional rendering AFTER all hooks
  if (!user && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f4f8' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f4f8' }}>
        <p className="text-gray-600">Please sign in to view templates.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f4f8' }}>
      <div className="border-b px-6 py-4 border-gray-200" style={{ backgroundColor: '#f0f4f8' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
            <p className="mt-1 text-gray-600">{templates.length} templates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={HelpCircle} onClick={() => setShowHelp(!showHelp)}>
              Guide
            </Button>
            <Button icon={Plus} onClick={() => { resetForm(); setShowCreateModal(true); }}>
              New Template
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {showHelp && (
          <Card className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">📚 Document Template Guide</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">🎯 How Templates Work</h4>
                <p className="mb-2">When you generate documents, the system:</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Injects project data into your prompt template</li>
                  <li>Sends it to the LLM which generates <strong>structured JSON</strong></li>
                  <li>Transforms that JSON into each selected output format</li>
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">📝 Format Selection Guide</h4>
                  <ul className="space-y-2 text-xs">
                    <li><strong>Markdown + TXT:</strong> Internal documentation, collaborative editing, knowledge bases</li>
                    <li><strong>PDF + DOCX:</strong> Client deliverables, formal proposals, presentations, contracts</li>
                    <li><strong>CSV:</strong> Requirements tracking, user stories, data exports, spreadsheet analysis</li>
                    <li><strong>JSON:</strong> API integration, programmatic access, data processing pipelines</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">💡 Template Examples</h4>
                  <ul className="space-y-2 text-xs">
                    <li><strong>Sprint 0 Summary:</strong> Markdown, PDF, DOCX (for stakeholders & devs)</li>
                    <li><strong>User Stories:</strong> Markdown, CSV (for tracking in tools)</li>
                    <li><strong>Technical Spec:</strong> Markdown, PDF (for developers & clients)</li>
                    <li><strong>Requirements Export:</strong> CSV, JSON (for data analysis)</li>
                    <li><strong>Meeting Notes:</strong> Markdown, TXT (for quick reference)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">✍️ Writing Effective Prompts</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Be specific about the document structure and sections you want</li>
                  <li>• Use <code className="bg-gray-100 px-1 rounded">{'{{question_answers}}'}</code> for detailed Q&A pairs where each question shows all stakeholder responses</li>
                  <li>• Use <code className="bg-gray-100 px-1 rounded">{'{{responses_by_category}}'}</code> or <code className="bg-gray-100 px-1 rounded">{'{{responses_by_stakeholder}}'}</code> to organize interviews differently</li>
                  <li>• The AI generates structured JSON with tables, priorities, statuses, tags, and callouts automatically</li>
                  <li>• Focus on <strong>content goals</strong> and request specific data structures like tables or categorized lists</li>
                  <li>• The system converts JSON to all selected formats - specify what data to include, not how to format it</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-xs"><strong>⚡ Pro Tip:</strong> Choose formats based on your audience. Stakeholders prefer PDF/DOCX, developers prefer Markdown, analysts prefer CSV/JSON. Select multiple formats to serve all audiences at once!</p>
              </div>
            </div>
          </Card>
        )}

        <div className="mb-6 flex gap-4">
          <Input
            placeholder="Search templates..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Templates' },
              { value: 'org', label: 'Organization' },
              { value: 'personal', label: 'Personal' }
            ]}
            className="w-48"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No templates found</h3>
            <p className="mb-4 text-gray-600">Create your first document template</p>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={template.scope === 'org' ? 'info' : 'default'} size="sm">
                          {template.scope === 'org' ? 'Organization' : 'Personal'}
                        </Badge>
                        {template.category && (
                          <Badge variant="default" size="sm">{template.category}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClick(template)}
                      className="text-gray-600 hover:text-blue-600"
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-gray-600 hover:text-red-600"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                )}

                <div className="space-y-2">
                  <div className="text-xs text-gray-500 mb-1">Supported Formats:</div>
                  <div className="flex flex-wrap gap-1">
                    {((template as any).supported_formats || [template.output_format]).map((format: string) => (
                      <Badge key={format} variant="default" size="sm">{format}</Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal || !!editingTemplate}
        onClose={() => { setShowCreateModal(false); setEditingTemplate(null); resetForm(); }}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Sprint 0 Summary"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Comprehensive project foundation document..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Scope"
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
              options={[
                { value: 'personal', label: 'Personal (only you)' },
                { value: 'org', label: 'Organization (shared with team)' }
              ]}
            />

            <Select
              label="Output Format"
              value={formData.output_format}
              onChange={(e) => setFormData({ ...formData, output_format: e.target.value as any })}
              options={[
                { value: 'markdown', label: 'Markdown' },
                { value: 'txt', label: 'Text' },
                { value: 'docx', label: 'Word Document' },
                { value: 'pdf', label: 'PDF' },
                { value: 'csv', label: 'CSV (Spreadsheet)' },
                { value: 'json', label: 'JSON (Structured Data)' }
              ]}
            />
          </div>

          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="sprint0, proposal, technical_scope"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Supported Output Formats
            </label>
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900">
              <div className="font-semibold mb-1">💡 Format Selection Guide:</div>
              <ul className="space-y-1 ml-4">
                <li><strong>Markdown/TXT:</strong> Best for readable documentation, notes, collaborative editing</li>
                <li><strong>PDF/DOCX:</strong> Best for formal deliverables, presentations, client-facing documents</li>
                <li><strong>CSV:</strong> Best for tabular data, requirements lists, tracking spreadsheets</li>
                <li><strong>JSON:</strong> Best for structured data, API integration, programmatic use</li>
              </ul>
              <div className="mt-2 text-blue-800">
                <strong>Tip:</strong> The LLM generates structured JSON first, then formats it for each selected type. Choose formats that match how this document will be used.
              </div>
            </div>
            <div className="flex flex-wrap gap-3 p-3 border border-gray-300 rounded-md bg-gray-50">
              {[
                { value: 'markdown', label: 'Markdown', desc: 'Collaborative docs' },
                { value: 'txt', label: 'Plain Text', desc: 'Simple reading' },
                { value: 'pdf', label: 'PDF', desc: 'Formal delivery' },
                { value: 'docx', label: 'Word', desc: 'Editable docs' },
                { value: 'csv', label: 'CSV', desc: 'Spreadsheet data' },
                { value: 'json', label: 'JSON', desc: 'Structured data' }
              ].map(format => (
                <label key={format.value} className="flex flex-col p-2 border border-gray-200 rounded cursor-pointer hover:bg-white transition-colors">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.supported_formats.includes(format.value)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...formData.supported_formats, format.value]
                          : formData.supported_formats.filter(f => f !== format.value);
                        setFormData({ ...formData, supported_formats: updated });
                      }}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-700 uppercase">{format.label}</div>
                      <div className="text-xs text-gray-500">{format.desc}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {formData.supported_formats.length === 0 && (
              <p className="text-xs text-red-600 mt-1">⚠️ Select at least one output format</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Prompt Template
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs space-y-3">
              <div>
                <p className="font-semibold text-gray-900 mb-2">📋 Basic Variables:</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-gray-700">
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{project_name}}'}</code> - Project name</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{project_description}}'}</code> - Description</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{transcript}}'}</code> - Project transcript</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{project_summary}}'}</code> - Full project info</div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">👥 Interview & Stakeholder Variables:</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-gray-700">
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{question_answers}}'}</code> - Q&A pairs with all responses</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{stakeholder_responses}}'}</code> - Same as question_answers</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{responses_by_category}}'}</code> - Q&A grouped by category</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{responses_by_stakeholder}}'}</code> - Q&A grouped by person</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{stakeholder_profiles}}'}</code> - Stakeholder details</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{stakeholders}}'}</code> - Same as profiles</div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-2">📁 Files & Questions:</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-gray-700">
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{uploads}}'}</code> - Uploaded files list</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{files}}'}</code> - Same as uploads</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{questions}}'}</code> - All questions</div>
                  <div><code className="bg-white px-2 py-0.5 rounded">{'{{question_list}}'}</code> - Same as questions</div>
                </div>
              </div>

              <p className="text-gray-600 pt-2 border-t border-blue-200">
                <strong>💡 Tip:</strong> The AI generates structured JSON with tables, callouts, priorities, and tags.
                Focus on <em>what content</em> to include, not formatting details.
              </p>
            </div>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={10}
              value={formData.prompt_template}
              onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
              placeholder="Example:

Generate a comprehensive Sprint 0 Summary document. Include:

1. Executive Summary - High-level project overview
2. Project Objectives - Clear, measurable goals
3. Stakeholder Insights - Key findings from interviews
4. Requirements Overview - Categorized by priority
5. Technical Considerations - Architecture and constraints
6. Risks & Assumptions - What needs validation
7. Next Steps - Recommended priorities

Project: {{project_name}}
Description: {{project_description}}

Stakeholder Input:
{{stakeholder_responses}}

Files:
{{uploads}}"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setShowCreateModal(false); setEditingTemplate(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              disabled={!formData.name || !formData.prompt_template || formData.supported_formats.length === 0}
            >
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
