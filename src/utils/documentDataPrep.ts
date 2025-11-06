export interface QuestionAnswerPair {
  question: string;
  category: string;
  priority?: string;
  answers: Array<{
    stakeholder: string;
    role?: string;
    department?: string;
    response: string;
    timestamp: string;
  }>;
}

export interface StakeholderProfile {
  name: string;
  role: string;
  department: string;
  email?: string;
  status: string;
  responseCount: number;
  completionRate: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: string;
  description?: string;
  uploadedDate: string;
}

export interface ProjectSummary {
  name: string;
  description: string;
  status: string;
  clientName?: string;
  startDate?: string;
  targetEndDate?: string;
  progress: number;
}

export const prepareQuestionAnswerPairs = (responses: any[]): QuestionAnswerPair[] => {
  const questionMap = new Map<string, QuestionAnswerPair>();

  responses.forEach(response => {
    const questionText = response.questions?.text || 'Unknown Question';
    const questionId = response.question_id || questionText;

    if (!questionMap.has(questionId)) {
      questionMap.set(questionId, {
        question: questionText,
        category: response.questions?.category || 'General',
        priority: response.questions?.priority,
        answers: []
      });
    }

    const pair = questionMap.get(questionId)!;
    pair.answers.push({
      stakeholder: response.stakeholders?.name || 'Unknown Stakeholder',
      role: response.stakeholders?.role,
      department: response.stakeholders?.department,
      response: response.response || 'No response provided',
      timestamp: new Date(response.created_at).toLocaleString()
    });
  });

  return Array.from(questionMap.values());
};

export const prepareStakeholderProfiles = (stakeholders: any[], responses: any[]): StakeholderProfile[] => {
  return stakeholders.map(stakeholder => {
    const stakeholderResponses = responses.filter(r => r.stakeholder_id === stakeholder.id);
    const totalQuestions = new Set(responses.map(r => r.question_id)).size;
    const answeredQuestions = new Set(stakeholderResponses.map(r => r.question_id)).size;

    return {
      name: stakeholder.name,
      role: stakeholder.role || 'N/A',
      department: stakeholder.department || 'N/A',
      email: stakeholder.email,
      status: stakeholder.status,
      responseCount: stakeholderResponses.length,
      completionRate: totalQuestions > 0
        ? `${Math.round((answeredQuestions / totalQuestions) * 100)}%`
        : '0%'
    };
  });
};

export const prepareUploadedFiles = (uploads: any[]): UploadedFile[] => {
  return uploads.map(upload => ({
    name: upload.file_name,
    type: upload.upload_type || 'Unknown',
    size: upload.file_size ? `${(upload.file_size / 1024).toFixed(2)} KB` : 'Unknown',
    description: upload.description,
    uploadedDate: new Date(upload.created_at).toLocaleDateString()
  }));
};

export const prepareProjectSummary = (project: any, client?: any): ProjectSummary => {
  return {
    name: project.name,
    description: project.description || 'No description provided',
    status: project.status || 'Active',
    clientName: client?.name,
    startDate: project.start_date ? new Date(project.start_date).toLocaleDateString() : undefined,
    targetEndDate: project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : undefined,
    progress: project.progress || 0
  };
};

export const formatQuestionAnswersForPrompt = (qaPairs: QuestionAnswerPair[]): string => {
  if (qaPairs.length === 0) return 'No interview responses available.';

  return qaPairs.map((qa, idx) => {
    let output = `\nQ${idx + 1}: ${qa.question}`;
    output += `\nCategory: ${qa.category}`;
    if (qa.priority) output += ` | Priority: ${qa.priority}`;
    output += `\nResponses (${qa.answers.length}):\n`;

    qa.answers.forEach((answer, ansIdx) => {
      output += `\n  ${ansIdx + 1}. ${answer.stakeholder}`;
      if (answer.role) output += ` (${answer.role})`;
      output += `:\n     "${answer.response}"`;
      output += `\n     Answered: ${answer.timestamp}\n`;
    });

    return output;
  }).join('\n---\n');
};

export const formatStakeholdersForPrompt = (profiles: StakeholderProfile[]): string => {
  if (profiles.length === 0) return 'No stakeholders assigned.';

  return profiles.map((profile, idx) =>
    `${idx + 1}. ${profile.name} - ${profile.role} (${profile.department})
   Email: ${profile.email || 'N/A'}
   Status: ${profile.status}
   Responses: ${profile.responseCount}
   Completion: ${profile.completionRate}`
  ).join('\n\n');
};

export const formatUploadsForPrompt = (files: UploadedFile[]): string => {
  if (files.length === 0) return 'No files uploaded.';

  return files.map((file, idx) =>
    `${idx + 1}. ${file.name}
   Type: ${file.type}
   Size: ${file.size}
   ${file.description ? `Description: ${file.description}` : ''}
   Uploaded: ${file.uploadedDate}`
  ).join('\n\n');
};

export const formatProjectForPrompt = (project: ProjectSummary): string => {
  let output = `Project: ${project.name}\n`;
  output += `Description: ${project.description}\n`;
  output += `Status: ${project.status}`;

  if (project.progress !== undefined) {
    output += ` (${project.progress}% complete)`;
  }

  if (project.clientName) {
    output += `\nClient: ${project.clientName}`;
  }

  if (project.startDate) {
    output += `\nStart Date: ${project.startDate}`;
  }

  if (project.targetEndDate) {
    output += `\nTarget End: ${project.targetEndDate}`;
  }

  return output;
};

export const groupResponsesByCategory = (qaPairs: QuestionAnswerPair[]): Record<string, QuestionAnswerPair[]> => {
  const grouped: Record<string, QuestionAnswerPair[]> = {};

  qaPairs.forEach(qa => {
    if (!grouped[qa.category]) {
      grouped[qa.category] = [];
    }
    grouped[qa.category].push(qa);
  });

  return grouped;
};

export const groupResponsesByStakeholder = (responses: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};

  responses.forEach(response => {
    const stakeholderName = response.stakeholders?.name || 'Unknown';
    if (!grouped[stakeholderName]) {
      grouped[stakeholderName] = [];
    }
    grouped[stakeholderName].push(response);
  });

  return grouped;
};
