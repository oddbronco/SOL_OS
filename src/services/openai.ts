import { supabase } from '../lib/supabase';

// OpenAI API integration service

// Get API key from user settings
const getUserApiKey = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    if (error || !data?.openai_api_key) {
      return null;
    }

    return data.openai_api_key;
  } catch (error) {
    console.error('Error getting user API key:', error);
    return null;
  }
};

// File processing utilities
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Add missing getCustomPrompts function
const getCustomPrompts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('user_settings')
      .select('custom_prompts')
      .eq('user_id', user.id)
      .single();

    if (error || !data?.custom_prompts) {
      return {};
    }

    return data.custom_prompts;
  } catch (error) {
    console.error('Error getting custom prompts:', error);
    return {};
  }
};

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private async ensureApiKey(): Promise<void> {
    if (!this.apiKey) {
      const userApiKey = await getUserApiKey();
      if (!userApiKey) {
        throw new Error('OpenAI API key not configured. Please set up your API key in Settings > Integrations.');
      }
      this.apiKey = userApiKey;
    }
  }

  private async makeRequest(endpoint: string, data: any) {
    await this.ensureApiKey();

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-chat`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          ...data,
          openai_api_key: this.apiKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || errorData?.details || response.statusText;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Unable to reach OpenAI API. Please check your internet connection.');
      }
      throw error;
    }
  }

  async generateQuestions(context: {
    projectDescription: string;
    transcription?: string;
    stakeholders: Array<{ role: string; department: string }>;
    documentTypes?: string[];
    existingQuestions?: string[];
    customDocuments?: Array<{
      name: string;
      description: string;
      template?: string;
    }>;
  }) {
    // Validate inputs
    if (!context.projectDescription || context.projectDescription.trim().length < 10) {
      throw new Error('Project description is required and must be at least 10 characters.');
    }
    
    if (!context.stakeholders || context.stakeholders.length === 0) {
      throw new Error('At least one stakeholder is required to generate questions.');
    }

    const documentContext = context.documentTypes?.length || context.customDocuments?.length ? `

DOCUMENT TYPES TO CREATE:
${context.documentTypes?.map(type => `- ${type.replace('_', ' ')}`).join('\n') || ''}
${context.customDocuments?.map(doc => `- ${doc.name}: ${doc.description}`).join('\n') || ''}

Generate questions that will gather the specific information needed to create these documents comprehensively.
${context.documentTypes?.includes('technical_scope') ? 'Include detailed technical questions for technical scope.' : ''}
${context.documentTypes?.includes('exec_summary') ? 'Include strategic business questions for executive summary.' : ''}
${context.documentTypes?.includes('proposal') ? 'Include budget, timeline, and ROI questions for proposal.' : ''}
${context.documentTypes?.includes('risk_assessment') ? 'Include risk identification questions.' : ''}
${context.customDocuments?.map(doc => doc.template ? `For "${doc.name}", use this template as reference: ${doc.template}` : '').join('\n') || ''}
` : '';

    const questionCount = Math.min(20, Math.max(8, 
      (context.documentTypes?.length || 0) * 2 + 
      (context.customDocuments?.length || 0) * 3 + 
      context.stakeholders.length * 2
    ));

    const systemPrompt = `You are an expert business analyst and stakeholder interview specialist. Generate comprehensive, targeted questions for stakeholder interviews that will gather ALL information needed to create complete, professional documents.

Guidelines:
- Generate ${questionCount} comprehensive questions total
- Create role-specific questions for each stakeholder type
- Focus on gathering complete information for document creation
- Include strategic, tactical, and operational questions
- Cover requirements, constraints, goals, risks, and success criteria
- Avoid yes/no questions - use open-ended questions that encourage detailed responses
- Questions should uncover specific details, examples, and quantifiable metrics
- Base questions on transcript content and stakeholder roles${documentContext}

Return ONLY a JSON array of question objects:
[
  {
    "category": "Business Goals",
    "text": "What are your specific, measurable objectives for this project, and how will you define success?",
    "target_roles": ["Product Manager", "Director"],
    "document_relevance": ["sprint0_summary", "exec_summary"]
  }
]

IMPORTANT: Return only valid JSON, no other text.`;

    const userPrompt = `Project: ${context.projectDescription}

${context.transcription ? `Meeting Transcript:\n${context.transcription}\n` : ''}
Stakeholders:
${context.stakeholders.map(s => `- ${s.role} (${s.department})`).join('\n')}

${context.documentTypes?.length ? `Document Types to Create: ${context.documentTypes.join(', ')}` : ''}

Generate comprehensive interview questions that will gather ALL information needed to create complete, professional documents for this project.`;
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        messages,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      
      // Clean the response to ensure it's valid JSON
      let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Remove any text before the first [ or after the last ]
      const firstBracket = cleanedContent.indexOf('[');
      const lastBracket = cleanedContent.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanedContent = cleanedContent.substring(firstBracket, lastBracket + 1);
      }
      
      try {
        return JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content);
        console.error('Cleaned content:', cleanedContent);
        
        // Fallback: return some default questions
        console.warn('⚠️ Could not parse AI response, returning fallback questions');
        return [
          {
            category: 'Business Goals',
            text: 'What are the primary business objectives you hope to achieve with this project?',
            target_roles: ['all'],
            document_relevance: ['sprint0_summary']
          },
          {
            category: 'Requirements',
            text: 'What are the must-have features versus nice-to-have features for this project?',
            target_roles: ['all'],
            document_relevance: ['requirements_document']
          },
          {
            category: 'Constraints',
            text: 'What budget, timeline, or technical constraints should we be aware of?',
            target_roles: ['all'],
            document_relevance: ['implementation_plan']
          }
        ];
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      
      // More graceful error handling
      if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please set up your API key in Settings > Integrations.');
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and usage.');
      } else if (error.message?.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`Failed to generate questions: ${error.message || 'Unknown error'}. You can add questions manually instead.`);
      }
    }
  }

  async transcribeAudio(audioFile: File) {
    await this.ensureApiKey();
    
    // Validate file
    if (!audioFile) {
      throw new Error('No audio file provided for transcription.');
    }
    
    if (audioFile.size > 25 * 1024 * 1024) { // 25MB limit for OpenAI Whisper
      throw new Error(`Audio file too large (${(audioFile.size / 1024 / 1024).toFixed(2)}MB). OpenAI Whisper has a 25MB limit. Please use a smaller file.`);
    }
    
    const allowedTypes = ['audio/', 'video/'];
    if (!allowedTypes.some(type => audioFile.type.startsWith(type))) {
      throw new Error(`Unsupported file type: ${audioFile.type}. Please use audio or video files.`);
    }

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    try {
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in Settings > Integrations.');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 413) {
          throw new Error('File too large for transcription. Please use a file smaller than 25MB.');
        } else {
          throw new Error(`Transcription failed: ${errorMessage}`);
        }
      }

      const result = await response.json();
      
      if (!result.text) {
        throw new Error('No transcription text returned from OpenAI. The audio may be unclear or too short.');
      }
      
      return result.text;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  async summarizeResponse(responseText: string, questionContext: string) {
    const systemPrompt = `You are an expert at analyzing stakeholder interview responses. Provide a concise summary and extract key insights from the response.

Return a JSON object with this structure:
{
  "summary": "string - 2-3 sentence summary",
  "key_insights": ["string array of 3-5 key points"],
  "sentiment": "positive" | "neutral" | "negative",
  "action_items": ["string array of potential action items"],
  "concerns": ["string array of any concerns or risks mentioned"]
}`;

    const userPrompt = `Question: ${questionContext}

Response: ${responseText}

Analyze this stakeholder response and provide insights.`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        messages,
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to summarize response:', error);
      throw error;
    }
  }

  async generateProjectDocument(data: {
    projectName: string;
    projectDescription: string;
    stakeholderResponses: Array<{
      stakeholder: string;
      role: string;
      question: string;
      response: string;
      summary?: string;
    }>;
    documentType: 'sprint0_summary' | 'exec_summary' | 'technical_scope' | 'implementation_roadmap' | 'requirements_document' | 'user_stories' | 'risk_assessment' | 'stakeholder_analysis' | 'proposal' | 'custom';
    customDocumentInfo?: { name: string; description: string; template?: string };
    relatedDocuments?: string[]; // Other document types being created for this project
  }) {
    const customPrompts = await getCustomPrompts();
    
    const documentPrompts = {
      sprint0_summary: customPrompts.sprint0_summary_doc || `Create a comprehensive Sprint 0 summary document that synthesizes all stakeholder input into a clear project foundation. Include executive summary, stakeholder insights, requirements overview, assumptions, constraints, success criteria, and next steps. This document should serve as the foundation for all other project documentation.`,
      
      exec_summary: customPrompts.exec_summary_doc || `Create an executive summary that highlights key business objectives, stakeholder alignment, success metrics, ROI projections, resource requirements, timeline overview, and high-level recommendations for leadership review. Focus on business value and strategic alignment.`,
      
      technical_scope: customPrompts.technical_scope_doc || `Create a detailed technical scope document that outlines technical requirements, system architecture, technology stack, integration points, performance requirements, security considerations, scalability needs, and technical constraints. Include technical approach and implementation considerations.`,
      
      implementation_roadmap: customPrompts.implementation_roadmap_doc || `Create a comprehensive implementation roadmap that breaks down the project into phases, defines deliverables, timelines, resource requirements, dependencies, milestones, and risk mitigation strategies. Include detailed project timeline and resource allocation.`,
      
      requirements_document: customPrompts.requirements_document_doc || `Create a detailed requirements document covering functional requirements, non-functional requirements, business rules, user requirements, system requirements, compliance requirements, and acceptance criteria. Organize by priority and stakeholder needs.`,
      
      user_stories: customPrompts.user_stories_doc || `Create comprehensive user stories with personas, user journeys, acceptance criteria, edge cases, and user experience requirements. Include story mapping and prioritization based on user value and business impact.`,
      
      risk_assessment: customPrompts.risk_assessment_doc || `Create a thorough risk assessment document identifying technical risks, business risks, resource risks, timeline risks, and stakeholder risks. Include probability, impact, mitigation strategies, and contingency plans for each identified risk.`,
      
      stakeholder_analysis: customPrompts.stakeholder_analysis_doc || `Create a detailed stakeholder analysis documenting stakeholder roles, responsibilities, influence levels, communication preferences, success criteria, concerns, and engagement strategies. Include stakeholder matrix and communication plan.`,
      
      proposal: customPrompts.proposal_doc || `Create a comprehensive project proposal including problem statement, proposed solution, project scope, deliverables, timeline, budget estimates, team structure, success metrics, risks, assumptions, and next steps. Structure as a formal business proposal for approval.`,
      
      custom: data.customDocumentInfo?.description || 'Create a document based on the custom requirements provided.'
    };

    const relatedDocsContext = data.relatedDocuments?.length ? 
      `\n\nThis document is part of a comprehensive documentation suite including: ${data.relatedDocuments.join(', ')}. Ensure this document complements and references the other documents appropriately, avoiding duplication while maintaining consistency.` : '';

    const systemPrompt = `You are an expert project manager and technical writer. ${documentPrompts[data.documentType]}${relatedDocsContext}

${data.customDocumentInfo?.template ? `Use this template/example as a guide:\n${data.customDocumentInfo.template}\n\n` : ''}
Format the document in clean Markdown with proper headings, bullet points, and sections. Make it professional and actionable.

Base structure should include:
1. Executive Summary
2. Project Overview
3. Stakeholder Insights
4. Key Requirements
5. Recommendations
6. Next Steps
${data.documentType === 'proposal' ? '\n7. Budget & Timeline\n8. Success Metrics\n9. Risk Considerations' : ''}
${data.documentType === 'technical_scope' ? '\n7. Technical Architecture\n8. Integration Requirements\n9. Performance Criteria' : ''}
${data.documentType === 'implementation_roadmap' ? '\n7. Project Phases\n8. Resource Allocation\n9. Timeline & Milestones' : ''}

Use the stakeholder responses to inform your analysis and recommendations.`;

    const userPrompt = `Project: ${data.projectName}
Description: ${data.projectDescription}

Stakeholder Responses:
${data.stakeholderResponses.map(r => `
**${r.stakeholder} (${r.role})**
Q: ${r.question}
A: ${r.response}
${r.summary ? `Summary: ${r.summary}` : ''}
`).join('\n')}

Generate a ${data.documentType.replace('_', ' ')} document.`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        messages,
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 3000,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Failed to generate document:', error);
      throw error;
    }
  }

  async generateProjectDescription(data: {
    projectName: string;
    transcription: string;
    currentDescription?: string;
  }) {
    const systemPrompt = `You are an expert project manager. Based on the project name and kickoff transcript, create a project description that summarizes:

- What problem needs to be solved
- What solution is being proposed  
- What the desired outcome is

Keep it to 3-5 sentences. Provide a high-level overview that covers the problem, solution, and desired outcome with enough detail to understand the project scope.

Example: "Creatif, a multichannel lifestyle brand, requires a full website rebuild to better reflect their brand identity and streamline operations. The current website is outdated and lacks brand-centric design, making it difficult to manage their expanding product offerings across multiple channels. The new website should facilitate order fulfillment while actively contributing to building the brand's image. The goal is to create a fast, scalable, and visually expressive platform that can adapt its experience based on visitor profiles and reduce customer support tickets."`;

    const userPrompt = `Project: ${data.projectName}

Transcript: ${data.transcription}

${data.currentDescription ? `Current description: ${data.currentDescription}` : ''}

Generate a concise project description (1-2 sentences) based on this information.`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        messages,
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 400,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate project description:', error);
      throw error;
    }
  }

  async extractStakeholdersFromTranscript(transcription: string) {
    // Validate input
    if (!transcription || transcription.trim().length < 50) {
      throw new Error('Transcript is too short to extract stakeholders. Please provide a longer transcript (at least 50 characters).');
    }

    const systemPrompt = `You are an expert at extracting stakeholder information from meeting transcriptions. Analyze the transcript and identify all people who are stakeholders in the project (not just facilitators or note-takers).

CRITICAL REQUIREMENTS:
1. CAREFULLY scan the entire transcript for email addresses (look for patterns like name@company.com, firstname.lastname@domain.com, etc.)
2. CAREFULLY scan for phone numbers (look for patterns like +1-555-123-4567, (555) 123-4567, etc.)
3. Extract ALL people mentioned who have roles in the project (Product Manager, CTO, Designer, etc.)
4. Look for context clues about roles and departments
5. If email/phone not explicitly stated, leave as empty string (not null)
6. Include the specific context where each person was mentioned

EMAIL EXTRACTION EXAMPLES:
- "Sarah at sarah.johnson@acme.com handles product"
- "Contact Mike Chen (mike@techcorp.com) for technical questions"
- "Email lisa.rodriguez@company.co for design feedback"
- "Reach out to david.park@bank.com or call him at 555-123-4567"

ROLE INFERENCE EXAMPLES:
- "Sarah handles product decisions" → Product Manager
- "Mike is our tech lead" → Technical Lead
- "Lisa does all our design work" → UX Designer
- "David manages the business side" → Business Manager

Return ONLY a JSON array of stakeholder objects:
[
  {
    "name": "string",
    "role": "string", 
    "department": "string",
    "email": "string or empty if not found",
    "phone": "string or empty if not found", 
    "seniority": "Senior, Mid, Junior, Lead, Director, etc.",
    "experience_years": 5,
    "mentioned_context": "string - brief context of how they were mentioned"
  }
]

IMPORTANT: Return only valid JSON, no other text.`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract stakeholders from this transcription:\n\n${transcription}` }
    ];

    try {
      const response = await this.makeRequest('/chat/completions', {
        messages,
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      
      // Clean the response to ensure it's valid JSON
      let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Remove any text before the first [ or after the last ]
      const firstBracket = cleanedContent.indexOf('[');
      const lastBracket = cleanedContent.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanedContent = cleanedContent.substring(firstBracket, lastBracket + 1);
      }
      
      try {
        const stakeholders = JSON.parse(cleanedContent);
        
        // Post-process to ensure we have proper data types and handle nulls
        return stakeholders.map(stakeholder => ({
          ...stakeholder,
          email: stakeholder.email || '',
          phone: stakeholder.phone || '',
          seniority: stakeholder.seniority || '',
          experience_years: stakeholder.experience_years || 0,
          mentioned_context: stakeholder.mentioned_context || ''
        }));
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content);
        console.error('Cleaned content:', cleanedContent);
        
        // Fallback: try to extract emails manually from transcript
        console.warn('⚠️ Could not parse AI response, trying manual extraction');
        return this.extractStakeholdersManually(transcription);
      }
    } catch (error) {
      console.error('Failed to extract stakeholders:', error);
      
      // More graceful error handling
      if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key not configured. Please set up your API key in Settings > Integrations.');
      } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and usage.');
      } else if (error.message?.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`Failed to extract stakeholders: ${error.message || 'Unknown error'}. Please try again or add stakeholders manually.`);
      }
    }
  }

  // Manual fallback extraction method
  private extractStakeholdersManually(transcription: string) {
    console.log('🔧 Attempting manual stakeholder extraction...');
    
    const stakeholders = [];
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
    
    // Find all emails
    const emails = transcription.match(emailRegex) || [];
    
    // Find all phones  
    const phones = transcription.match(phoneRegex) || [];
    
    // Look for name patterns near emails
    emails.forEach(email => {
      const emailIndex = transcription.indexOf(email);
      const contextBefore = transcription.substring(Math.max(0, emailIndex - 100), emailIndex);
      const contextAfter = transcription.substring(emailIndex, Math.min(transcription.length, emailIndex + 100));
      
      // Try to extract name from context
      const namePatterns = [
        /([A-Z][a-z]+ [A-Z][a-z]+)/g, // First Last
        /([A-Z][a-z]+)/g // Just first name
      ];
      
      let name = '';
      let role = '';
      
      for (const pattern of namePatterns) {
        const matches = contextBefore.match(pattern);
        if (matches && matches.length > 0) {
          name = matches[matches.length - 1]; // Take the last match (closest to email)
          break;
        }
      }
      
      // Try to infer role from context
      const roleKeywords = {
        'product': 'Product Manager',
        'design': 'Designer', 
        'tech': 'Technical Lead',
        'cto': 'CTO',
        'manager': 'Manager',
        'director': 'Director',
        'lead': 'Lead',
        'engineer': 'Engineer',
        'developer': 'Developer'
      };
      
      const fullContext = (contextBefore + contextAfter).toLowerCase();
      for (const [keyword, roleTitle] of Object.entries(roleKeywords)) {
        if (fullContext.includes(keyword)) {
          role = roleTitle;
          break;
        }
      }
      
      if (name || email) {
        stakeholders.push({
          name: name || email.split('@')[0].replace(/[._]/g, ' '),
          email: email,
          role: role || 'Stakeholder',
          department: role ? role.split(' ')[0] : 'General',
          phone: '',
          seniority: '',
          experience_years: 0,
          mentioned_context: `Found email: ${email}${name ? ` with name: ${name}` : ''}`
        });
      }
    });
    
    // If no emails found, look for name + role patterns
    if (stakeholders.length === 0) {
      const nameRolePatterns = [
        /([A-Z][a-z]+ [A-Z][a-z]+).*?(Product Manager|CTO|Designer|Manager|Director|Lead|Engineer)/gi,
        /([A-Z][a-z]+).*?(handles|manages|leads|responsible for)/gi
      ];
      
      nameRolePatterns.forEach(pattern => {
        const matches = [...transcription.matchAll(pattern)];
        matches.forEach(match => {
          stakeholders.push({
            name: match[1],
            email: '',
            role: match[2] || 'Stakeholder',
            department: (match[2] || 'General').split(' ')[0],
            phone: '',
            seniority: '',
            experience_years: 0,
            mentioned_context: `Mentioned in context: "${match[0]}"`
          });
        });
      });
    }
    
    console.log(`🔧 Manual extraction found ${stakeholders.length} stakeholders`);
    return stakeholders.slice(0, 10); // Limit to 10 to avoid overwhelming
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = await getUserApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.slice(0, 8000) // Limit to ~8k chars
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async chat(messages: OpenAIMessage[]): Promise<string> {
    const apiKey = await getUserApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set up your API key in Settings > Integrations.');
    }

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-chat`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2000,
          openai_api_key: apiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || errorData?.details || response.statusText;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  async generateText(prompt: string): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }]);
  }
}

export const openAIService = new OpenAIService();
export default OpenAIService;