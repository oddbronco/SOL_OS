import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Client {
  id: string;
  userId: string;
  name: string;
  industry: string;
  email: string;
  phone?: string;
  website?: string;
  contactPerson: string;
  projectsCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  isDemo?: boolean;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  client: string;
  clientId?: string;
  status: 'Setup' | 'Transcript Processing' | 'Stakeholder Outreach' | 'Gathering Responses' | 'Document Generation' | 'Complete';
  progress: number;
  stakeholders: number;
  createdAt: string;
  dueDate: string;
  isDemo?: boolean;
}

export const useData = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setClients([]);
      setProjects([]);
      setLoading(false);
    }
  }, [user]);

  const loadUserData = () => {
    if (!user) return;
    
    try {
      // Load clients
      const userClientsKey = `speak_clients_${user.id}`;
      const savedClients = localStorage.getItem(userClientsKey);
      if (savedClients) {
        setClients(JSON.parse(savedClients));
      }
      
      // Load projects
      const userProjectsKey = `speak_projects_${user.id}`;
      const savedProjects = localStorage.getItem(userProjectsKey);
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveClients = (updatedClients: Client[]) => {
    if (!user) return;
    
    setClients(updatedClients);
    const userClientsKey = `speak_clients_${user.id}`;
    localStorage.setItem(userClientsKey, JSON.stringify(updatedClients));
  };

  const saveProjects = (updatedProjects: Project[]) => {
    if (!user) return;
    
    setProjects(updatedProjects);
    const userProjectsKey = `speak_projects_${user.id}`;
    localStorage.setItem(userProjectsKey, JSON.stringify(updatedProjects));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'userId' | 'createdAt' | 'projectsCount'>) => {
    if (!user) return null;
    
    const newClient: Client = {
      id: 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      ...clientData,
      projectsCount: 0,
      createdAt: new Date().toISOString()
    };
    
    const updatedClients = [...clients, newClient];
    saveClients(updatedClients);
    
    return newClient;
  };

  const updateClient = (clientId: string, updates: Partial<Client>) => {
    if (!user) return;
    
    const updatedClients = clients.map(client => 
      client.id === clientId ? { ...client, ...updates } : client
    );
    saveClients(updatedClients);
  };

  const deleteClient = (clientId: string) => {
    if (!user) return;
    
    // Also delete all projects for this client
    const updatedProjects = projects.filter(project => project.clientId !== clientId);
    saveProjects(updatedProjects);
    
    const updatedClients = clients.filter(client => client.id !== clientId);
    saveClients(updatedClients);
  };

  const addProject = (projectData: Omit<Project, 'id' | 'userId' | 'createdAt' | 'progress' | 'stakeholders' | 'status'>) => {
    if (!user) return null;
    
    const newProject: Project = {
      id: 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      ...projectData,
      status: 'Setup',
      progress: 0,
      stakeholders: 0,
      createdAt: new Date().toISOString()
    };
    
    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    
    // Update client project count
    if (projectData.clientId) {
      const client = clients.find(c => c.id === projectData.clientId);
      if (client) {
        updateClient(client.id, { projectsCount: client.projectsCount + 1 });
      }
    }
    
    return newProject;
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    if (!user) return;
    
    const updatedProjects = projects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    );
    saveProjects(updatedProjects);
  };

  const deleteProject = (projectId: string) => {
    if (!user) return;
    
    const project = projects.find(p => p.id === projectId);
    const updatedProjects = projects.filter(project => project.id !== projectId);
    saveProjects(updatedProjects);
    
    // Update client project count
    if (project?.clientId) {
      const client = clients.find(c => c.id === project.clientId);
      if (client && client.projectsCount > 0) {
        updateClient(client.id, { projectsCount: client.projectsCount - 1 });
      }
    }
  };

  const getProject = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  // Calculate metrics
  const metrics = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status !== 'Complete').length,
    completedProjects: projects.filter(p => p.status === 'Complete').length,
    totalClients: clients.length,
    totalStakeholders: projects.reduce((sum, p) => sum + p.stakeholders, 0),
    avgCompletion: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  };

  return {
    clients,
    projects,
    loading,
    metrics,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    getClient,
    refreshData: loadUserData
  };
};