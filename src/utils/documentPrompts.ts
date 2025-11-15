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
import { createContextChunks, buildPromptWithinLimit, estimateTokens } from './contextChunking';

export interface PromptContext {
  projectName?: string;
  projectDescription?: string;
  transcript?: string;
  stakeholderResponses?: any[];
  uploads?: any[];
  questions?: any[];
  project?: any;
  client?: any;
  stakeholders?: any[];
}

export interface EnhancedPromptResult {
  prompt: string;
  tokenEstimate: number;
  usedVariables: string[];
  droppedContent?: string[];
  needsChunking: boolean;
}

export const buildStructuredPrompt = (
  basePrompt: string,
  context: PromptContext,
  documentTitle: string
): string => {
  let prompt = basePrompt
    .replace(/\{\{project_name\}\}/g, context.projectName || 'Untitled Project')
    .replace(/\{\{project_description\}\}/g, context.projectDescription || 'No description provided')
    .replace(/\{\{transcript\}\}/g, context.transcript || '');

  if (context.stakeholderResponses && context.stakeholderResponses.length > 0) {
    const qaPairs = prepareQuestionAnswerPairs(context.stakeholderResponses);
    const formattedQA = formatQuestionAnswersForPrompt(qaPairs);
    prompt = prompt.replace(/\{\{stakeholder_responses\}\}/g, formattedQA);
    prompt = prompt.replace(/\{\{question_answers\}\}/g, formattedQA);

    const byCategory = groupResponsesByCategory(qaPairs);
    const formattedByCategory = Object.entries(byCategory)
      .map(([cat, pairs]) => `\n### ${cat}\n${formatQuestionAnswersForPrompt(pairs)}`)
      .join('\n');
    prompt = prompt.replace(/\{\{responses_by_category\}\}/g, formattedByCategory);

    const byStakeholder = groupResponsesByStakeholder(context.stakeholderResponses);
    const formattedByStakeholder = Object.entries(byStakeholder)
      .map(([name, resps]) => {
        const pairs = prepareQuestionAnswerPairs(resps);
        return `\n### ${name}\n${formatQuestionAnswersForPrompt(pairs)}`;
      })
      .join('\n');
    prompt = prompt.replace(/\{\{responses_by_stakeholder\}\}/g, formattedByStakeholder);
  } else {
    prompt = prompt.replace(/\{\{stakeholder_responses\}\}/g, 'No stakeholder responses available.');
    prompt = prompt.replace(/\{\{question_answers\}\}/g, 'No interview responses available.');
    prompt = prompt.replace(/\{\{responses_by_category\}\}/g, 'No responses available.');
    prompt = prompt.replace(/\{\{responses_by_stakeholder\}\}/g, 'No responses available.');
  }

  if (context.uploads && context.uploads.length > 0) {
    const files = prepareUploadedFiles(context.uploads);
    const formattedUploads = formatUploadsForPrompt(files);
    prompt = prompt.replace(/\{\{uploads\}\}/g, formattedUploads);
    prompt = prompt.replace(/\{\{files\}\}/g, formattedUploads);
  } else {
    prompt = prompt.replace(/\{\{uploads\}\}/g, 'No supplemental files available.');
    prompt = prompt.replace(/\{\{files\}\}/g, 'No files available.');
  }

  if (context.stakeholders && context.stakeholders.length > 0 && context.stakeholderResponses) {
    const profiles = prepareStakeholderProfiles(context.stakeholders, context.stakeholderResponses);
    const formattedProfiles = formatStakeholdersForPrompt(profiles);
    prompt = prompt.replace(/\{\{stakeholder_profiles\}\}/g, formattedProfiles);
    prompt = prompt.replace(/\{\{stakeholders\}\}/g, formattedProfiles);
  } else {
    prompt = prompt.replace(/\{\{stakeholder_profiles\}\}/g, 'No stakeholder information available.');
    prompt = prompt.replace(/\{\{stakeholders\}\}/g, 'No stakeholders assigned.');
  }

  if (context.project) {
    const projectSummary = prepareProjectSummary(context.project, context.client);
    const formattedProject = formatProjectForPrompt(projectSummary);
    prompt = prompt.replace(/\{\{project_summary\}\}/g, formattedProject);
  } else {
    prompt = prompt.replace(/\{\{project_summary\}\}/g, '');
  }

  if (context.questions && context.questions.length > 0) {
    const formattedQuestions = context.questions
      .map(q => `- [${q.category}] ${q.text}`)
      .join('\n');
    prompt = prompt.replace(/\{\{questions\}\}/g, formattedQuestions);
    prompt = prompt.replace(/\{\{question_list\}\}/g, formattedQuestions);
  } else {
    prompt = prompt.replace(/\{\{questions\}\}/g, 'No questions available.');
    prompt = prompt.replace(/\{\{question_list\}\}/g, 'No questions available.');
  }

  const jsonStructureInstructions = `

CRITICAL INSTRUCTIONS FOR OUTPUT FORMAT:
========================================

You MUST return ONLY a valid JSON object. Do not include any explanatory text before or after the JSON.
Use this EXACT structure:

{
  "title": "${documentTitle}",
  "metadata": {
    "project": "${context.projectName || 'Untitled Project'}",
    "client": "${context.client?.name || ''}",
    "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
    "version": "1.0",
    "author": "AI Generated",
    "status": "Draft"
  },
  "summary": "Write a concise 2-4 sentence executive summary that captures the essence of this document",
  "sections": [
    {
      "heading": "Section Title Here",
      "summary": "Brief 1-2 sentence overview of this section",
      "content": "Optional: Main paragraph content for this section",
      "callout": {
        "type": "info",
        "content": "Optional: Important note or warning for this section"
      },
      "table": {
        "headers": ["Column 1", "Column 2", "Column 3"],
        "rows": [
          ["Data 1", "Data 2", "Data 3"],
          ["Data 4", "Data 5", "Data 6"]
        ]
      },
      "items": [
        {
          "title": "Key Point or Finding Title",
          "description": "Detailed explanation of this point",
          "priority": "High",
          "status": "In Progress",
          "tags": ["tag1", "tag2"],
          "details": [
            "Supporting detail 1",
            "Supporting detail 2",
            "Supporting detail 3"
          ]
        }
      ],
      "subsections": [
        {
          "title": "Subsection Name",
          "content": "Subsection content",
          "table": {
            "headers": ["Header 1", "Header 2"],
            "rows": [["Value 1", "Value 2"]]
          },
          "items": [
            "List item 1",
            "List item 2"
          ]
        }
      ]
    }
  ],
  "appendix": [
    {
      "title": "Additional Information",
      "content": "Detailed supplementary content"
    }
  ],
  "references": [
    "Reference 1",
    "Reference 2"
  ]
}

JSON STRUCTURE RULES:
- "title": Document title (string, required)
- "metadata": Object with project info (optional but recommended)
- "summary": Executive summary (string, optional but recommended)
- "sections": Array of section objects (required, minimum 3 sections)
  - Each section can have:
    - "heading": Section name (string, required)
    - "summary": Brief section overview (string, optional)
    - "content": Main text content (string, optional)
    - "callout": Warning, tip, or note (object, optional) with type: "info"|"warning"|"tip"|"note"
    - "table": Data table (object, optional) with headers and rows arrays
    - "items": Array of detailed items (array, optional)
      - Each item can have: title, description, priority, status, tags, details array
    - "subsections": Nested sections (array, optional) with title, content, table, items
- "appendix": Additional sections (array, optional)
- "references": List of references (array, optional)

CONTENT QUALITY REQUIREMENTS:
- Be comprehensive and detailed
- Use professional business language
- Provide specific, actionable insights
- Include concrete examples where applicable
- Structure content logically with clear hierarchy
- Use tables for comparative data or structured information
- Add priority/status fields to requirements or user stories
- Use callouts to highlight important information
- Ensure all JSON is properly formatted and valid
- Use proper quotation marks and escape special characters

Remember: Output ONLY the JSON object, no additional text.`;

  return prompt + jsonStructureInstructions;
};

export const createCustomDocumentPrompt = (
  customPrompt: string,
  context: PromptContext,
  documentName: string
): string => {
  const contextSummary = `
PROJECT CONTEXT:
================
Project Name: ${context.projectName || 'Untitled Project'}
Description: ${context.projectDescription || 'No description provided'}

STAKEHOLDER INSIGHTS:
====================
${context.stakeholderResponses && context.stakeholderResponses.length > 0
  ? context.stakeholderResponses
      .map(r => {
        const stakeholderName = r.stakeholders?.name || 'Unknown';
        const questionText = r.questions?.text || 'Unknown question';
        return `${stakeholderName}: ${questionText}
Response: ${r.response || 'No response'}`;
      })
      .join('\n\n')
  : 'No stakeholder responses available'
}

SUPPLEMENTAL FILES:
==================
${context.uploads && context.uploads.length > 0
  ? context.uploads.map(u => `- ${u.file_name}: ${u.description || 'No description'}`).join('\n')
  : 'No files uploaded'
}

YOUR TASK:
==========
${customPrompt}
`;

  return buildStructuredPrompt(contextSummary, context, documentName);
};

export const EXAMPLE_TEMPLATES = {
  sprint0: `Generate a comprehensive Sprint 0 Summary document based on the following project information and stakeholder responses.

This document should serve as the foundation for the project and include:

1. **Executive Summary**: High-level overview of the project, its goals, and expected outcomes
2. **Project Objectives**: Clear, measurable objectives aligned with stakeholder needs
3. **Stakeholder Insights**: Key findings from stakeholder interviews, organized by theme
4. **Requirements Overview**: High-level requirements categorized by priority and feasibility
5. **Technical Considerations**: Technology stack, architecture considerations, and constraints
6. **Risks & Assumptions**: Identified risks, dependencies, and assumptions to validate
7. **Success Metrics**: How success will be measured
8. **Next Steps**: Recommended actions and priorities for Sprint 1

Project: {{project_name}}
Description: {{project_description}}

Stakeholder Responses:
{{stakeholder_responses}}

Supplemental Documents:
{{uploads}}`,

  requirements: `Create a detailed Requirements Document based on stakeholder input and project information.

The document should include:

1. **Introduction**: Project background and purpose of this document
2. **Functional Requirements**: User-facing features and capabilities
3. **Non-Functional Requirements**: Performance, security, scalability requirements
4. **User Stories**: Detailed user stories derived from stakeholder input
5. **Acceptance Criteria**: Clear criteria for each major requirement
6. **Technical Constraints**: Platform, integration, and technical limitations
7. **Assumptions & Dependencies**: What we're assuming and what we depend on
8. **Out of Scope**: What explicitly will NOT be included

Project: {{project_name}}
Description: {{project_description}}

Stakeholder Input:
{{stakeholder_responses}}

Supporting Materials:
{{uploads}}`,

  technicalSpecs: `Develop a Technical Specification document that translates requirements into technical architecture.

Include these sections:

1. **System Overview**: High-level architecture and component diagram description
2. **Technology Stack**: Recommended technologies with justification
3. **Data Model**: Key entities, relationships, and data structures
4. **API Specifications**: Endpoints, methods, and integration points
5. **Security Architecture**: Authentication, authorization, data protection
6. **Performance Requirements**: Response times, throughput, scalability targets
7. **Infrastructure**: Hosting, deployment, monitoring considerations
8. **Development Roadmap**: Phased approach to implementation

Project: {{project_name}}
Technical Context: {{project_description}}

Requirements Basis:
{{stakeholder_responses}}

Technical References:
{{uploads}}`
};

export const buildEnhancedPrompt = (
  basePrompt: string,
  context: PromptContext,
  documentTitle: string,
  maxTokens: number = 120000
): EnhancedPromptResult => {
  const contextParts: Record<string, string> = {};

  contextParts.project_summary = context.project
    ? formatProjectForPrompt(prepareProjectSummary(context.project, context.client))
    : '';

  contextParts.template_prompt = basePrompt;

  if (context.stakeholderResponses && context.stakeholderResponses.length > 0) {
    const qaPairs = prepareQuestionAnswerPairs(context.stakeholderResponses);
    contextParts.question_answers = formatQuestionAnswersForPrompt(qaPairs);

    if (context.stakeholders) {
      const profiles = prepareStakeholderProfiles(context.stakeholders, context.stakeholderResponses);
      contextParts.stakeholder_profiles = formatStakeholdersForPrompt(profiles);
    }
  }

  if (context.uploads && context.uploads.length > 0) {
    const files = prepareUploadedFiles(context.uploads);
    contextParts.file_content = formatUploadsForPrompt(files);
  }

  if (context.questions && context.questions.length > 0) {
    contextParts.questions_list = context.questions
      .map(q => `- [${q.category}] ${q.text}`)
      .join('\n');
  }

  contextParts.metadata = `Document: ${documentTitle}\nGenerated: ${new Date().toLocaleString()}`;

  const chunkedContext = createContextChunks(contextParts, {
    maxTokens,
    overlapTokens: 2000,
    priorityOrder: [
      'project_summary',
      'template_prompt',
      'question_answers',
      'stakeholder_profiles',
      'file_content',
      'questions_list',
      'metadata'
    ]
  });

  console.log(`📊 Context Analysis:
  - Total chunks: ${chunkedContext.chunks.length}
  - Estimated tokens: ${chunkedContext.totalTokens}
  - Needs chunking: ${chunkedContext.needsChaining}
  - Strategy: ${chunkedContext.chainStrategy || 'single-pass'}`);

  chunkedContext.chunks.forEach(chunk => {
    console.log(`  - ${chunk.type}: ~${chunk.tokenEstimate} tokens (priority: ${chunk.priority})`);
  });

  const { prompt, usedChunks, droppedChunks } = buildPromptWithinLimit(
    chunkedContext,
    basePrompt,
    maxTokens
  );

  const finalPrompt = buildStructuredPrompt(prompt, context, documentTitle);

  const usedVariables: string[] = [];
  const variablePatterns = [
    'project_name', 'project_description', 'transcript',
    'stakeholder_responses', 'question_answers', 'responses_by_category',
    'responses_by_stakeholder', 'stakeholder_profiles', 'stakeholders',
    'uploads', 'files', 'questions', 'question_list', 'project_summary'
  ];

  variablePatterns.forEach(varName => {
    if (basePrompt.includes(`{{${varName}}}`)) {
      usedVariables.push(varName);
    }
  });

  return {
    prompt: finalPrompt,
    tokenEstimate: estimateTokens(finalPrompt),
    usedVariables,
    droppedContent: droppedChunks.length > 0 ? droppedChunks : undefined,
    needsChunking: chunkedContext.needsChaining
  };
};
