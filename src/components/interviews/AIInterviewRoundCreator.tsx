import React, { useState } from 'react';
import { Sparkles, Users, MessageSquare, CheckCircle, Loader } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { openAIService } from '../../services/openai';
import { supabase } from '../../lib/supabase';

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

// Helper function to process a chunk of questions
async function processQuestionChunk(
  questions: any[],
  stakeholders: any[],
  project: any,
  roundName: string,
  interviewType: string,
  assignAllQuestions: boolean,
  chunkNum: number,
  totalChunks: number
): Promise<AIAssignmentResult[]> {
  const assignmentMode = assignAllQuestions
    ? `MANDATORY: Assign EVERY question in this chunk to at least one stakeholder. All ${questions.length} questions must appear in the output.`
    : 'Assign questions strategically based on relevance.';

  const prompt = `Assign questions to stakeholders for ${project?.name || 'Project'}.

STAKEHOLDERS (use EXACT IDs):
${stakeholders.map(s => `ID:"${s.id}"|${s.name}|${s.role}`).join('\n')}

QUESTIONS (use EXACT IDs):
${questions.map((q, idx) => `${idx + 1}. ID:"${q.id}"|${q.text.substring(0, 60)}`).join('\n')}

${assignmentMode}

Return valid JSON object with "assignments" array. NO explanations. CRITICAL: "reasoning" must be single line.

Format:
{"assignments":[{"stakeholderId":"id","stakeholderName":"name","stakeholderRole":"role","assignedQuestions":["q1","q2"],"reasoning":"why"}]}`;

  // Get API key for direct OpenAI call with JSON mode
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: settingsData } = await supabase
    .from('user_settings')
    .select('openai_api_key')
    .eq('user_id', user.id)
    .single();

  if (!settingsData?.openai_api_key) {
    throw new Error('OpenAI API key not configured');
  }

  const apiKey = settingsData.openai_api_key;

  const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Expert business analyst. Return ONLY valid JSON object with "assignments" array. No markdown. Keep "reasoning" single line with no newlines.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,  // Very low for consistent, deterministic output
      max_tokens: 3000,
      response_format: { type: "json_object" }  // Force strict JSON mode
    })
  });

  if (!apiResponse.ok) {
    throw new Error(`OpenAI API error: ${apiResponse.statusText}`);
  }

  const apiData = await apiResponse.json();
  const response = apiData.choices[0].message.content;

  console.log(`  Response length: ${response.length}`);

  // With JSON mode, response should already be valid JSON, but still clean it
  let jsonString = response.trim();

  // Ultra-aggressive JSON repair
  // 1. Remove trailing commas before } or ]
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

  // 2. Fix any newlines inside string values (they break JSON)
  // Match any string value and replace internal newlines with spaces
  jsonString = jsonString.replace(/"([^"]*?)"/g, (match, content) => {
    const cleaned = content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    return `"${cleaned}"`;
  });

  // 3. Remove any control characters that might break JSON
  jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, ' ');

  // 4. Fix missing quotes on keys (shouldn't happen with JSON mode but just in case)
  jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

  // 5. Remove any markdown artifacts
  jsonString = jsonString.replace(/```json|```/g, '');

  console.log(`  Cleaned JSON length: ${jsonString.length}`);

  try {
    const parsedObj = JSON.parse(jsonString);
    const parsed: AIAssignmentResult[] = parsedObj.assignments || parsedObj;  // Handle both formats

    if (!Array.isArray(parsed)) {
      throw new Error('Response did not contain assignments array');
    }

    console.log(`  ✅ Parsed ${parsed.length} stakeholder assignments`);
    return parsed;
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    console.error('Failed JSON (full):', jsonString);

    // Extract position from error if available
    const posMatch = parseError instanceof Error ? parseError.message.match(/position (\d+)/) : null;
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const start = Math.max(0, pos - 300);
      const end = Math.min(jsonString.length, pos + 300);
      console.error('Failed JSON (around error position):', jsonString.substring(start, end));
      console.error('Character at error position:', jsonString.charAt(pos), 'Code:', jsonString.charCodeAt(pos));
    }

    // Try to repair and retry - try truncating at last valid closing brace
    console.log('  🔧 Attempting JSON repair by truncation...');

    try {
      // Try to find the last complete object/array
      let repaired = jsonString;

      // If we have the error position, try truncating and completing the JSON
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        // Truncate before the error and try to close the JSON properly
        const beforeError = jsonString.substring(0, pos);

        // Count open braces/brackets to determine what to close
        const openBraces = (beforeError.match(/{/g) || []).length - (beforeError.match(/}/g) || []).length;
        const openBrackets = (beforeError.match(/\[/g) || []).length - (beforeError.match(/]/g) || []).length;

        // Try to complete the JSON
        repaired = beforeError.replace(/,\s*$/, ''); // Remove trailing comma
        repaired += '}]'.repeat(Math.max(openBrackets, 0)) + '}'.repeat(Math.max(openBraces, 0));

        console.log('  Attempting truncated parse...');
      }

      const parsedObj = JSON.parse(repaired);
      const parsed: AIAssignmentResult[] = parsedObj.assignments || parsedObj;

      if (!Array.isArray(parsed)) {
        throw new Error('Response did not contain assignments array');
      }

      console.log(`  ✅ Successfully repaired and parsed ${parsed.length} assignments!`);
      return parsed;
    } catch (repairError) {
      console.error('❌ Repair attempt failed:', repairError);
      const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid JSON';
      throw new Error(`JSON parse failed at position ${posMatch ? posMatch[1] : 'unknown'}: ${errorMsg}. The AI response was malformed. Try reducing chunk size or running again.`);
    }
  }
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
      console.log('🤖 Starting AI question assignment...');
      console.log('📊 Total questions:', questionsToAnalyze.length);
      console.log('📊 Assign all questions mode:', assignAllQuestions);

      // Process in chunks of 30 questions to avoid token limits and malformed JSON
      const CHUNK_SIZE = 30;
      const shouldChunk = questionsToAnalyze.length > CHUNK_SIZE;

      let allAIAssignments: AIAssignmentResult[] = [];

      if (shouldChunk) {
        console.log(`⚡ Processing ${questionsToAnalyze.length} questions in chunks of ${CHUNK_SIZE}`);

        // Split questions into chunks
        const questionChunks: any[][] = [];
        for (let i = 0; i < questionsToAnalyze.length; i += CHUNK_SIZE) {
          questionChunks.push(questionsToAnalyze.slice(i, i + CHUNK_SIZE));
        }

        console.log(`📦 Created ${questionChunks.length} chunks`);

        // Process each chunk
        for (let chunkIndex = 0; chunkIndex < questionChunks.length; chunkIndex++) {
          const chunk = questionChunks[chunkIndex];
          console.log(`\n🔄 Processing chunk ${chunkIndex + 1}/${questionChunks.length} (${chunk.length} questions)`);

          const chunkAssignments = await processQuestionChunk(
            chunk,
            stakeholders,
            project,
            roundName,
            interviewType,
            assignAllQuestions,
            chunkIndex + 1,
            questionChunks.length
          );

          // Merge assignments by stakeholder
          chunkAssignments.forEach(newAssignment => {
            const existingAssignment = allAIAssignments.find(
              a => a.stakeholderId === newAssignment.stakeholderId
            );

            if (existingAssignment) {
              // Merge question IDs (avoid duplicates)
              const combinedQuestions = [...existingAssignment.assignedQuestions, ...newAssignment.assignedQuestions];
              existingAssignment.assignedQuestions = Array.from(new Set(combinedQuestions));
              existingAssignment.reasoning += ` | ${newAssignment.reasoning}`;
            } else {
              allAIAssignments.push(newAssignment);
            }
          });

          console.log(`✅ Chunk ${chunkIndex + 1} complete. Total assignments so far: ${allAIAssignments.length}`);
        }

        console.log(`\n✅ All chunks processed! Total assignments: ${allAIAssignments.length}`);
      } else {
        // Process all questions at once if under the chunk size
        console.log('📝 Processing all questions in a single request');
        allAIAssignments = await processQuestionChunk(
          questionsToAnalyze,
          stakeholders,
          project,
          roundName,
          interviewType,
          assignAllQuestions,
          1,
          1
        );
      }

      const aiAssignments = allAIAssignments;

      // Validate assignments
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
      // Don't alert - just display the error in the UI
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
