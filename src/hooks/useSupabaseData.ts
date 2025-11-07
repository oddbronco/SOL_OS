import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Client {
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
  user_id?: string
  projects_count?: number
  isDemo?: boolean
}

export interface Project {
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
  user_id?: string
  client?: string
  stakeholders_count?: number
  dueDate?: string
  isDemo?: boolean
  brand_logo_url?: string
  brand_primary_color?: string
  brand_secondary_color?: string
  brand_text_color?: string
}

export interface Stakeholder {
  id: string
  project_id: string
  name: string
  email: string
  role: string
  department: string
  phone?: string
  seniority?: string
  experience_years?: number
  interview_password?: string
  interview_password?: string
  status: 'pending' | 'invited' | 'responded' | 'completed'
  mentioned_context?: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  project_id: string
  text: string
  category: string
  target_roles: string[]
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  project_id: string
  title: string
  type: string
  content: string
  created_at: string
  updated_at: string
}

export const useSupabaseData = () => {
  const { user } = useAuth()

  // Try to load cached data from sessionStorage for faster initial render
  const getCachedData = (key: string) => {
    try {
      const cached = sessionStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  const [clients, setClients] = useState<Client[]>(() => getCachedData('clients') || [])
  const [projects, setProjects] = useState<Project[]>(() => getCachedData('projects') || [])
  const [stakeholderCount, setStakeholderCount] = useState(() => getCachedData('stakeholderCount') || 0)
  // Start as not loading if we have cached data
  const hasCachedData = getCachedData('clients') || getCachedData('projects')
  const [loading, setLoading] = useState(!hasCachedData)
  const [error, setError] = useState<string | null>(null)

  // Load initial data when user is available
  useEffect(() => {
    if (!user) {
      console.log('ℹ️ No user, clearing data and stopping loading');
      setClients([])
      setProjects([])
      setLoading(false)
      return
    }

    console.log('🔄 User available, loading data for:', user.id);
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      console.log('📊 Starting data load...')
      // Only set loading if we don't have cached data
      const hasCache = getCachedData('clients') || getCachedData('projects')
      if (!hasCache) {
        setLoading(true)
      }
      setError(null)

      // Set a timeout to prevent infinite loading
      const loadTimeout = setTimeout(() => {
        console.log('⏰ Data loading timeout - setting loading to false');
        setLoading(false);
      }, 8000);

      // Load clients and projects in parallel for faster loading
      console.log('📋 Loading clients and projects in parallel...')

      let clientsQuery = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      // Only filter by user_id if not a master admin
      if (!user.isMasterAdmin) {
        clientsQuery = clientsQuery.eq('user_id', user.id)
        projectsQuery = projectsQuery.eq('user_id', user.id)
      }

      // Execute both queries in parallel
      const [clientsResult, projectsResult] = await Promise.all([
        clientsQuery,
        projectsQuery
      ])

      const { data: clientsData, error: clientsError } = clientsResult
      const { data: projectsData, error: projectsError } = projectsResult

      if (clientsError) {
        console.error('❌ Clients error:', clientsError)
        setClients([])
      } else {
        console.log('✅ Loaded clients:', clientsData?.length || 0)
        setClients(clientsData || [])
        // Cache clients data
        try {
          sessionStorage.setItem('clients', JSON.stringify(clientsData || []))
        } catch (e) {
          console.warn('Failed to cache clients data')
        }
      }

      if (projectsError) {
        console.error('❌ Projects error:', projectsError)
        setProjects([])
      } else {
        console.log('✅ Loaded projects:', projectsData?.length || 0)

        // Transform projects and add client names
        const transformedProjects = projectsData?.map(project => {
          const client = clientsData?.find(c => c.id === project.client_id)
          return {
            ...project,
            client: client?.name || 'Unknown Client',
            dueDate: project.due_date,
            stakeholders_count: 0,
            description: project.description || ''
          }
        }) || []

        setProjects(transformedProjects)
        // Cache projects data
        try {
          sessionStorage.setItem('projects', JSON.stringify(transformedProjects))
        } catch (e) {
          console.warn('Failed to cache projects data')
        }
      }

      // Load stakeholder count for the user
      console.log('👥 Loading stakeholder count...')
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id)
        const { count, error: stakeholderError } = await supabase
          .from('stakeholders')
          .select('id', { count: 'exact', head: true })
          .in('project_id', projectIds)

        if (stakeholderError) {
          console.error('❌ Stakeholder count error:', stakeholderError)
          setStakeholderCount(0)
        } else {
          console.log('✅ Total stakeholders:', count || 0)
          setStakeholderCount(count || 0)
          // Cache stakeholder count
          try {
            sessionStorage.setItem('stakeholderCount', JSON.stringify(count || 0))
          } catch (e) {
            console.warn('Failed to cache stakeholder count')
          }
        }
      } else {
        setStakeholderCount(0)
      }

      clearTimeout(loadTimeout)
      setLoading(false)
      console.log('✅ Data loading complete')

    } catch (err) {
      console.error('💥 Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setLoading(false)
    }
  }

  // Client operations
  const addClient = async (clientData: Omit<Client, 'id' | 'agency_id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) {
      console.error('❌ No user available for adding client')
      return null
    }

    try {
      console.log('➕ Adding client:', clientData.name)
      
      // Generate customer_id in the format your schema expects
      const customerId = `CUST_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          customer_id: customerId,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Add client error:', error)
        throw error
      }

      console.log('✅ Client added:', data.name)
      setClients(prev => [data, ...prev])
      return data

    } catch (err) {
      console.error('💥 Error adding client:', err)
      setError(err instanceof Error ? err.message : 'Failed to add client')
      return null
    }
  }

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!user) return null

    try {
      console.log('✏️ Updating client:', clientId)
      
      const { data, error } = await supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Update client error:', error)
        throw error
      }

      console.log('✅ Client updated:', data.name)
      setClients(prev => prev.map(client => 
        client.id === clientId ? data : client
      ))
      
      return data

    } catch (err) {
      console.error('💥 Error updating client:', err)
      setError(err instanceof Error ? err.message : 'Failed to update client')
      return null
    }
  }

  const deleteClient = async (clientId: string) => {
    if (!user) return

    try {
      console.log('🗑️ Deleting client:', clientId)
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Delete client error:', error)
        throw error
      }

      console.log('✅ Client deleted')
      setClients(prev => prev.filter(client => client.id !== clientId))
      setProjects(prev => prev.filter(project => project.client_id !== clientId))
      
    } catch (err) {
      console.error('💥 Error deleting client:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete client')
    }
  }

  // Project operations
  const addProject = async (projectData: { client_id: string; name: string; due_date: string; description?: string }) => {
    if (!user) {
      console.error('❌ No user available for adding project')
      return null
    }

    try {
      console.log('➕ Adding project:', projectData.name)
      
      // Check subscription limits
      const currentCount = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      if (currentCount.count && currentCount.count >= user.subscription.maxProjects) {
        throw new Error(`Project limit reached (${user.subscription.maxProjects}). Upgrade your plan to create more projects.`);
      }

      // Generate customer_id in the format your schema expects
      const customerId = `CUST_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          customer_id: customerId,
          user_id: user.id,
          status: 'Setup',
          progress: 0
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Add project error:', error)
        throw error
      }

      // Get client name for display
      const client = clients.find(c => c.id === data.client_id)
      const newProject = { 
        ...data, 
        client: client?.name || 'Unknown Client',
        dueDate: data.due_date,
        stakeholders_count: 0
      }

      console.log('✅ Project added:', newProject.name)
      console.log('🔍 Project ID created:', newProject.id)
      setProjects(prev => [newProject, ...prev])
      return newProject

    } catch (err) {
      console.error('💥 Error adding project:', err)
      setError(err instanceof Error ? err.message : 'Failed to add project')
      return null
    }
  }

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!user) return null

    try {
      console.log('✏️ Updating project:', projectId)
      
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Update project error:', error)
        throw error
      }

      // Get client name for display
      const client = clients.find(c => c.id === data.client_id)
      const updatedProject = {
        ...data,
        client: client?.name || 'Unknown Client',
        dueDate: data.due_date
      }

      console.log('✅ Project updated:', updatedProject.name)
      setProjects(prev => prev.map(project => 
        project.id === projectId ? updatedProject : project
      ))
      
      return updatedProject

    } catch (err) {
      console.error('💥 Error updating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to update project')
      return null
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!user) return

    try {
      console.log('🗑️ Deleting project:', projectId)
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Delete project error:', error)
        throw error
      }

      console.log('✅ Project deleted')
      setProjects(prev => prev.filter(project => project.id !== projectId))
      
    } catch (err) {
      console.error('💥 Error deleting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  // Stakeholder operations
  const addStakeholder = async (stakeholderData: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null

    try {
      console.log('➕ Adding stakeholder:', stakeholderData.name)
      
      const { data, error } = await supabase
        .from('stakeholders')
        .insert(stakeholderData)
        .select()
        .single()

      if (error) {
        console.error('❌ Add stakeholder error:', error)
        throw error
      }

      console.log('✅ Stakeholder added:', data.name)
      return data

    } catch (err) {
      console.error('💥 Error adding stakeholder:', err)
      setError(err instanceof Error ? err.message : 'Failed to add stakeholder')
      return null
    }
  }

  const updateStakeholder = async (stakeholderId: string, updates: Partial<Stakeholder>) => {
    if (!user) return null

    try {
      console.log('✏️ Updating stakeholder:', stakeholderId)
      
      const { data, error } = await supabase
        .from('stakeholders')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', stakeholderId)
        .select()
        .single()

      if (error) {
        console.error('❌ Update stakeholder error:', error)
        throw error
      }

      console.log('✅ Stakeholder updated:', data.name)
      return data

    } catch (err) {
      console.error('💥 Error updating stakeholder:', err)
      setError(err instanceof Error ? err.message : 'Failed to update stakeholder')
      return null
    }
  }

  const deleteStakeholder = async (stakeholderId: string) => {
    if (!user) return

    try {
      console.log('🗑️ Deleting stakeholder:', stakeholderId)
      
      const { error } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', stakeholderId)

      if (error) {
        console.error('❌ Delete stakeholder error:', error)
        throw error
      }

      console.log('✅ Stakeholder deleted')
      
    } catch (err) {
      console.error('💥 Error deleting stakeholder:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete stakeholder')
    }
  }

  // Question operations
  const addQuestion = async (questionData: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null

    try {
      console.log('➕ Adding question to project:', questionData.project_id)
      
      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single()

      if (error) {
        console.error('❌ Add question error:', error)
        throw error
      }

      console.log('✅ Question added')
      return data

    } catch (err) {
      console.error('💥 Error adding question:', err)
      setError(err instanceof Error ? err.message : 'Failed to add question')
      return null
    }
  }

  const updateQuestion = async (questionId: string, updates: Partial<Question>) => {
    if (!user) return null

    try {
      console.log('✏️ Updating question:', questionId)
      
      const { data, error } = await supabase
        .from('questions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId)
        .select()
        .single()

      if (error) {
        console.error('❌ Update question error:', error)
        throw error
      }

      console.log('✅ Question updated')
      return data

    } catch (err) {
      console.error('💥 Error updating question:', err)
      setError(err instanceof Error ? err.message : 'Failed to update question')
      return null
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!user) return

    try {
      console.log('🗑️ Deleting question:', questionId)
      
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)

      if (error) {
        console.error('❌ Delete question error:', error)
        throw error
      }

      console.log('✅ Question deleted')
      
    } catch (err) {
      console.error('💥 Error deleting question:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete question')
    }
  }

  // Project-specific data operations
  const getProjectStakeholders = async (projectId: string): Promise<Stakeholder[]> => {
    try {
      console.log('👥 Loading stakeholders for project:', projectId)
      
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Stakeholders error:', error)
        return []
      }

      console.log('✅ Loaded stakeholders:', data?.length || 0)
      return data || []

    } catch (err) {
      console.error('💥 Error loading stakeholders:', err)
      return []
    }
  }

  const getProjectQuestions = async (projectId: string): Promise<Question[]> => {
    try {
      console.log('❓ Loading questions for project:', projectId)
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Questions error:', error)
        return []
      }

      console.log('✅ Loaded questions:', data?.length || 0)
      return data || []

    } catch (err) {
      console.error('💥 Error loading questions:', err)
      return []
    }
  }

  const getProjectDocuments = async (projectId: string): Promise<Document[]> => {
    try {
      console.log('📄 Loading documents for project:', projectId)
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Documents error:', error)
        return []
      }

      console.log('✅ Loaded documents:', data?.length || 0)
      return data || []

    } catch (err) {
      console.error('💥 Error loading documents:', err)
      return []
    }
  }

  // Helper functions
  const getProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    console.log('🔍 Looking for project:', projectId, 'Found:', !!project)
    return project
  }

  const getClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    console.log('🔍 Looking for client:', clientId, 'Found:', !!client)
    return client
  }

  // Calculate metrics
  const metrics = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status !== 'Complete').length,
    completedProjects: projects.filter(p => p.status === 'Complete').length,
    totalClients: clients.length,
    totalStakeholders: stakeholderCount,
    avgCompletion: projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  }

  return {
    // Data
    clients,
    projects,
    loading,
    error,
    metrics,
    
    // Client operations
    addClient,
    updateClient,
    deleteClient,
    
    // Project operations
    addProject,
    updateProject,
    deleteProject,
    getProject,
    getClient,
    
    // Stakeholder operations
    addStakeholder,
    updateStakeholder,
    deleteStakeholder,
    
    // Question operations
    addQuestion,
    updateQuestion,
    deleteQuestion,
    
    // Project-specific operations
    getProjectStakeholders,
    getProjectQuestions,
    getProjectDocuments
  }
}