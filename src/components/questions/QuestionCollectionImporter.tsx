import React, { useState, useEffect } from 'react';
import { Folder, Search, CheckCircle, Upload, Eye, Tag } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface QuestionCollectionImporterProps {
  projectId: string;
  onSuccess: () => void;
  currentUsage?: number;
  maxQuestions?: number;
}

interface QuestionCollection {
  id: string;
  name: string;
  description: string;
  scope: 'org' | 'personal';
  tags: string[];
  questions: Array<{
    text: string;
    category: string;
    target_roles: string[];
  }>;
  created_at: string;
}

export const QuestionCollectionImporter: React.FC<QuestionCollectionImporterProps> = ({
  projectId,
  onSuccess,
  currentUsage = 0,
  maxQuestions = 50
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'org' | 'personal'>('all');
  const [selectedCollection, setSelectedCollection] = useState<QuestionCollection | null>(null);
  const [viewingCollection, setViewingCollection] = useState<QuestionCollection | null>(null);

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

  useEffect(() => {
    if (showModal && user) {
      loadCollections();
    }
  }, [showModal, user]);

  const handleImport = async () => {
    if (!selectedCollection) return;

    const questionsToImport = selectedCollection.questions.length;
    const newTotal = currentUsage + questionsToImport;

    if (newTotal > maxQuestions) {
      alert(`Cannot import ${questionsToImport} questions. Would exceed limit (${newTotal}/${maxQuestions}). Upgrade your plan or reduce the number of questions.`);
      return;
    }

    setImporting(true);
    try {
      let successful = 0;
      let failed = 0;

      for (const question of selectedCollection.questions) {
        try {
          const { error } = await supabase
            .from('questions')
            .insert({
              project_id: projectId,
              text: question.text,
              category: question.category,
              target_roles: question.target_roles || []
            });

          if (error) throw error;
          successful++;
        } catch (error) {
          console.error('Error importing question:', error);
          failed++;
        }
      }

      if (successful > 0) {
        alert(`Successfully imported ${successful} questions${failed > 0 ? ` (${failed} failed)` : ''}!`);
        onSuccess();
        setShowModal(false);
        setSelectedCollection(null);
      } else {
        alert('Failed to import questions. Please try again.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch =
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesScope = scopeFilter === 'all' || collection.scope === scopeFilter;

    return matchesSearch && matchesScope;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Folder className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">Import from Question Collections</h4>
            <p className="text-sm text-gray-600">
              Add questions from your saved collections
            </p>
          </div>
        </div>
        <Button
          icon={Upload}
          onClick={() => setShowModal(true)}
          size="sm"
        >
          Import from Collection
        </Button>
      </div>

      {/* Usage Indicator */}
      {maxQuestions && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                Current Usage: {currentUsage} / {maxQuestions} questions
              </p>
              <div className="w-48 bg-blue-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (currentUsage / maxQuestions) * 100)}%` }}
                />
              </div>
            </div>
            <Badge variant="info">
              {maxQuestions - currentUsage} remaining
            </Badge>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCollection(null);
          setViewingCollection(null);
        }}
        title="Import Questions from Collection"
        size="xl"
      >
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search collections..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | 'org' | 'personal')}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Collections</option>
              <option value="org">Organization</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          {/* Collections List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading collections...
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No collections found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Create collections on the Question Collections page
                </p>
              </div>
            ) : (
              filteredCollections.map((collection) => (
                <Card
                  key={collection.id}
                  className={`cursor-pointer transition-all ${
                    selectedCollection?.id === collection.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {collection.name}
                        </h4>
                        <Badge variant={collection.scope === 'org' ? 'info' : 'default'}>
                          {collection.scope}
                        </Badge>
                        {selectedCollection?.id === collection.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>

                      {collection.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {collection.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{collection.questions.length} questions</span>
                        {collection.tags && collection.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {collection.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="default" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {collection.tags.length > 2 && (
                              <span className="text-xs">+{collection.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingCollection(collection);
                      }}
                    >
                      Preview
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setSelectedCollection(null);
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              icon={Upload}
              onClick={handleImport}
              loading={importing}
              disabled={!selectedCollection || importing}
            >
              Import {selectedCollection?.questions.length || 0} Questions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!viewingCollection}
        onClose={() => setViewingCollection(null)}
        title={viewingCollection?.name || 'Preview'}
        size="lg"
      >
        {viewingCollection && (
          <div className="space-y-4">
            {viewingCollection.description && (
              <p className="text-gray-600">{viewingCollection.description}</p>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {viewingCollection.questions.map((question, index) => (
                <Card key={index}>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="info">{question.category}</Badge>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{question.text}</p>
                  {question.target_roles && question.target_roles.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Target roles:</span>
                      {question.target_roles.map(role => (
                        <Badge key={role} variant="default" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setViewingCollection(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
