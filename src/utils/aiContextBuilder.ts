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
}

export interface FormattedAIContext {
  projectSummary: string;
  stakeholderProfiles: string;
  interviewData: string;
  interviewByCategory: string;
  interviewByStakeholder: string;
  uploadedFiles: string;
  questionList: string;
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
    ? data.questions.map(q => `- [${q.category}] ${q.text}`).join('\n')
    : 'No questions available.';

  const fullContext = `
PROJECT INFORMATION:
${projectSummary}

STAKEHOLDER TEAM:
${stakeholderProfiles}

INTERVIEW RESPONSES (Q&A Format):
${interviewData}

UPLOADED DOCUMENTS & FILES:
${uploadedFiles}

QUESTIONS ASKED:
${questionList}
`.trim();

  return {
    projectSummary,
    stakeholderProfiles,
    interviewData,
    interviewByCategory,
    interviewByStakeholder,
    uploadedFiles,
    questionList,
    fullContext
  };
};

export const buildSidekickPrompt = (userQuery: string, context: FormattedAIContext): string => {
  return `You are an AI assistant helping with a software project. You have access to comprehensive project information including stakeholder interviews, uploaded documents, and project details.

${context.fullContext}

USER QUESTION:
${userQuery}

Provide a helpful, detailed response based on the project context above. If the context contains relevant information, reference it specifically. If you need more information that isn't in the context, let the user know what additional details would be helpful.`;
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
