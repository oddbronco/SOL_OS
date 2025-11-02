import React, { useState } from 'react';
import { Sparkles, Users, MessageSquare, CheckCircle, Loader } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { openAIService } from '../../services/openai';

interface AIInterviewRoundCreatorProps {
  projectId: string;
  stakeholders: any[];
  questions: any[];
  questionCollections?: any[];
  onCreateRound: (assignments: InterviewRoundAssignment[]) => Promise<void>;
  onClose: () => void;
}

interface InterviewRoundAssignment {
  stakeholderId: string;
  stakeholderName: string;
  questionIds: string[];
  interviewName: string;
  interviewType: string;
}

interface AIAssignmentResult {
  stakeholderId: string;
  stakeholderName: string;
  stakeholderRole: string;
  assignedQuestions: string[];
  reasoning: string;
}

export const AIInterviewRoundCreator: React.FC<AIInterviewRoundCreatorProps> = ({
  projectId,
  stakeholders,
  questions,
  questionCollections = [],
  onCreateRound,
  onClose
}) => {
  const { isDark } = useTheme();
  const [roundName, setRoundName] = useState('');
  const [interviewType, setInterviewType] = useState('followup');
  const [sourceType, setSourceType] = useState<'all' | 'collection' | 'custom'>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assignments, setAssignments] = useState<AIAssignmentResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getQuestionsForAnalysis = () => {
    if (sourceType === 'all') {
      return questions;
    } else if (sourceType === 'collection' && selectedCollectionId) {
      return questions.filter(q => q.collection_id === selectedCollectionId);
    } else if (sourceType === 'custom') {
      return questions.filter(q => selectedQuestionIds.includes(q.id));
    }
    return [];
  };

  const handleAnalyzeWithAI = async () => {
    console.log('🚀 Starting AI analysis...');

    if (!roundName.trim()) {
      setError('Please enter a round name');
      return;
    }

    const questionsToAnalyze = getQuestionsForAnalysis();
    console.log('📋 Questions to analyze:', questionsToAnalyze.length);

    if (questionsToAnalyze.length === 0) {
      setError('Please select questions for this round');
      return;
    }

    if (stakeholders.length === 0) {
      setError('No stakeholders found in this project');
      return;
    }

    console.log('👥 Stakeholders:', stakeholders.length);
    setAnalyzing(true);
    setError(null);

    try {
      console.log('🤖 Calling OpenAI service...');
      const prompt = `You are an expert business analyst helping to assign interview questions to stakeholders.

Project Context:
Round Name: ${roundName}
Interview Type: ${interviewType}

Stakeholders:
${stakeholders.map((s, i) => `${i + 1}. ${s.name} - ${s.role} (${s.department}, ${s.experience_years || 0} years experience)`).join('\n')}

Available Questions (${questionsToAnalyze.length}):
${questionsToAnalyze.map((q, i) => `${i + 1}. [${q.category || 'General'}] ${q.text}${q.target_roles?.length ? ` (Target: ${q.target_roles.join(', ')})` : ''}`).join('\n')}

Task: Assign questions to stakeholders based on their roles, departments, and the question content.

Rules:
1. Some questions should be asked to MULTIPLE stakeholders (especially general/strategic questions)
2. Technical questions should go to technical roles
3. Business questions should go to business stakeholders
4. Department-specific questions should go to relevant departments
5. Consider experience level when assigning complex questions
6. Every stakeholder should receive at least 3-5 questions
7. Strategic questions should be asked to senior roles and leadership

Return a JSON array with this exact structure:
[
  {
    "stakeholderId": "stakeholder_id_here",
    "stakeholderName": "name",
    "stakeholderRole": "role",
    "assignedQuestions": ["question_id_1", "question_id_2", ...],
    "reasoning": "Brief explanation of why these questions were assigned"
  }
]

Use the exact stakeholder IDs and question IDs provided. Return ONLY the JSON array, no additional text.`;

      const response = await openAIService.chat([
        { role: 'system', content: 'You are an expert business analyst. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      console.log('✅ Got response from OpenAI');
      console.log('Response preview:', response.substring(0, 200));

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('❌ Could not find JSON array in response:', response);
        throw new Error('Could not parse AI response');
      }

      console.log('📦 Parsing JSON assignments...');
      const aiAssignments: AIAssignmentResult[] = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed assignments:', aiAssignments.length);

      const validatedAssignments = aiAssignments.map(assignment => {
        const stakeholder = stakeholders.find(s => s.id === assignment.stakeholderId);
        if (!stakeholder) {
          console.warn('Stakeholder not found:', assignment.stakeholderId);
          return null;
        }

        const validQuestionIds = assignment.assignedQuestions.filter(qId =>
          questionsToAnalyze.some(q => q.id === qId)
        );

        return {
          ...assignment,
          stakeholderId: stakeholder.id,
          stakeholderName: stakeholder.name,
          stakeholderRole: stakeholder.role,
          assignedQuestions: validQuestionIds
        };
      }).filter(Boolean) as AIAssignmentResult[];

      setAssignments(validatedAssignments);

    } catch (err) {
      console.error('❌ Error analyzing with AI:', err);
      console.error('Error type:', typeof err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      let errorMessage = 'Failed to analyze questions';

      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);

        if (err.message.includes('API key')) {
          errorMessage = 'OpenAI API key is not configured. Please add your API key in Settings.';
        } else if (err.message.includes('quota') || err.message.includes('insufficient_quota')) {
          errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account.';
        } else {
          errorMessage = err.message;
        }
      }

      console.error('Setting error message:', errorMessage);
      setError(errorMessage);
      alert(`Error: ${errorMessage}`); // Also show an alert to make sure you see it
    } finally {
      console.log('⏹️ Analysis complete, setting analyzing to false');
      setAnalyzing(false);
    }
  };

  const handleCreateRound = async () => {
    if (assignments.length === 0) {
      setError('Please analyze questions first');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const roundAssignments: InterviewRoundAssignment[] = assignments.map(a => ({
        stakeholderId: a.stakeholderId,
        stakeholderName: a.stakeholderName,
        questionIds: a.assignedQuestions,
        interviewName: `${roundName} - ${a.stakeholderName}`,
        interviewType
      }));

      await onCreateRound(roundAssignments);
      onClose();
    } catch (err) {
      console.error('Error creating round:', err);
      setError(err instanceof Error ? err.message : 'Failed to create interview round');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              AI Interview Round Creator
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Let AI intelligently assign questions to stakeholders
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Round Name
            </label>
            <Input
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="e.g., Technical Deep Dive Round 2"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Interview Type
            </label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="kickoff">Kickoff</option>
              <option value="technical">Technical</option>
              <option value="followup">Follow-up</option>
              <option value="change_request">Change Request</option>
              <option value="post_project">Post-Project</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Question Source
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="all">All Project Questions ({questions.length})</option>
              <option value="collection">From Collection</option>
              <option value="custom">Custom Selection</option>
            </select>
          </div>

          {sourceType === 'collection' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Collection
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">Choose a collection...</option>
                {questionCollections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} ({collection.questions?.length || 0} questions)
                  </option>
                ))}
              </select>
            </div>
          )}

          {sourceType === 'custom' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Questions ({selectedQuestionIds.length} selected)
              </label>
              <div className={`border rounded-lg p-4 max-h-64 overflow-y-auto ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                {questions.map(question => (
                  <label key={question.id} className="flex items-start space-x-3 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestionIds([...selectedQuestionIds, question.id]);
                        } else {
                          setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== question.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {question.text}
                      </div>
                      {question.category && (
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          {question.category}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 BUTTON CLICKED!');
              handleAnalyzeWithAI();
            }}
            icon={analyzing ? Loader : Sparkles}
            disabled={analyzing || !roundName.trim()}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
          >
            {analyzing ? 'Analyzing...' : 'Analyze & Assign with AI'}
          </Button>
        </div>
      </Card>

      {assignments.length > 0 && (
        <Card>
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            AI Assignment Results
          </h4>
          <div className="space-y-4">
            {assignments.map((assignment, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <h5 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {assignment.stakeholderName}
                      </h5>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {assignment.stakeholderRole}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {assignment.assignedQuestions.length} questions
                    </span>
                  </div>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  {assignment.reasoning}
                </p>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Questions: {assignment.assignedQuestions.slice(0, 3).map(qId => {
                    const q = questions.find(qu => qu.id === qId);
                    return q?.text?.substring(0, 50) || '';
                  }).join(', ')}
                  {assignment.assignedQuestions.length > 3 && '...'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex space-x-3">
            <Button
              onClick={handleCreateRound}
              icon={creating ? Loader : CheckCircle}
              disabled={creating}
              className="flex-1"
            >
              {creating ? 'Creating Round...' : `Create ${assignments.length} Interviews`}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
