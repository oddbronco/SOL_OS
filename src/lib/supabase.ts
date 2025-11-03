import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
console.log('supabase url: ', supabaseUrl)
console.log('supabase key ', supabaseAnonKey)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key', {
    auth: {
      detectSessionInUrl: false,
      flowType: 'implicit'
    }
  }
)

// Database types
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          customer_id: string
          name: string
          industry: string
          email: string
          phone?: string
          website?: string
          contact_person: string
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          name: string
          industry: string
          email: string
          phone?: string
          website?: string
          contact_person: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string
          email?: string
          phone?: string
          website?: string
          contact_person?: string
          status?: 'active' | 'inactive'
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          customer_id: string
          client_id: string
          name: string
          description?: string
          status: 'Setup' | 'Transcript Processing' | 'Stakeholder Outreach' | 'Gathering Responses' | 'Document Generation' | 'Complete'
          progress: number
          due_date: string
          transcript?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          client_id: string
          name: string
          description?: string
          status?: 'Setup' | 'Transcript Processing' | 'Stakeholder Outreach' | 'Gathering Responses' | 'Document Generation' | 'Complete'
          progress?: number
          due_date: string
          transcript?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          status?: 'Setup' | 'Transcript Processing' | 'Stakeholder Outreach' | 'Gathering Responses' | 'Document Generation' | 'Complete'
          progress?: number
          due_date?: string
          transcript?: string
          updated_at?: string
        }
      }
      stakeholders: {
        Row: {
          id: string
          project_id: string
          name: string
          email: string
          role: string
          department: string
          status: 'pending' | 'invited' | 'responded' | 'completed'
          mentioned_context?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          email: string
          role: string
          department: string
          status?: 'pending' | 'invited' | 'responded' | 'completed'
          mentioned_context?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          department?: string
          status?: 'pending' | 'invited' | 'responded' | 'completed'
          mentioned_context?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          project_id: string
          text: string
          category: string
          target_roles: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          text: string
          category: string
          target_roles: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          text?: string
          category?: string
          target_roles?: string[]
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          title: string
          type: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          type: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: string
          content?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          customer_id: string
          email: string
          full_name: string
          company_name?: string
          role: string
          is_master_admin?: boolean
          avatar_url?: string
          phone?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          customer_id?: string
          email: string
          full_name: string
          company_name?: string
          role?: string
          is_master_admin?: boolean
          avatar_url?: string
          phone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          email?: string
          full_name?: string
          company_name?: string
          role?: string
          is_master_admin?: boolean
          avatar_url?: string
          phone?: string
          updated_at?: string
        }
      }
    }
  }
}