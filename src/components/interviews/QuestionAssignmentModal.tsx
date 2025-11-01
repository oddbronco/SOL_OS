import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useInterviews } from '../../hooks/useInterviews';
import { useTheme } from '../../contexts/ThemeContext';

interface QuestionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeholder: any;
  project: any;
  questions: any[];
  onSuccess: () => void;
}

export const QuestionAssignmentModal: React.FC<QuestionAssignmentModalProps> = ({
  isOpen,
  onClose,
  stakeholder,
  project,
  questions,
  onSuccess
}) => {
  const { isDark } = useTheme();
  const { assignQuestionsToStakeholder, getStakeholderQuestionAssignments, createCustomQuestion } = useInterviews();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState({
    text: '',
    category: 'Custom',
    target_roles: [stakeholder?.role || '']
  });
  const [showAddCustom, setShowAddCustom] = useState(false);

  useEffect(() => {
    if (stakeholder && isOpen) {
      loadExistingAssignments();
    }
  }, [stakeholder, isOpen]);

  const loadExistingAssignments = async () => {
    if (!stakeholder) return;
    
    const assignments = await getStakeholderQuestionAssignments(stakeholder.id);
    setExistingAssignments(assignments);
    setSelectedQuestions(assignments.map(a => a.question_id));
  };

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!stakeholder || !project) {
      console.error('Missing stakeholder or project');
      return;
    }

    console.log('🔄 Saving question assignments:', {
      projectId: project.id,
      stakeholderId: stakeholder.id,
      questionCount: selectedQuestions.length,
      questionIds: selectedQuestions
    });

    setLoading(true);
    try {
      const success = await assignQuestionsToStakeholder(
        project.id,
        stakeholder.id,
        selectedQuestions
      );

      console.log('✅ Assignment result:', success);

      if (success) {
        alert('Questions assigned successfully!');
        onSuccess();
        onClose();
      } else {
        alert('Failed to assign questions. Please check the console for errors.');
      }
    } catch (error) {
      console.error('Failed to assign questions:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomQuestion = async () => {
    if (!project || !customQuestion.text.trim()) return;

    setLoading(true);
    try {
      // Create the question in the database
      const newQuestion = await createCustomQuestion(project.id, {
        text: customQuestion.text,
        category: customQuestion.category,
        target_roles: customQuestion.target_roles
      });

      if (newQuestion) {
        // Add to selected questions
        setSelectedQuestions(prev => [...prev, newQuestion.id]);

        // Reset form
        setCustomQuestion({
          text: '',
          category: 'Custom',
          target_roles: [stakeholder?.role || '']
        });
        setShowAddCustom(false);

        // Refresh the questions list
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create custom question:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizedQuestions = questions.reduce((acc, question) => {
    const category = question.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(question);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(categorizedQuestions).sort();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Questions - ${stakeholder?.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Stakeholder Info */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">{stakeholder?.name}</h4>
              <p className="text-sm text-blue-700">{stakeholder?.role} • {stakeholder?.department}</p>
              <p className="text-xs text-blue-600">{stakeholder?.email}</p>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {selectedQuestions.length} of {questions.length} questions selected
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddCustom(true)}
            >
              Add Custom Question
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedQuestions(questions.map(q => q.id))}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedQuestions([])}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Add Custom Question Form */}
        {showAddCustom && (
          <Card className="bg-primary-50 border-green-200">
            <h4 className="font-medium text-primary-900 mb-4">Add Custom Question</h4>
            <div className="space-y-4">
              <Input
                label="Question Text"
                value={customQuestion.text}
                onChange={(e) => setCustomQuestion({ ...customQuestion, text: e.target.value })}
                placeholder="What specific challenges do you face in your role?"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  value={customQuestion.category}
                  onChange={(e) => setCustomQuestion({ ...customQuestion, category: e.target.value })}
                  options={[
                    { value: 'Custom', label: 'Custom' },
                    { value: 'Business Goals', label: 'Business Goals' },
                    { value: 'Technical', label: 'Technical' },
                    { value: 'Process', label: 'Process' },
                    { value: 'Challenges', label: 'Challenges' }
                  ]}
                />
                
                <Input
                  label="Target Role"
                  value={customQuestion.target_roles[0]}
                  onChange={(e) => setCustomQuestion({ 
                    ...customQuestion, 
                    target_roles: [e.target.value] 
                  })}
                  placeholder={stakeholder?.role}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCustom(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddCustomQuestion}
                  disabled={!customQuestion.text}
                >
                  Add Question
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Questions by Category */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {categories.map(category => (
            <Card key={category}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">{category}</h4>
                <Badge variant="info">{categorizedQuestions[category].length} questions</Badge>
              </div>
              
              <div className="space-y-3">
                {categorizedQuestions[category].map(question => {
                  const isSelected = selectedQuestions.includes(question.id);
                  const hasResponse = existingAssignments.some(a => a.question_id === question.id && a.response);
                  
                  return (
                    <div
                      key={question.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleQuestionToggle(question.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleQuestionToggle(question.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{question.text}</p>
                            {question.target_roles && question.target_roles.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Target roles: {question.target_roles.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {hasResponse && (
                            <Badge variant="success" size="sm">
                              Answered
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge variant="info" size="sm">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSaveAssignments}
            loading={loading}
            icon={Save}
            disabled={selectedQuestions.length === 0}
          >
            Assign {selectedQuestions.length} Questions
          </Button>
        </div>
      </div>
    </Modal>
  );
};