import React, { useState } from 'react';
import { Sparkles, Users, MessageSquare, CheckCircle, Loader } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { openAIService } from '../../services/openai';

interface AIInterviewRoundCreatorProps {
  project: any;
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
  project,
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
  const [assignAllQuestions, setAssignAllQuestions] = useState(true);

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
      console.log('📊 Assign all questions mode:', assignAllQuestions);

      const assignmentMode = assignAllQuestions
        ? 'MANDATORY: You MUST assign EVERY SINGLE question to at least one stakeholder. Every question ID must appear in at least one assignedQuestions array. Many questions should be assigned to MULTIPLE stakeholders to get diverse perspectives.'
        : 'Assign questions strategically based on relevance. Not all questions need to be assigned.';

      const prompt = `You are an expert business analyst conducting stakeholder interviews for requirements gathering.

=== PROJECT CONTEXT ===
Project Name: ${project?.name || 'Unknown'}
Project Type: ${project?.project_type || 'Not specified'}
Project Overview: ${project?.overview || 'No overview provided'}
Project Goals: ${project?.goals || 'No goals specified'}
Project Scope: ${project?.scope || 'Not defined'}
Project Timeline: ${project?.start_date ? `Starts ${project.start_date}` : 'Not scheduled'}${project?.end_date ? ` - Ends ${project.end_date}` : ''}
Project Status: ${project?.status || 'Unknown'}

=== INTERVIEW ROUND CONTEXT ===
Round Name: ${roundName}
Interview Type: ${interviewType}
Total Questions Available: ${questionsToAnalyze.length}

=== STAKEHOLDERS (USE THESE EXACT IDs) ===
${stakeholders.map(s => `ID: "${s.id}"
Name: ${s.name}
Role: ${s.role}
Department: ${s.department || 'Not specified'}
Experience: ${s.experience_years || 0} years
Contact: ${s.email || 'N/A'}
---`).join('\n')}

=== AVAILABLE QUESTIONS (${questionsToAnalyze.length} TOTAL - USE THESE EXACT IDs) ===
${questionsToAnalyze.map((q, idx) => `[${idx + 1}/${questionsToAnalyze.length}] ID: "${q.id}"
Category: ${q.category || 'General'}
Question: ${q.text}
${q.target_roles?.length ? `Suggested Target Roles: ${q.target_roles.join(', ')}` : ''}
${q.priority ? `Priority: ${q.priority}` : ''}
---`).join('\n')}

=== YOUR TASK ===
${assignmentMode}

Analyze the project context, stakeholder profiles, and ALL ${questionsToAnalyze.length} questions to create comprehensive interview assignments.

For EACH stakeholder, determine which questions they should answer based on:
1. Their role and department relative to the project type
2. Their experience level and the question complexity
3. The project goals and how this stakeholder can contribute
4. Whether the question targets their domain expertise
5. The interview type (${interviewType}) and what information is needed at this stage
6. Whether getting multiple perspectives on the same question would be valuable

=== ASSIGNMENT RULES ===
${assignAllQuestions ? `• ⚠️ CRITICAL: EVERY question must be assigned to at least one stakeholder
• ⚠️ VERIFY: Count that all ${questionsToAnalyze.length} question IDs appear in your output
` : ''}• Aim for 15-60+ questions per stakeholder (not just 5!)
• Strategic/overview questions → Ask 3-4 stakeholders for diverse perspectives
• Technical questions → Ask ALL relevant technical roles (engineers, architects, DevOps)
• Business process questions → Ask process owners, users, AND managers
• Department-specific questions → Ask that department AND cross-functional partners
• Risk/compliance questions → Ask leadership, legal, security, and affected teams
• User experience questions → Ask UX, product, customer success, AND end user representatives
• Budget/resource questions → Ask sponsors, department heads, finance, AND delivery teams
• Integration questions → Ask technical leads, business analysts, AND system owners
• Change management questions → Ask leadership, HR, training, AND affected user groups
• Requirements/scope questions → Ask product, business analysts, AND key stakeholders
• Testing/quality questions → Ask QA, engineers, AND business validators
• Timeline/milestone questions → Ask project managers, leads, AND dependent teams
• High-priority questions → Assign to 2-4 stakeholders for comprehensive coverage
• If unsure whether a stakeholder should answer → INCLUDE IT (better comprehensive than sparse)
• Consider secondary/indirect relevance - stakeholders often have valuable adjacent insights
• Don't cluster questions narrowly - distribute broadly across stakeholders

=== COVERAGE VERIFICATION ===
${assignAllQuestions ? `Before finalizing, verify:
1. Total unique questions assigned across all stakeholders = ${questionsToAnalyze.length}
2. Each question appears in at least one stakeholder's assignedQuestions array
3. Important questions appear in multiple stakeholders' assignments
4. Each stakeholder has a substantial number of questions (15+)` : 'Ensure good coverage across stakeholders and question categories'}

=== OUTPUT FORMAT ===
CRITICAL: Use the EXACT IDs from above (after "ID:"). Do NOT make up IDs or use numbers like "1", "2", "3".

Return a JSON array:
[
  {
    "stakeholderId": "exact_stakeholder_id_from_above",
    "stakeholderName": "stakeholder_name",
    "stakeholderRole": "stakeholder_role",
    "assignedQuestions": ["exact_question_id_1", "exact_question_id_2", ...],
    "reasoning": "Brief explanation of why these questions match this stakeholder's expertise and the project needs"
  }
]

Return ONLY the JSON array with NO additional text, markdown, or formatting.`;

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

      // Verify all questions are assigned if required
      if (assignAllQuestions) {
        const allAssignedQuestionIds = new Set<string>();
        validatedAssignments.forEach(assignment => {
          assignment.assignedQuestions.forEach(qId => allAssignedQuestionIds.add(qId));
        });

        const unassignedQuestions = questionsToAnalyze.filter(q => !allAssignedQuestionIds.has(q.id));

        console.log('📊 Assignment coverage:');
        console.log(`Total questions: ${questionsToAnalyze.length}`);
        console.log(`Questions assigned: ${allAssignedQuestionIds.size}`);
        console.log(`Unassigned questions: ${unassignedQuestions.length}`);

        if (unassignedQuestions.length > 0) {
          console.warn('⚠️ The following questions were not assigned:', unassignedQuestions.map(q => q.text.substring(0, 50)));
          const proceed = confirm(
            `Warning: ${unassignedQuestions.length} out of ${questionsToAnalyze.length} questions were not assigned by the AI.\n\n` +
            `Assigned: ${allAssignedQuestionIds.size}\n` +
            `Unassigned: ${unassignedQuestions.length}\n\n` +
            `Do you want to proceed anyway, or cancel and try again?`
          );
          if (!proceed) {
            setAnalyzing(false);
            return;
          }
        } else {
          console.log('✅ All questions successfully assigned!');
        }
      }

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

          <div className={`border rounded-lg p-4 ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assignAllQuestions}
                onChange={(e) => setAssignAllQuestions(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  Assign All Questions
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  When enabled, the AI will ensure EVERY question is assigned to at least one stakeholder. Many questions will be assigned to multiple stakeholders for diverse perspectives. Recommended for comprehensive discovery.
                </div>
              </div>
            </label>
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
