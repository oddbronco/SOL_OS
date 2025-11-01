import React, { useState } from 'react';
import { Sparkles, RefreshCw, Plus, Trash2, Edit3, User, ChevronDown, ChevronUp, Save, FolderPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useTheme } from '../../contexts/ThemeContext';

interface Question {
  id: string;
  category: string;
  text: string;
  stakeholder_specific: boolean;
  target_roles: string[];
  is_required: boolean;
  response_format: 'text' | 'audio' | 'video';
}

interface StakeholderProfile {
  role: string;
  department: string;
  experience?: string;
  key_concerns: string[];
  project_touchpoints: string[];
  critical_info_needed: string[];
}

interface StakeholderQuestionGroup {
  stakeholder: StakeholderProfile;
  questions: Question[];
  expanded: boolean;
}

interface QuestionGeneratorProps {
  projectContext: string;
  stakeholders: Array<{ role: string; department: string }>;
  onQuestionsGenerated: (questions: Question[]) => void;
  existingQuestions?: Question[];
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  projectContext,
  stakeholders,
  onQuestionsGenerated,
  existingQuestions = []
}) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [stakeholderGroups, setStakeholderGroups] = useState<StakeholderQuestionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'person' | 'category' | 'required'>('person');
  const [selectedStakeholder, setSelectedStakeholder] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRequiredOnly, setShowRequiredOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [saveToNewCollection, setSaveToNewCollection] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const generateQuestionsForStakeholders = async () => {
    setLoading(true);
    try {
      // Enhanced stakeholder profiles with more context
      const enhancedStakeholders: StakeholderProfile[] = stakeholders.map(s => ({
        role: s.role,
        department: s.department,
        experience: getExperienceLevel(s.role),
        key_concerns: getKeyConcerns(s.role, s.department),
        project_touchpoints: getProjectTouchpoints(s.role, s.department),
        critical_info_needed: getCriticalInfoNeeded(s.role, s.department)
      }));

      // Generate comprehensive questions for each stakeholder (15-40 questions each)
      const newGroups: StakeholderQuestionGroup[] = [];
      
      for (const stakeholder of enhancedStakeholders) {
        const questions = await generateStakeholderQuestions(stakeholder, projectContext);
        newGroups.push({
          stakeholder,
          questions,
          expanded: true
        });
      }

      setStakeholderGroups(newGroups);
      
      // Flatten all questions for the callback
      const allQuestions = newGroups.flatMap(group => group.questions);
      onQuestionsGenerated(allQuestions);
      
    } catch (error) {
      console.error('Failed to generate questions:', error);
      
      // Fallback with mock comprehensive questions
      const mockGroups = generateMockStakeholderGroups(stakeholders);
      setStakeholderGroups(mockGroups);
      
      const allQuestions = mockGroups.flatMap(group => group.questions);
      onQuestionsGenerated(allQuestions);
    } finally {
      setLoading(false);
    }
  };

  const generateStakeholderQuestions = async (stakeholder: StakeholderProfile, context: string): Promise<Question[]> => {
    // This would call OpenAI API with enhanced prompts
    // For now, return comprehensive mock questions
    return generateComprehensiveQuestions(stakeholder);
  };

  const generateComprehensiveQuestions = (stakeholder: StakeholderProfile): Question[] => {
    const baseQuestions = [
      // Strategic Questions (5-8 questions)
      {
        id: `${stakeholder.role}-strategic-1`,
        category: 'Strategic Vision',
        text: `What are your primary strategic objectives for this project from a ${stakeholder.role} perspective?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-strategic-2`,
        category: 'Strategic Vision',
        text: `How does this project align with your department's long-term goals and initiatives?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-strategic-3`,
        category: 'Strategic Vision',
        text: `What success metrics will you use to evaluate this project's impact on your area of responsibility?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },

      // Current State Analysis (8-12 questions)
      {
        id: `${stakeholder.role}-current-1`,
        category: 'Current State',
        text: `What are the biggest pain points in your current workflow that this project should address?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-current-2`,
        category: 'Current State',
        text: `What existing systems, processes, or tools do you currently use that we need to integrate with or replace?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-current-3`,
        category: 'Current State',
        text: `What data do you currently have access to, and what additional data do you need?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-current-4`,
        category: 'Current State',
        text: `What are the most time-consuming tasks in your current process that could be automated or streamlined?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },

      // Requirements & Specifications (10-15 questions)
      {
        id: `${stakeholder.role}-requirements-1`,
        category: 'Requirements',
        text: `What are the must-have features versus nice-to-have features from your perspective?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-requirements-2`,
        category: 'Requirements',
        text: `What user experience expectations do you have for this solution?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-requirements-3`,
        category: 'Requirements',
        text: `What performance requirements are critical for your use case?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-requirements-4`,
        category: 'Requirements',
        text: `What security, compliance, or regulatory requirements must be considered?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },

      // Constraints & Challenges (5-8 questions)
      {
        id: `${stakeholder.role}-constraints-1`,
        category: 'Constraints',
        text: `What budget constraints or cost considerations should we be aware of?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-constraints-2`,
        category: 'Constraints',
        text: `What timeline constraints or deadlines are we working with?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-constraints-3`,
        category: 'Constraints',
        text: `What technical limitations or legacy system constraints do we need to work around?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },

      // Stakeholder & Change Management (3-5 questions)
      {
        id: `${stakeholder.role}-stakeholder-1`,
        category: 'Stakeholder Management',
        text: `Who are the key decision makers and influencers we need to consider for this project?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-stakeholder-2`,
        category: 'Stakeholder Management',
        text: `What potential resistance or challenges do you anticipate during implementation?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: true,
        response_format: 'text' as const
      },

      // Future Vision (2-4 questions)
      {
        id: `${stakeholder.role}-future-1`,
        category: 'Future Vision',
        text: `How do you envision this solution evolving over the next 2-3 years?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: false,
        response_format: 'text' as const
      },
      {
        id: `${stakeholder.role}-future-2`,
        category: 'Future Vision',
        text: `What additional capabilities or integrations might be needed in future phases?`,
        stakeholder_specific: true,
        target_roles: [stakeholder.role],
        is_required: false,
        response_format: 'text' as const
      }
    ];

    // Add role-specific questions based on stakeholder type
    const roleSpecificQuestions = getRoleSpecificQuestions(stakeholder);
    
    return [...baseQuestions, ...roleSpecificQuestions];
  };

  const getRoleSpecificQuestions = (stakeholder: StakeholderProfile): Question[] => {
    const role = stakeholder.role.toLowerCase();
    
    if (role.includes('cto') || role.includes('technical') || role.includes('developer')) {
      return [
        {
          id: `${stakeholder.role}-tech-1`,
          category: 'Technical Architecture',
          text: 'What is your preferred technology stack and why?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-tech-2`,
          category: 'Technical Architecture',
          text: 'What scalability requirements should we plan for?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-tech-3`,
          category: 'Technical Architecture',
          text: 'What are your deployment and infrastructure preferences?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-tech-4`,
          category: 'Technical Architecture',
          text: 'What monitoring, logging, and maintenance requirements do you have?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        }
      ];
    }
    
    if (role.includes('product') || role.includes('manager')) {
      return [
        {
          id: `${stakeholder.role}-product-1`,
          category: 'Product Strategy',
          text: 'What user personas and use cases should we prioritize?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-product-2`,
          category: 'Product Strategy',
          text: 'What competitive advantages should this solution provide?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-product-3`,
          category: 'Product Strategy',
          text: 'How will you measure user adoption and engagement?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        }
      ];
    }
    
    if (role.includes('ux') || role.includes('design')) {
      return [
        {
          id: `${stakeholder.role}-ux-1`,
          category: 'User Experience',
          text: 'What are the key user journeys we need to optimize?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-ux-2`,
          category: 'User Experience',
          text: 'What accessibility requirements must be met?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        },
        {
          id: `${stakeholder.role}-ux-3`,
          category: 'User Experience',
          text: 'What design system or brand guidelines should be followed?',
          stakeholder_specific: true,
          target_roles: [stakeholder.role],
          is_required: true,
          response_format: 'text' as const
        }
      ];
    }
    
    return [];
  };

  const generateMockStakeholderGroups = (stakeholders: Array<{ role: string; department: string }>): StakeholderQuestionGroup[] => {
    return stakeholders.map(s => {
      const stakeholder: StakeholderProfile = {
        role: s.role,
        department: s.department,
        experience: getExperienceLevel(s.role),
        key_concerns: getKeyConcerns(s.role, s.department),
        project_touchpoints: getProjectTouchpoints(s.role, s.department),
        critical_info_needed: getCriticalInfoNeeded(s.role, s.department)
      };
      
      return {
        stakeholder,
        questions: generateComprehensiveQuestions(stakeholder),
        expanded: true
      };
    });
  };

  const getExperienceLevel = (role: string): string => {
    if (role.toLowerCase().includes('senior') || role.toLowerCase().includes('lead') || role.toLowerCase().includes('director')) {
      return 'Senior (8+ years)';
    } else if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('principal')) {
      return 'Mid-Senior (5-8 years)';
    }
    return 'Mid-level (3-5 years)';
  };

  const getKeyConcerns = (role: string, department: string): string[] => {
    const concerns: { [key: string]: string[] } = {
      'product manager': ['User adoption', 'Feature prioritization', 'Market fit', 'ROI measurement'],
      'cto': ['Technical scalability', 'Security', 'Team productivity', 'Technical debt'],
      'ux designer': ['User experience', 'Accessibility', 'Design consistency', 'Usability testing'],
      'marketing director': ['Brand alignment', 'User acquisition', 'Conversion optimization', 'Analytics'],
      'customer support': ['User satisfaction', 'Support ticket reduction', 'Training requirements', 'Issue resolution']
    };
    
    return concerns[role.toLowerCase()] || ['Project success', 'Team efficiency', 'Quality delivery'];
  };

  const getProjectTouchpoints = (role: string, department: string): string[] => {
    const touchpoints: { [key: string]: string[] } = {
      'product manager': ['Requirements gathering', 'Feature specification', 'User testing', 'Launch planning'],
      'cto': ['Architecture decisions', 'Technology selection', 'Security review', 'Performance optimization'],
      'ux designer': ['User research', 'Wireframing', 'Prototyping', 'Design system'],
      'marketing director': ['Go-to-market strategy', 'Content creation', 'Campaign planning', 'Analytics setup'],
      'customer support': ['Training materials', 'Documentation', 'Support processes', 'User feedback']
    };
    
    return touchpoints[role.toLowerCase()] || ['Project planning', 'Implementation', 'Testing', 'Deployment'];
  };

  const getCriticalInfoNeeded = (role: string, department: string): string[] => {
    const info: { [key: string]: string[] } = {
      'product manager': ['User personas', 'Market requirements', 'Competitive analysis', 'Success metrics'],
      'cto': ['Technical constraints', 'Integration requirements', 'Performance benchmarks', 'Security standards'],
      'ux designer': ['User research data', 'Design requirements', 'Accessibility standards', 'Brand guidelines'],
      'marketing director': ['Target audience', 'Marketing goals', 'Brand requirements', 'Campaign metrics'],
      'customer support': ['Current pain points', 'Support volume data', 'Training needs', 'Process improvements']
    };
    
    return info[role.toLowerCase()] || ['Project scope', 'Requirements', 'Constraints', 'Success criteria'];
  };

  const updateQuestion = (groupIndex: number, questionId: string, updates: Partial<Question>) => {
    setStakeholderGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        questions: newGroups[groupIndex].questions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        )
      };

      // Notify parent of changes
      const allQuestions = newGroups.flatMap(group => group.questions);
      onQuestionsGenerated(allQuestions);

      return newGroups;
    });
  };

  const deleteQuestion = (groupIndex: number, questionId: string) => {
    setStakeholderGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        questions: newGroups[groupIndex].questions.filter(q => q.id !== questionId)
      };

      // Notify parent of changes
      const allQuestions = newGroups.flatMap(group => group.questions);
      onQuestionsGenerated(allQuestions);

      return newGroups;
    });
  };

  const addCustomQuestion = (groupIndex: number) => {
    const newQuestion: Question = {
      id: `custom-${Date.now()}`,
      category: 'Custom',
      text: '',
      stakeholder_specific: true,
      target_roles: [stakeholderGroups[groupIndex].stakeholder.role],
      is_required: false,
      response_format: 'text'
    };
    
    setStakeholderGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        questions: [...newGroups[groupIndex].questions, newQuestion]
      };
      return newGroups;
    });
    
    setEditingQuestion(newQuestion.id);
  };

  const toggleGroupExpansion = (groupIndex: number) => {
    setStakeholderGroups(prev => {
      const newGroups = [...prev];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        expanded: !newGroups[groupIndex].expanded
      };
      return newGroups;
    });
  };

  const loadCollections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('question_collections')
        .select('id, name, scope, questions')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const handleSaveToCollection = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const allQuestions = stakeholderGroups.flatMap(group =>
        group.questions.map(q => ({
          text: q.text,
          category: q.category,
          target_roles: q.target_roles,
          response_type: q.response_format
        }))
      );

      if (saveToNewCollection) {
        // Create new collection
        const { error } = await supabase
          .from('question_collections')
          .insert({
            customer_id: user.id,
            created_by: user.id,
            scope: 'personal',
            name: newCollectionName,
            description: newCollectionDescription,
            tags: [],
            questions: allQuestions
          });

        if (error) throw error;
        alert('Questions saved to new collection!');
      } else {
        // Add to existing collection
        const existingCollection = collections.find(c => c.id === selectedCollection);
        if (!existingCollection) return;

        const updatedQuestions = [...existingCollection.questions, ...allQuestions];

        const { error } = await supabase
          .from('question_collections')
          .update({
            questions: updatedQuestions,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCollection);

        if (error) throw error;
        alert('Questions added to collection!');
      }

      setShowSaveModal(false);
      setSaveToNewCollection(false);
      setSelectedCollection('');
      setNewCollectionName('');
      setNewCollectionDescription('');
    } catch (error) {
      console.error('Error saving to collection:', error);
      alert('Failed to save questions to collection');
    } finally {
      setSaving(false);
    }
  };

  const openSaveModal = () => {
    loadCollections();
    setShowSaveModal(true);
  };

  const categories = [
    'Strategic Vision',
    'Current State',
    'Requirements',
    'Technical Architecture',
    'User Experience',
    'Product Strategy',
    'Constraints',
    'Stakeholder Management',
    'Future Vision',
    'Custom'
  ];

  const responseFormats = [
    { value: 'text', label: 'Text Response' },
    { value: 'audio', label: 'Audio Recording' },
    { value: 'video', label: 'Video Recording' }
  ];

  const totalQuestions = stakeholderGroups.reduce((sum, group) => sum + group.questions.length, 0);

  // Filter and search logic
  const getFilteredGroups = () => {
    let filteredGroups = [...stakeholderGroups];

    // Filter by stakeholder
    if (selectedStakeholder !== 'all') {
      filteredGroups = filteredGroups.filter(group => 
        group.stakeholder.role === selectedStakeholder
      );
    }

    // Filter questions within groups
    filteredGroups = filteredGroups.map(group => ({
      ...group,
      questions: group.questions.filter(question => {
        // Category filter
        if (selectedCategory !== 'all' && question.category !== selectedCategory) {
          return false;
        }

        // Required filter
        if (showRequiredOnly && !question.is_required) {
          return false;
        }

        // Search filter
        if (searchTerm && !question.text.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        return true;
      })
    })).filter(group => group.questions.length > 0); // Remove groups with no questions

    return filteredGroups;
  };

  const filteredGroups = getFilteredGroups();
  const filteredTotalQuestions = filteredGroups.reduce((sum, group) => sum + group.questions.length, 0);

  // Get unique categories across all questions
  const allCategories = Array.from(new Set(
    stakeholderGroups.flatMap(group => group.questions.map(q => q.category))
  )).sort();

  // Get unique stakeholder roles
  const allStakeholderRoles = stakeholderGroups.map(group => group.stakeholder.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Stakeholder Interview Questions</h3>
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {filteredTotalQuestions} of {totalQuestions} questions shown
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {stakeholderGroups.length > 0 && (
            <Button
              variant="outline"
              icon={FolderPlus}
              onClick={openSaveModal}
            >
              Save to Collection
            </Button>
          )}
          <Button
            icon={stakeholderGroups.length > 0 ? RefreshCw : Sparkles}
            onClick={generateQuestionsForStakeholders}
            loading={loading}
          >
            {stakeholderGroups.length > 0 ? 'Regenerate All' : 'Generate Questions'}
          </Button>
        </div>
      </div>

      {stakeholderGroups.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Generate Comprehensive Questions?
          </h4>
          <p className="text-gray-600 mb-6">
            Our AI will create 15-40 tailored questions for each stakeholder based on their role, concerns, and project involvement.
          </p>
          <Button
            onClick={generateQuestionsForStakeholders}
            loading={loading}
            icon={Sparkles}
            size="lg"
          >
            Generate Stakeholder Questions
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Filter & Search Questions</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">View:</span>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setFilterBy('person')}
                      className={`px-3 py-1 text-sm font-medium ${
                        filterBy === 'person'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      By Person
                    </button>
                    <button
                      onClick={() => setFilterBy('category')}
                      className={`px-3 py-1 text-sm font-medium border-l border-gray-300 ${
                        filterBy === 'category'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      By Category
                    </button>
                    <button
                      onClick={() => setFilterBy('all')}
                      className={`px-3 py-1 text-sm font-medium border-l border-gray-300 ${
                        filterBy === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Stakeholder Filter */}
                <Select
                  value={selectedStakeholder}
                  onChange={(e) => setSelectedStakeholder(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Stakeholders' },
                    ...allStakeholderRoles.map(role => ({ value: role, label: role }))
                  ]}
                />

                {/* Category Filter */}
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...allCategories.map(cat => ({ value: cat, label: cat }))
                  ]}
                />

                {/* Required Filter */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required-only"
                    checked={showRequiredOnly}
                    onChange={(e) => setShowRequiredOnly(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="required-only" className="text-sm text-gray-700">
                    Required only
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedStakeholder !== 'all' || selectedCategory !== 'all' || showRequiredOnly || searchTerm) && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    Showing {filteredTotalQuestions} of {totalQuestions} questions
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStakeholder('all');
                      setSelectedCategory('all');
                      setShowRequiredOnly(false);
                      setSearchTerm('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Summary */}
          {filteredGroups.length > 0 && (
            <Card className="bg-primary-50 border-green-200">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-primary-600 mr-2" />
                <p className="text-sm text-primary-800">
                  {filterBy === 'person' && selectedStakeholder !== 'all' 
                    ? `Showing ${filteredTotalQuestions} questions for ${selectedStakeholder}`
                    : filterBy === 'category' && selectedCategory !== 'all'
                    ? `Showing ${filteredTotalQuestions} questions in ${selectedCategory} category`
                    : `Generated ${totalQuestions} questions across ${stakeholderGroups.length} stakeholders`
                  }
                </p>
              </div>
            </Card>
          )}

          {/* No Results */}
          {filteredGroups.length === 0 && (
            <Card className="text-center py-8">
              <p className={`mb-4 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>No questions match your current filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStakeholder('all');
                  setSelectedCategory('all');
                  setShowRequiredOnly(false);
                  setSearchTerm('');
                }}
              >
                Clear All Filters
              </Button>
            </Card>
          )}

          {/* Category View */}
          {filterBy === 'category' && filteredGroups.length > 0 && (
            <div className="space-y-4">
              {allCategories
                .filter(category => 
                  selectedCategory === 'all' || category === selectedCategory
                )
                .map(category => {
                  const categoryQuestions = filteredGroups.flatMap(group => 
                    group.questions.filter(q => q.category === category)
                      .map(q => ({ ...q, stakeholder: group.stakeholder.role }))
                  );
                  
                  if (categoryQuestions.length === 0) return null;

                  return (
                    <Card key={category}>
                      <div className="p-4 bg-gray-50 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-lg font-semibold ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>{category}</h4>
                          <Badge variant="info">{categoryQuestions.length} questions</Badge>
                        </div>
                      </div>
                      <div className="p-4 max-h-96 overflow-y-auto">
                        <div className="space-y-4">
                          {categoryQuestions.map((question) => (
                            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <Badge variant="info">{question.stakeholder}</Badge>
                                  {question.is_required && (
                                    <Badge variant="error" size="sm">Required</Badge>
                                  )}
                                  <Badge variant="default" size="sm">
                                    {question.response_format}
                                  </Badge>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Edit3}
                                    onClick={() => setEditingQuestion(question.id)}
                                  />
                                </div>
                              </div>
                              <p className={`${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>{question.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {/* Person/Stakeholder View */}
          {(filterBy === 'person' || filterBy === 'all') && (
            <div className="space-y-6">
              {filteredGroups.map((group, groupIndex) => (
                <Card key={groupIndex} className="overflow-hidden">
                  {/* Stakeholder Header */}
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroupExpansion(groupIndex)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{group.stakeholder.role}</h4>
                        <p className="text-sm text-gray-600">{group.stakeholder.department}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="info" size="sm">{group.stakeholder.experience}</Badge>
                          <Badge variant="success" size="sm">{group.questions.length} questions</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={(e) => {
                          e.stopPropagation();
                          addCustomQuestion(groupIndex);
                        }}
                      >
                        Add Question
                      </Button>
                      {group.expanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Stakeholder Context */}
                  {group.expanded && (
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className={`font-medium mb-2 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>Key Concerns</h5>
                          <ul className="space-y-1">
                            {group.stakeholder.key_concerns.map((concern, i) => (
                              <li key={i} className={`${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                              }`}>• {concern}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className={`font-medium mb-2 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>Project Touchpoints</h5>
                          <ul className="space-y-1">
                            {group.stakeholder.project_touchpoints.map((touchpoint, i) => (
                              <li key={i} className={`${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                              }`}>• {touchpoint}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className={`font-medium mb-2 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>Critical Info Needed</h5>
                          <ul className="space-y-1">
                            {group.stakeholder.critical_info_needed.map((info, i) => (
                              <li key={i} className={`${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                              }`}>• {info}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Questions */}
                  {group.expanded && (
                    <div className="p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {group.questions.map((question) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            {editingQuestion === question.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Select
                                    label="Category"
                                    value={question.category}
                                    onChange={(e) => updateQuestion(groupIndex, question.id, { category: e.target.value })}
                                    options={categories.map(cat => ({ value: cat, label: cat }))}
                                  />
                                  <Select
                                    label="Response Format"
                                    value={question.response_format}
                                    onChange={(e) => updateQuestion(groupIndex, question.id, { response_format: e.target.value as any })}
                                    options={responseFormats}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                  <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={question.text}
                                    onChange={(e) => updateQuestion(groupIndex, question.id, { text: e.target.value })}
                                    placeholder="Enter your question..."
                                  />
                                </div>

                                <div className="flex items-center space-x-4">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={question.is_required}
                                      onChange={(e) => updateQuestion(groupIndex, question.id, { is_required: e.target.checked })}
                                      className="mr-2"
                                    />
                                    <span className={`text-sm ${
                                      isDark ? 'text-gray-300' : 'text-gray-700'
                                    }`}>Required</span>
                                  </label>
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingQuestion(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setEditingQuestion(null)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <Badge variant="info">{question.category}</Badge>
                                    {question.is_required && (
                                      <Badge variant="error" size="sm">Required</Badge>
                                    )}
                                    <Badge variant="default" size="sm">
                                      {question.response_format}
                                    </Badge>
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      icon={Edit3}
                                      onClick={() => setEditingQuestion(question.id)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      icon={Trash2}
                                      onClick={() => deleteQuestion(groupIndex, question.id)}
                                    />
                                  </div>
                                </div>
                                
                                <p className={`${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`}>{question.text}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save to Collection Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Questions to Collection"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Save {totalQuestions} questions to a collection for easy reuse across projects.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!saveToNewCollection}
                  onChange={() => setSaveToNewCollection(false)}
                  className="rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">Add to Existing Collection</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={saveToNewCollection}
                  onChange={() => setSaveToNewCollection(true)}
                  className="rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">Create New Collection</span>
              </label>
            </div>

            {saveToNewCollection ? (
              <div className="space-y-3">
                <Input
                  label="Collection Name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="E.g., Enterprise Software Questions"
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description (optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="Describe this collection..."
                  />
                </div>
              </div>
            ) : (
              <Select
                label="Select Collection"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                options={[
                  { value: '', label: 'Choose a collection...' },
                  ...collections.map(c => ({
                    value: c.id,
                    label: `${c.name} (${c.questions?.length || 0} questions)`
                  }))
                ]}
                required
              />
            )}

            {!saveToNewCollection && collections.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  No collections found. Create a new collection to save these questions.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowSaveModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToCollection}
              loading={saving}
              disabled={
                saving ||
                (saveToNewCollection ? !newCollectionName : !selectedCollection)
              }
            >
              {saving ? 'Saving...' : 'Save Questions'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};