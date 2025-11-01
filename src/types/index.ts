// Enhanced TypeScript Data Models for Speak Platform

export type UserRole = 'master_admin' | 'customer_admin' | 'project_manager' | 'analyst' | 'stakeholder';
export type CompanyType = 'agency' | 'client';
export type ProjectStatus = 'draft' | 'planning' | 'in_progress' | 'analysis' | 'complete' | 'on_hold';
export type StakeholderStatus = 'pending' | 'invited' | 'in_progress' | 'completed';
export type ResponseType = 'text' | 'audio' | 'video';
export type QuestionType = 'general' | 'role_specific' | 'follow_up';
export type DocumentType = 'sprint0_summary' | 'exec_summary' | 'technical_scope' | 'implementation_plan';
export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'paused' | 'cancelled';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface MasterAdmin {
  id: string;
  email: string;
  full_name: string;
  role: 'master_admin';
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  logo_url?: string;
  address?: Address;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  founded_year?: number;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  type: CompanyType;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date?: string;
  max_projects: number;
  max_stakeholders: number;
  billing_email: string;
  currency: string;
  rate: number;
}

export interface CustomerSettings {
  primary_color: string;
  secondary_color: string;
  custom_domain?: string;
  openai_api_key?: string;
  features: {
    allow_video: boolean;
    allow_audio: boolean;
    ai_summary: boolean;
    ai_question_generation: boolean;
    max_recording_duration: number;
  };
}

export interface Customer {
  id: string;
  company_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  domain?: string;
  logo_url?: string;
  subscription: Subscription;
  settings: AgencySettings;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  can_create_projects: boolean;
  can_manage_stakeholders: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_access_billing: boolean;
}

export interface CustomerUser {
  id: string;
  customer_id: string;
  email: string;
  full_name: string;
  role: 'customer_admin' | 'project_manager' | 'analyst';
  permissions: UserPermissions;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface PrimaryContact {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface ClientCompany {
  id: string;
  customer_id: string;
  company_id: string;
  primary_contact: PrimaryContact;
  notes?: string;
  status: 'active' | 'inactive' | 'prospect';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ProjectTimeline {
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string;
}

export interface ProjectBudget {
  estimated: number;
  currency: string;
  approved?: boolean;
}

export interface ProjectTeam {
  project_manager: string;
  analysts: string[];
  stakeholders: string[];
}

export interface ProjectSettings {
  response_types: ResponseType[];
  require_all_questions: boolean;
  auto_reminders: boolean;
  reminder_interval_days: number;
}

export interface ProjectMetrics {
  total_stakeholders: number;
  completed_responses: number;
  avg_response_time_minutes: number;
}

export interface Project {
  id: string;
  customer_id: string;
  client_company_id: string;
  name: string;
  description: string;
  problem_summary: string;
  objectives: string[];
  scope: string;
  timeline: ProjectTimeline;
  budget?: ProjectBudget;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  team: ProjectTeam;
  settings: ProjectSettings;
  metrics: ProjectMetrics;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Stakeholder {
  id: string;
  customer_id: string;
  client_company_id: string;
  project_id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  seniority?: string;
  experience_years?: number;
  invite_token: string;
  status: StakeholderStatus;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  customer_id: string;
  client_company_id: string;
  project_id: string;
  stakeholder_id?: string;
  category: 'business' | 'technical' | 'process' | 'goals' | 'challenges';
  type: QuestionType;
  text: string;
  is_required: boolean;
  response_format: ResponseType;
  ai_generated: boolean;
  order: number;
  created_at: string;
  created_by: string;
}

export interface Response {
  id: string;
  customer_id: string;
  client_company_id: string;
  project_id: string;
  stakeholder_id: string;
  question_id: string;
  type: ResponseType;
  content: string;
  transcription?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  duration_seconds?: number;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  customer_id: string;
  client_company_id: string;
  project_id: string;
  type: DocumentType;
  title: string;
  content_md: string;
  content_html?: string;
  format: 'markdown' | 'html' | 'pdf';
  version: number;
  status: 'draft' | 'approved' | 'final';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  customer_id?: string;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalStakeholders: number;
  completedResponses: number;
  avgResponseTime: number;
  completionRate: number;
}

export interface ActivityItem {
  id: string;
  type: 'project_created' | 'stakeholder_invited' | 'response_submitted' | 'document_generated';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  project?: string;
}