import { 
  Project, 
  Stakeholder, 
  DashboardStats, 
  ActivityItem, 
  Company, 
  Agency, 
  ClientCompany 
} from '../types';

export const mockStats: DashboardStats = {
  totalProjects: 24,
  activeProjects: 8,
  totalStakeholders: 156,
  completedResponses: 432,
  avgResponseTime: 45,
  completionRate: 78
};

export const mockProjects: Project[] = [
  {
    id: '1',
    customer_id: 'customer-1',
    client_company_id: 'client-1',
    name: 'E-commerce Platform Redesign',
    description: 'Complete overhaul of the existing e-commerce platform to improve user experience and increase conversions.',
    problem_summary: 'Current platform has low conversion rates and poor user experience',
    objectives: [
      'Increase conversion rate by 25%',
      'Improve user experience',
      'Modernize the design system'
    ],
    scope: 'Full redesign of user interface, checkout process, and product catalog',
    timeline: {
      start_date: '2025-01-15',
      expected_end_date: '2025-04-15'
    },
    budget: {
      estimated: 75000,
      currency: 'USD',
      approved: true
    },
    status: 'in_progress',
    priority: 'high',
    tags: ['e-commerce', 'UX', 'redesign'],
    team: {
      project_manager: 'user-1',
      analysts: ['user-2', 'user-3'],
      stakeholders: ['stakeholder-1', 'stakeholder-2']
    },
    settings: {
      response_types: ['text', 'audio', 'video'],
      require_all_questions: false,
      auto_reminders: true,
      reminder_interval_days: 3
    },
    metrics: {
      total_stakeholders: 8,
      completed_responses: 24,
      avg_response_time_minutes: 32
    },
    created_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z'
  },
  {
    id: '2',
    customer_id: 'customer-1',
    client_company_id: 'client-2',
    name: 'Mobile Banking App',
    description: 'Development of a new mobile banking application with focus on security and user experience.',
    problem_summary: 'Need for modern mobile banking solution',
    objectives: [
      'Create secure mobile banking platform',
      'Implement biometric authentication',
      'Ensure regulatory compliance'
    ],
    scope: 'Mobile app development for iOS and Android',
    timeline: {
      start_date: '2025-02-01',
      expected_end_date: '2025-08-01'
    },
    budget: {
      estimated: 150000,
      currency: 'USD',
      approved: false
    },
    status: 'planning',
    priority: 'urgent',
    tags: ['mobile', 'banking', 'security'],
    team: {
      project_manager: 'user-1',
      analysts: ['user-2'],
      stakeholders: ['stakeholder-3', 'stakeholder-4']
    },
    settings: {
      response_types: ['text', 'audio'],
      require_all_questions: true,
      auto_reminders: true,
      reminder_interval_days: 2
    },
    metrics: {
      total_stakeholders: 12,
      completed_responses: 8,
      avg_response_time_minutes: 28
    },
    created_by: 'user-1',
    created_at: '2025-01-05T00:00:00Z',
    updated_at: '2025-01-08T00:00:00Z'
  },
  {
    id: '3',
    customer_id: 'customer-1',
    client_company_id: 'client-1',
    name: 'Data Analytics Dashboard',
    description: 'Business intelligence dashboard for real-time data visualization and reporting.',
    problem_summary: 'Lack of centralized data visualization and reporting capabilities',
    objectives: [
      'Centralize data from multiple sources',
      'Create real-time dashboards',
      'Enable self-service analytics'
    ],
    scope: 'Dashboard development with integration to existing systems',
    timeline: {
      start_date: '2025-01-20',
      expected_end_date: '2025-03-20'
    },
    budget: {
      estimated: 45000,
      currency: 'USD',
      approved: true
    },
    status: 'complete',
    priority: 'medium',
    tags: ['analytics', 'dashboard', 'BI'],
    team: {
      project_manager: 'user-2',
      analysts: ['user-3'],
      stakeholders: ['stakeholder-5']
    },
    settings: {
      response_types: ['text', 'video'],
      require_all_questions: false,
      auto_reminders: false,
      reminder_interval_days: 5
    },
    metrics: {
      total_stakeholders: 6,
      completed_responses: 18,
      avg_response_time_minutes: 42
    },
    created_by: 'user-2',
    created_at: '2024-12-15T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

export const mockStakeholders: Stakeholder[] = [
  {
    id: 'stakeholder-1',
    customer_id: 'customer-1',
    client_company_id: 'client-1',
    project_id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@client.com',
    role: 'Product Manager',
    department: 'Product',
    seniority: 'Senior',
    experience_years: 8,
    invite_token: 'token-1',
    status: 'completed',
    avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z'
  },
  {
    id: 'stakeholder-2',
    customer_id: 'customer-1',
    client_company_id: 'client-1',
    project_id: '1',
    name: 'Michael Chen',
    email: 'michael.chen@client.com',
    role: 'UX Designer',
    department: 'Design',
    seniority: 'Mid',
    experience_years: 5,
    invite_token: 'token-2',
    status: 'in_progress',
    avatar_url: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-08T00:00:00Z'
  },
  {
    id: 'stakeholder-3',
    customer_id: 'customer-1',
    client_company_id: 'client-2',
    project_id: '2',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@bank.com',
    role: 'Security Architect',
    department: 'IT Security',
    seniority: 'Senior',
    experience_years: 12,
    invite_token: 'token-3',
    status: 'invited',
    avatar_url: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    created_at: '2025-01-05T00:00:00Z',
    updated_at: '2025-01-06T00:00:00Z'
  },
  {
    id: 'stakeholder-4',
    customer_id: 'customer-1',
    client_company_id: 'client-2',
    project_id: '2',
    name: 'David Park',
    email: 'david.park@bank.com',
    role: 'Business Analyst',
    department: 'Business',
    seniority: 'Mid',
    experience_years: 6,
    invite_token: 'token-4',
    status: 'pending',
    avatar_url: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    created_at: '2025-01-06T00:00:00Z',
    updated_at: '2025-01-06T00:00:00Z'
  },
  {
    id: 'stakeholder-5',
    customer_id: 'customer-1',
    client_company_id: 'client-1',
    project_id: '3',
    name: 'Lisa Wang',
    email: 'lisa.wang@client.com',
    role: 'Data Analyst',
    department: 'Analytics',
    seniority: 'Junior',
    experience_years: 3,
    invite_token: 'token-5',
    status: 'completed',
    avatar_url: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    created_at: '2024-12-15T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

export const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'project_created',
    title: 'New project created',
    description: 'E-commerce Platform Redesign project has been initiated',
    timestamp: '2025-01-10T14:30:00Z',
    user: 'John Admin',
    project: 'E-commerce Platform Redesign'
  },
  {
    id: '2',
    type: 'stakeholder_invited',
    title: 'Stakeholder invited',
    description: 'Sarah Johnson has been invited to participate in the project',
    timestamp: '2025-01-10T13:15:00Z',
    user: 'John Admin',
    project: 'E-commerce Platform Redesign'
  },
  {
    id: '3',
    type: 'response_submitted',
    title: 'Response submitted',
    description: 'Michael Chen submitted a response to the UX requirements questionnaire',
    timestamp: '2025-01-10T11:45:00Z',
    user: 'Michael Chen',
    project: 'E-commerce Platform Redesign'
  },
  {
    id: '4',
    type: 'document_generated',
    title: 'Document generated',
    description: 'Sprint 0 summary document has been automatically generated',
    timestamp: '2025-01-10T10:20:00Z',
    user: 'System',
    project: 'Data Analytics Dashboard'
  },
  {
    id: '5',
    type: 'project_created',
    title: 'New project created',
    description: 'Mobile Banking App project has been initiated',
    timestamp: '2025-01-09T16:00:00Z',
    user: 'Jane Manager',
    project: 'Mobile Banking App'
  }
];

export const mockCompanies: Company[] = [
  {
    id: 'company-1',
    name: 'TechCorp Solutions',
    website: 'https://techcorp.com',
    description: 'Leading technology solutions provider',
    industry: 'Technology',
    logo_url: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    size: 'large',
    founded_year: 2015,
    phone: '+1-555-0123',
    email: 'contact@techcorp.com',
    type: 'client',
    created_by: 'user-1',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'company-2',
    name: 'FinanceFirst Bank',
    website: 'https://financefirst.com',
    description: 'Regional banking institution',
    industry: 'Financial Services',
    logo_url: 'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    size: 'enterprise',
    founded_year: 1985,
    phone: '+1-555-0456',
    email: 'info@financefirst.com',
    type: 'client',
    created_by: 'user-1',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];