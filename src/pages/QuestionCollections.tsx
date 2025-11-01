import React, { useState, useEffect } from 'react';
import { Plus, Search, Folder, Tag, Users, Edit, Trash2, Copy, Upload, CheckSquare, Square, Eye, Download, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface QuestionCollection {
  id: string;
  customer_id: string;
  created_by: string;
  scope: 'org' | 'personal';
  name: string;
  description: string;
  tags: string[];
  questions: Array<{
    text: string;
    category: string;
    target_roles: string[];
    response_type?: string;
  }>;
  version: number;
  created_at: string;
  updated_at: string;
}

export const QuestionCollections: React.FC = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'org' | 'personal'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<QuestionCollection | null>(null);
  const [viewingCollection, setViewingCollection] = useState<QuestionCollection | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'personal' as 'org' | 'personal',
    tags: '',
    questions: [{ text: '', category: '', target_roles: [] as string[] }]
  });

  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user]);

  const loadCollections = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!user) return;

    if (!formData.name.trim()) {
      alert('Please enter a collection name');
      return;
    }

    if (formData.questions.every(q => !q.text.trim())) {
      alert('Please add at least one question');
      return;
    }

    if (!user.customerId) {
      alert('Customer ID not found. Please try logging out and back in.');
      return;
    }

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      const { data, error } = await supabase
        .from('question_collections')
        .insert({
          customer_id: user.customerId,
          created_by: user.id,
          scope: formData.scope,
          name: formData.name,
          description: formData.description,
          tags,
          questions: formData.questions.filter(q => q.text.trim())
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error creating collection: ${error.message}`);
        return;
      }

      setCollections([data, ...collections]);
      setShowCreateModal(false);
      resetForm();
      alert('Collection created successfully!');
    } catch (error: any) {
      console.error('Error creating collection:', error);
      alert(`Error: ${error.message || 'Failed to create collection'}`);
    }
  };

  const handleUpdateCollection = async () => {
    if (!user || !editingCollection) return;

    if (!formData.name.trim()) {
      alert('Please enter a collection name');
      return;
    }

    if (formData.questions.every(q => !q.text.trim())) {
      alert('Please add at least one question');
      return;
    }

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      const { data, error } = await supabase
        .from('question_collections')
        .update({
          name: formData.name,
          description: formData.description,
          tags,
          questions: formData.questions.filter(q => q.text.trim()),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCollection.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error updating collection: ${error.message}`);
        return;
      }

      setCollections(collections.map(c => c.id === data.id ? data : c));
      setEditingCollection(null);
      resetForm();
      alert('Collection updated successfully!');
    } catch (error: any) {
      console.error('Error updating collection:', error);
      alert(`Error: ${error.message || 'Failed to update collection'}`);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection?')) return;

    try {
      const { error } = await supabase
        .from('question_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCollections(collections.filter(c => c.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected collection(s)?`)) return;

    try {
      const { error } = await supabase
        .from('question_collections')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      setCollections(collections.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error bulk deleting collections:', error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCollections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCollections.map(c => c.id)));
    }
  };

  const handleEditClick = (collection: QuestionCollection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      scope: collection.scope,
      tags: collection.tags.join(', '),
      questions: collection.questions.length > 0
        ? collection.questions
        : [{ text: '', category: '', target_roles: [] }]
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scope: 'personal',
      tags: '',
      questions: [{ text: '', category: '', target_roles: [] }]
    });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { text: '', category: '', target_roles: [] }]
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...formData.questions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, questions: updated });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file must have a header row and at least one question');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const textIndex = headers.findIndex(h => h === 'question' || h === 'text');
      const categoryIndex = headers.findIndex(h => h === 'category');
      const rolesIndex = headers.findIndex(h => h === 'target_roles' || h === 'roles');

      if (textIndex === -1) {
        alert('CSV must have a "question" or "text" column');
        return;
      }

      const questions = lines.slice(1).map(line => {
        const values = parseCSVLine(line).map(v => v.trim().replace(/^"|"$/g, ''));
        return {
          text: values[textIndex] || '',
          category: categoryIndex !== -1 ? values[categoryIndex] : '',
          target_roles: rolesIndex !== -1
            ? values[rolesIndex].split(';').map(r => r.trim()).filter(Boolean)
            : []
        };
      }).filter(q => q.text);

      // Replace empty first question or append to existing questions
      const hasEmptyFirstQuestion = formData.questions.length === 1 &&
                                    !formData.questions[0].text.trim() &&
                                    !formData.questions[0].category.trim();

      setFormData({
        ...formData,
        questions: hasEmptyFirstQuestion ? questions : [...formData.questions, ...questions]
      });

      alert(`Imported ${questions.length} questions from CSV`);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const downloadCSVTemplate = () => {
    const csv = `question,category,target_roles
"What are the main goals of this project?","Business","Product Manager;Stakeholder"
"What is the timeline for completion?","Planning","Project Manager"
"What are the technical requirements?","Technical","Developer;Architect"`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_collection_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScope = scopeFilter === 'all' || collection.scope === scopeFilter;
    return matchesSearch && matchesScope;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f4f8' }}>
      <div className="border-b px-6 py-4 border-gray-200" style={{ backgroundColor: '#f0f4f8' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Collections</h1>
            <p className="mt-1 text-gray-600">{collections.length} collections</p>
          </div>
          <Button icon={Plus} onClick={() => { resetForm(); setShowCreateModal(true); }}>
            New Collection
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex gap-4">
          <Input
            placeholder="Search collections..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Collections' },
              { value: 'org', label: 'Organization' },
              { value: 'personal', label: 'Personal' }
            ]}
            className="w-48"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} collection{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading collections...</div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No collections found</h3>
            <p className="mb-4 text-gray-600">Create your first question collection</p>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              Create Collection
            </Button>
          </div>
        ) : (
          <>
            {filteredCollections.length > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {selectedIds.size === filteredCollections.length ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select All
                </button>
                <span className="text-sm text-gray-600">
                  {filteredCollections.length} collection{filteredCollections.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <Card key={collection.id} className={`hover:shadow-md transition-shadow ${selectedIds.has(collection.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleSelection(collection.id)}
                        className="flex-shrink-0"
                      >
                        {selectedIds.has(collection.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={() => setViewingCollection(collection)}
                        className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors"
                      >
                        <Folder className="h-5 w-5 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setViewingCollection(collection)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900">{collection.name}</h3>
                        <Badge variant={collection.scope === 'org' ? 'info' : 'default'}>
                          {collection.scope === 'org' ? 'Organization' : 'Personal'}
                        </Badge>
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingCollection(collection)}
                        className="text-gray-600 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditClick(collection)}
                        className="text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {collection.scope === 'personal' && (
                        <button
                          onClick={() => handleDeleteCollection(collection.id)}
                          className="text-gray-600 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                {collection.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{collection.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    {collection.questions.length} questions
                  </div>
                  {collection.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-gray-400" />
                      {collection.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                      ))}
                      {collection.tags.length > 3 && (
                        <Badge variant="default" size="sm">+{collection.tags.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showCreateModal || !!editingCollection}
        onClose={() => { setShowCreateModal(false); setEditingCollection(null); resetForm(); }}
        title={editingCollection ? 'Edit Collection' : 'Create Collection'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Collection Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Website Discovery Questions"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Questions for website redesign projects..."
            />
          </div>

          <Select
            label="Scope"
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
            options={[
              { value: 'personal', label: 'Personal (only you)' },
              { value: 'org', label: 'Organization (shared with team)' }
            ]}
          />

          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="website, discovery, technical"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Questions</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadCSVTemplate}
                >
                  Download CSV Template
                </Button>
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </span>
                </label>
                <Button size="sm" onClick={addQuestion}>Add Question</Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="text-blue-800 font-medium mb-1">CSV Format:</p>
              <p className="text-blue-700">
                Required: <code className="bg-blue-100 px-1 rounded">question</code> or <code className="bg-blue-100 px-1 rounded">text</code>
              </p>
              <p className="text-blue-700">
                Optional: <code className="bg-blue-100 px-1 rounded">category</code>, <code className="bg-blue-100 px-1 rounded">target_roles</code> (semicolon-separated)
              </p>
            </div>

            {formData.questions.map((question, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Question text..."
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Category (e.g., Technical)"
                        value={question.category}
                        onChange={(e) => updateQuestion(index, 'category', e.target.value)}
                      />
                      <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Target roles (comma-separated)"
                        value={question.target_roles.join(', ')}
                        onChange={(e) => updateQuestion(index, 'target_roles', e.target.value.split(',').map(r => r.trim()))}
                      />
                    </div>
                  </div>
                  {formData.questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(index)}
                      className="ml-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setShowCreateModal(false); setEditingCollection(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
              disabled={!formData.name || formData.questions.every(q => !q.text.trim())}
            >
              {editingCollection ? 'Update' : 'Create'} Collection
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Collection Modal */}
      {viewingCollection && (
        <Modal
          isOpen={true}
          onClose={() => setViewingCollection(null)}
          title={viewingCollection.name}
          size="xl"
        >
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <Badge variant={viewingCollection.scope === 'org' ? 'info' : 'default'}>
                    {viewingCollection.scope === 'org' ? 'Organization' : 'Personal'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {viewingCollection.questions.length} questions
                  </span>
                </div>
                {viewingCollection.description && (
                  <p className="text-gray-700">{viewingCollection.description}</p>
                )}
                {viewingCollection.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-gray-400" />
                    {viewingCollection.tags.map(tag => (
                      <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Download}
                  onClick={() => {
                    const csv = [
                      'text,category,target_roles',
                      ...viewingCollection.questions.map(q =>
                        `"${q.text}","${q.category}","${(q.target_roles || []).join(';')}"`
                      )
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${viewingCollection.name.replace(/\s+/g, '_')}_questions.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Edit}
                  onClick={() => {
                    handleEditClick(viewingCollection);
                    setViewingCollection(null);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>

            {/* Questions List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Questions ({viewingCollection.questions.length})
              </h3>

              {viewingCollection.questions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No questions in this collection</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {viewingCollection.questions.map((question, index) => (
                    <Card key={index} className="bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-gray-500">
                                #{index + 1}
                              </span>
                              {question.category && (
                                <Badge variant="info" size="sm">
                                  {question.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-900">{question.text}</p>
                          </div>
                        </div>
                        {question.target_roles && question.target_roles.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                            <Users className="h-3 w-3 text-gray-400" />
                            <div className="flex gap-1 flex-wrap">
                              {question.target_roles.map((role, roleIndex) => (
                                <Badge key={roleIndex} variant="default" size="sm">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setViewingCollection(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
