import React, { createContext, useContext } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import type { Client, Project, Stakeholder, Question, Document } from '../hooks/useSupabaseData';

interface DataContextType {
  clients: Client[];
  projects: Project[];
  loading: boolean;
  error: string | null;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalClients: number;
    totalStakeholders: number;
    avgCompletion: number;
  };
  addClient: (clientData: Omit<Client, 'id' | 'agency_id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<Client | null>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client | null>;
  deleteClient: (clientId: string) => Promise<void>;
  addProject: (projectData: { client_id: string; name: string; due_date: string; description?: string }) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;
  getProject: (projectId: string) => Project | undefined;
  getClient: (clientId: string) => Client | undefined;
  addStakeholder: (stakeholderData: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>) => Promise<Stakeholder | null>;
  updateStakeholder: (stakeholderId: string, updates: Partial<Stakeholder>) => Promise<Stakeholder | null>;
  deleteStakeholder: (stakeholderId: string) => Promise<void>;
  addQuestion: (questionData: Omit<Question, 'id' | 'created_at' | 'updated_at'>) => Promise<Question | null>;
  updateQuestion: (questionId: string, updates: Partial<Question>) => Promise<Question | null>;
  deleteQuestion: (questionId: string) => Promise<void>;
  getProjectStakeholders: (projectId: string) => Promise<Stakeholder[]>;
  getProjectQuestions: (projectId: string) => Promise<Question[]>;
  getProjectDocuments: (projectId: string) => Promise<Document[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useSupabaseData();

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
