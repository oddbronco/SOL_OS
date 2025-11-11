import {
  prepareQuestionAnswerPairs,
  prepareStakeholderProfiles,
  prepareUploadedFiles,
  prepareProjectSummary,
  formatQuestionAnswersForPrompt,
  formatStakeholdersForPrompt,
  formatUploadsForPrompt,
  formatProjectForPrompt,
  groupResponsesByCategory,
  groupResponsesByStakeholder
} from './documentDataPrep';

export interface AIContextData {
  project?: any;
  client?: any;
  stakeholders?: any[];
  responses?: any[];
  uploads?: any[];
  questions?: any[];
  sessions?: any[];
  documentRuns?: any[];
  templates?: any[];
  exports?: any[];
}

export interface FormattedAIContext {
  projectSummary: string;
  stakeholderProfiles: string;
  interviewData: string;
  interviewByCategory: string;
  interviewByStakeholder: string;
  uploadedFiles: string;
  questionList: string;
  sessionsSummary: string;
  documentRunsSummary: string;
  exportsSummary: string;
  fullContext: string;
}

export const buildAIContext = (data: AIContextData): FormattedAIContext => {
  const projectSummary = data.project
    ? formatProjectForPrompt(prepareProjectSummary(data.project, data.client))
    : 'No project information available.';

  const stakeholderProfiles = data.stakeholders && data.responses
    ? formatStakeholdersForPrompt(prepareStakeholderProfiles(data.stakeholders, data.responses))
    : 'No stakeholder information available.';

  let interviewData = 'No interview responses available.';
  let interviewByCategory = 'No responses available.';
  let interviewByStakeholder = 'No responses available.';

  if (data.responses && data.responses.length > 0) {
    const qaPairs = prepareQuestionAnswerPairs(data.responses);
    interviewData = formatQuestionAnswersForPrompt(qaPairs);

    const byCategory = groupResponsesByCategory(qaPairs);
    interviewByCategory = Object.entries(byCategory)
      .map(([cat, pairs]) => `\n### ${cat}\n${formatQuestionAnswersForPrompt(pairs)}`)
      .join('\n');

    const byStakeholder = groupResponsesByStakeholder(data.responses);
    interviewByStakeholder = Object.entries(byStakeholder)
      .map(([name, resps]) => {
        const pairs = prepareQuestionAnswerPairs(resps);
        return `\n### ${name}\n${formatQuestionAnswersForPrompt(pairs)}`;
      })
      .join('\n');
  }

  const uploadedFiles = data.uploads && data.uploads.length > 0
    ? formatUploadsForPrompt(prepareUploadedFiles(data.uploads))
    : 'No files uploaded.';

  const questionList = data.questions && data.questions.length > 0
    ? data.questions.map(q => `- [${q.category}] ${q.text} (Created: ${new Date(q.created_at).toLocaleString()})`).join('\n')
    : 'No questions available.';

  // Format interview sessions
  const sessionsSummary = data.sessions && data.sessions.length > 0
    ? data.sessions.map(s => {
        const status = s.completed_at ? 'Completed' : 'In Progress';
        const progress = s.total_questions > 0 ? `${s.answered_questions}/${s.total_questions} answered (${Math.round((s.answered_questions / s.total_questions) * 100)}%)` : 'No questions';
        return `- Session: ${s.title || 'Untitled'}\n  Status: ${status}\n  Progress: ${progress}\n  Started: ${new Date(s.created_at).toLocaleString()}${s.completed_at ? `\n  Completed: ${new Date(s.completed_at).toLocaleString()}` : ''}\n  Access Code: ${s.access_code}`;
      }).join('\n\n')
    : 'No interview sessions created yet.';

  // Format document runs
  const documentRunsSummary = data.documentRuns && data.documentRuns.length > 0
    ? data.documentRuns.map(run => {
        const template = run.document_templates;
        const duration = run.processing_time_seconds ? `${run.processing_time_seconds}s` : 'N/A';
        return `- Document: ${template?.name || 'Unknown Template'}\n  Format: ${template?.output_format || 'N/A'}\n  Status: ${run.status}\n  Created: ${new Date(run.created_at).toLocaleString()}${run.completed_at ? `\n  Completed: ${new Date(run.completed_at).toLocaleString()}` : ''}\n  Processing Time: ${duration}`;
      }).join('\n\n')
    : 'No documents generated yet.';

  // Format exports
  const exportsSummary = data.exports && data.exports.length > 0
    ? data.exports.map(exp => {
        return `- Export: ${exp.export_type}\n  Format: ${exp.format}\n  Status: ${exp.status}\n  Created: ${new Date(exp.created_at).toLocaleString()}${exp.completed_at ? `\n  Completed: ${new Date(exp.completed_at).toLocaleString()}` : ''}`;
      }).join('\n\n')
    : 'No exports created yet.';

  const fullContext = `
PROJECT INFORMATION:
${projectSummary}

STAKEHOLDER TEAM:
${stakeholderProfiles}

INTERVIEW SESSIONS:
${sessionsSummary}

INTERVIEW RESPONSES (Q&A Format with Timestamps):
${interviewData}

UPLOADED DOCUMENTS & FILES:
${uploadedFiles}

QUESTIONS ASKED:
${questionList}

GENERATED DOCUMENTS:
${documentRunsSummary}

PROJECT EXPORTS:
${exportsSummary}
`.trim();

  return {
    projectSummary,
    stakeholderProfiles,
    interviewData,
    interviewByCategory,
    interviewByStakeholder,
    uploadedFiles,
    questionList,
    sessionsSummary,
    documentRunsSummary,
    exportsSummary,
    fullContext
  };
};

export const buildSidekickPrompt = (userQuery: string, context: FormattedAIContext): string => {
  return `You are the Project Sidekick, an AI assistant with comprehensive access to this software project's complete data.

You have access to:
- Project overview and timeline information
- Complete stakeholder profiles with roles and departments
- All interview sessions with progress tracking
- Interview responses with timestamps showing who said what and when
- Uploaded documents and files with their content
- All questions that have been asked
- Generated documents and their status
- Project exports and their formats

${context.fullContext}

---

USER QUESTION:
${userQuery}

INSTRUCTIONS:
- Provide helpful, detailed responses based on the project data above
- When referencing data, cite specific sources (e.g., "According to John Smith's response on 1/15/2025...")
- Include relevant timestamps when discussing events or responses
- If analyzing trends, compare responses across different stakeholders or time periods
- If the user asks about progress or status, reference the specific metrics and dates
- If information is missing, suggest what additional data would be helpful
- Be conversational but precise - use the actual data to support your answers`;
};

export const buildQuestionGeneratorPrompt = (
  category: string,
  count: number,
  context: FormattedAIContext
): string => {
  return `You are generating interview questions for a software project.

${context.fullContext}

EXISTING QUESTIONS:
${context.questionList}

TASK:
Generate ${count} new, insightful interview questions for the "${category}" category.

REQUIREMENTS:
- Questions should be open-ended and encourage detailed responses
- Avoid duplicating existing questions
- Questions should be relevant to the project context
- Focus on gathering actionable information
- Consider what stakeholders have already shared

Return ONLY a JSON array of question objects in this format:
[
  {
    "text": "Question text here?",
    "category": "${category}",
    "priority": "high"
  }
]`;
};

export const buildDocumentAnalysisPrompt = (
  documentType: string,
  context: FormattedAIContext
): string => {
  return `Analyze the project information and create a ${documentType}.

${context.fullContext}

Based on all available project information, stakeholder feedback, and uploaded documents, create a comprehensive ${documentType} that synthesizes all the key information into a useful deliverable.`;
};
