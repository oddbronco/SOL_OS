export interface PromptContext {
  projectName?: string;
  projectDescription?: string;
  transcript?: string;
  stakeholderResponses?: any[];
  uploads?: any[];
  questions?: any[];
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
    const formattedResponses = context.stakeholderResponses
      .map(r => {
        const stakeholderName = r.stakeholders?.name || 'Unknown Stakeholder';
        const questionText = r.questions?.text || 'Unknown Question';
        const category = r.questions?.category || 'General';
        return `**${stakeholderName}** (${category})
Question: ${questionText}
Response: ${r.response || 'No response'}
---`;
      })
      .join('\n\n');

    prompt = prompt.replace(/\{\{stakeholder_responses\}\}/g, formattedResponses);
  } else {
    prompt = prompt.replace(/\{\{stakeholder_responses\}\}/g, 'No stakeholder responses available.');
  }

  if (context.uploads && context.uploads.length > 0) {
    const formattedUploads = context.uploads
      .map(u => `- ${u.file_name} (${u.upload_type}): ${u.description || 'No description'}`)
      .join('\n');
    prompt = prompt.replace(/\{\{uploads\}\}/g, formattedUploads);
  } else {
    prompt = prompt.replace(/\{\{uploads\}\}/g, 'No supplemental files available.');
  }

  if (context.questions && context.questions.length > 0) {
    const formattedQuestions = context.questions
      .map(q => `- [${q.category}] ${q.text}`)
      .join('\n');
    prompt = prompt.replace(/\{\{questions\}\}/g, formattedQuestions);
  } else {
    prompt = prompt.replace(/\{\{questions\}\}/g, 'No questions available.');
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
    "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
    "version": "1.0",
    "author": "AI Generated"
  },
  "summary": "Write a concise 2-4 sentence executive summary that captures the essence of this document",
  "sections": [
    {
      "heading": "Section Title Here",
      "summary": "Brief 1-2 sentence overview of this section",
      "content": "Optional: Main paragraph content for this section",
      "items": [
        {
          "title": "Key Point or Finding Title",
          "description": "Detailed explanation of this point",
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
          "items": [
            "List item 1",
            "List item 2"
          ]
        }
      ]
    }
  ]
}

JSON STRUCTURE RULES:
- "title": Document title (string, required)
- "metadata": Object with project info (optional but recommended)
- "summary": Executive summary (string, optional but recommended)
- "sections": Array of section objects (required, minimum 3 sections)
  - Each section should have:
    - "heading": Section name (string, required)
    - "summary": Brief section overview (string, optional)
    - "content": Main text content (string, optional)
    - "items": Array of detailed items (array, optional)
      - Each item can have: title, description, details array
    - "subsections": Nested sections (array, optional)

CONTENT QUALITY REQUIREMENTS:
- Be comprehensive and detailed
- Use professional business language
- Provide specific, actionable insights
- Include concrete examples where applicable
- Structure content logically with clear hierarchy
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
