import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface InterviewSession {
  id: string;
  project_id: string;
  stakeholder_id: string;
  session_token: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  total_questions: number;
  answered_questions: number;
  completion_percentage: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  stakeholder?: {
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

export interface QuestionAssignment {
  id: string;
  project_id: string;
  stakeholder_id: string;
  question_id: string;
  interview_session_id?: string;
  is_required: boolean;
  order_index: number;
  assigned_at: string;
  question?: {
    text: string;
    category: string;
    target_roles: string[];
  };
  response?: InterviewResponse;
}

export interface InterviewResponse {
  id: string;
  project_id: string;
  stakeholder_id: string;
  question_id: string;
  interview_session_id?: string;
  question_assignment_id?: string;
  response_type: 'text' | 'audio' | 'video' | 'file';
  response_text?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  duration_seconds?: number;
  transcription?: string;
  ai_summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewMaterial {
  id: string;
  project_id: string;
  stakeholder_id: string;
  interview_session_id?: string;
  material_type: 'document' | 'image' | 'audio' | 'video' | 'other';
  file_name: string;
  file_url: string;
  file_size?: number;
  description?: string;
  uploaded_by?: string;
  created_at: string;
}

export const useInterviews = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get interview sessions for a project
  const getProjectInterviewSessions = async (projectId: string): Promise<InterviewSession[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('interview_sessions')
        .select(`
          *,
          stakeholder:stakeholders(name, email, role, department)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return data?.map(session => ({
        ...session,
        stakeholder: session.stakeholder
      })) || [];

    } catch (err) {
      console.error('Error loading interview sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interview sessions');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Generate secure session token
  const generateSessionToken = (): string => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Create interview session for stakeholder
  const createInterviewSession = async (
    projectId: string,
    stakeholderId: string,
    interviewName?: string,
    interviewType?: string
  ): Promise<InterviewSession | null> => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique session token
      const sessionToken = generateSessionToken();

      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Count existing interviews for default naming
      const { data: existingSessions } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('stakeholder_id', stakeholderId);

      const interviewCount = (existingSessions?.length || 0) + 1;
      const defaultName = interviewName || `Interview #${interviewCount}`;

      const { data, error: createError } = await supabase
        .from('interview_sessions')
        .insert({
          project_id: projectId,
          stakeholder_id: stakeholderId,
          status: 'pending',
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          interview_name: defaultName,
          interview_type: interviewType || 'other'
        })
        .select()
        .single();

      if (createError) throw createError;

      console.log('✅ Interview session created:', defaultName);
      console.log('🔑 Token:', sessionToken);
      console.log('⏰ Expires:', expiresAt.toLocaleString());

      return data;

    } catch (err) {
      console.error('Error creating interview session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create interview session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get question assignments for stakeholder
  const getStakeholderQuestionAssignments = async (stakeholderId: string, sessionId?: string): Promise<QuestionAssignment[]> => {
    try {
      console.log('🔍 getStakeholderQuestionAssignments called with:', { stakeholderId, sessionId });

      let query = supabase
        .from('question_assignments')
        .select(`
          *,
          question:questions(text, category, target_roles),
          interview_responses(*)
        `)
        .eq('stakeholder_id', stakeholderId);

      // Filter by session if provided
      if (sessionId) {
        console.log('🎯 Filtering by session_id:', sessionId);
        query = query.eq('interview_session_id', sessionId);
      } else {
        console.warn('⚠️ No session ID provided - loading ALL assignments for stakeholder');
      }

      const { data, error: fetchError } = await query.order('order_index', { ascending: true });

      console.log('📊 Query result:', {
        success: !fetchError,
        count: data?.length || 0,
        error: fetchError
      });

      if (fetchError) {
        console.error('❌ Query error:', fetchError);
        throw fetchError;
      }

      const mappedData = data?.map(assignment => ({
        ...assignment,
        question: assignment.question,
        response: assignment.interview_responses?.[0] // Take first response if exists
      })) || [];

      console.log('✅ Returning assignments:', mappedData.length);
      return mappedData;

    } catch (err) {
      console.error('❌ Error loading question assignments:', err);
      return [];
    }
  };

  // Assign questions to stakeholder
  const assignQuestionsToStakeholder = async (
    projectId: string,
    stakeholderId: string,
    questionIds: string[],
    sessionId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Starting question assignment:', {
        projectId,
        stakeholderId,
        questionCount: questionIds.length,
        sessionId
      });

      // Delete existing assignments - either for specific session or all for stakeholder
      console.log('🗑️ Deleting existing assignments...');
      let deleteQuery = supabase
        .from('question_assignments')
        .delete({ count: 'exact' })
        .eq('stakeholder_id', stakeholderId);

      if (sessionId) {
        // Only delete assignments for this specific interview session
        console.log(`  Deleting only for session: ${sessionId}`);
        deleteQuery = deleteQuery.eq('interview_session_id', sessionId);
      } else {
        // Delete all assignments for this stakeholder (backward compatibility)
        console.log(`  Deleting all assignments for stakeholder`);
      }

      const { error: deleteError, count: deletedCount } = await deleteQuery;

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw deleteError;
      }
      console.log(`✅ Deleted ${deletedCount} existing assignments`);

      // Then insert new assignments
      if (questionIds.length > 0) {
        const assignments = questionIds.map((questionId, index) => ({
          project_id: projectId,
          stakeholder_id: stakeholderId,
          question_id: questionId,
          interview_session_id: sessionId || null,
          order_index: index,
          is_required: true
        }));

        console.log('➕ Inserting new assignments:', assignments);
        const { error: insertError, data: insertedData } = await supabase
          .from('question_assignments')
          .insert(assignments)
          .select();

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }
        console.log(`✅ Inserted ${insertedData?.length} new assignments`);
      } else {
        console.log('ℹ️ No questions to assign (all were removed)');
      }

      // Update interview session total_questions count
      if (sessionId) {
        // Update the specific session
        console.log(`🔄 Updating session ${sessionId} total_questions...`);
        const { error: updateError } = await supabase
          .from('interview_sessions')
          .update({
            total_questions: questionIds.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) {
          console.warn('⚠️ Failed to update session total_questions:', updateError);
        } else {
          console.log('✅ Updated session total_questions');
        }
      } else {
        // Update all sessions for this stakeholder (backward compatibility)
        const { data: sessionData } = await supabase
          .from('interview_sessions')
          .select('id')
          .eq('stakeholder_id', stakeholderId)
          .maybeSingle();

        if (sessionData) {
          console.log('🔄 Updating interview session total_questions...');
          const { error: updateError } = await supabase
            .from('interview_sessions')
            .update({
              total_questions: questionIds.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionData.id);

          if (updateError) {
            console.warn('⚠️ Failed to update session total_questions:', updateError);
          } else {
            console.log('✅ Updated session total_questions');
          }
        }
      }

      console.log('✅ Question assignment completed successfully');
      return true;

    } catch (err) {
      console.error('❌ Error assigning questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign questions');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Submit response to question
  const submitResponse = async (
    projectId: string,
    stakeholderId: string,
    questionId: string,
    response: {
      response_type: 'text' | 'audio' | 'video' | 'file';
      response_text?: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      duration_seconds?: number;
      transcription?: string;
      ai_summary?: string;
    },
    sessionId?: string,
    assignmentId?: string
  ): Promise<InterviewResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('💾 Submitting response:', {
        projectId,
        stakeholderId,
        questionId,
        responseType: response.response_type
      });

      const { data, error: submitError } = await supabase
        .from('interview_responses')
        .upsert({
          project_id: projectId,
          stakeholder_id: stakeholderId,
          question_id: questionId,
          interview_session_id: sessionId,
          question_assignment_id: assignmentId,
          ...response
        }, {
          onConflict: 'stakeholder_id,question_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (submitError) throw submitError;

      console.log('✅ Response saved successfully:', data);
      
      // Update stakeholder status to 'responded' if this is their first response
      try {
        const { data: stakeholderData } = await supabase
          .from('stakeholders')
          .select('status')
          .eq('id', stakeholderId)
          .single();
          
        if (stakeholderData?.status === 'pending' || stakeholderData?.status === 'invited') {
          await supabase
            .from('stakeholders')
            .update({ status: 'responded' })
            .eq('id', stakeholderId);
          console.log('✅ Updated stakeholder status to responded');
        }
      } catch (statusError) {
        console.warn('⚠️ Could not update stakeholder status:', statusError);
      }
      
      return data;

    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit response');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Upload interview material
  const uploadInterviewMaterial = async (
    projectId: string,
    stakeholderId: string,
    file: File,
    description?: string,
    sessionId?: string
  ): Promise<InterviewMaterial | null> => {
    try {
      setLoading(true);
      setError(null);

      return await uploadFile(projectId, stakeholderId, file, 'material', description, sessionId);

    } catch (err) {
      console.error('Error uploading material:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload material');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Upload file to Supabase storage with proper tracking
  const uploadFile = async (
    projectId: string,
    stakeholderId: string,
    file: File,
    purpose: 'response' | 'material' | 'transcript' | 'document' = 'response',
    description?: string,
    sessionId?: string
  ): Promise<any> => {
    try {
      if (!user) throw new Error('User not authenticated');

      console.log('📤 Starting file upload process...');
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        purpose
      });

      // Check file size limit (50MB)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 100MB limit. Please use a smaller file.`);
      }

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `interview-files/${projectId}/${stakeholderId}/${fileName}`;

      console.log('📤 Uploading file to Supabase storage:', filePath);

      // Try to upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('interview-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        
        // Handle bucket not found error
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket does not exist')) {
          console.log('🪣 Creating interview-files bucket...');
          
          // Note: In WebContainer, we can't create storage buckets
          // This needs to be done in the Supabase dashboard
          throw new Error('Storage bucket not found. Please create the "interview-files" bucket in your Supabase dashboard with public access enabled.');
        }
        
        // Handle file size errors
        if (uploadError.message.includes('exceeded') || uploadError.message.includes('size')) {
          throw new Error(`File too large. Maximum file size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        }
        
        // Handle other upload errors
        throw new Error(`Upload failed: ${uploadError.message}. Please check file format and size.`);
      }

      console.log('✅ File uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('interview-files')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL generated:', urlData.publicUrl);

      // Get file duration for media files
      let duration_seconds = 0;
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        try {
          duration_seconds = await getMediaDuration(file);
          console.log('⏱️ Media duration:', duration_seconds, 'seconds');
        } catch (durationError) {
          console.warn('⚠️ Could not get media duration:', durationError);
        }
      }

      // Save to file_storage table
      const { data: fileRecord, error: fileError } = await supabase
        .from('file_storage')
        .insert({
          user_id: user.id,
          project_id: projectId,
          stakeholder_id: stakeholderId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: fileExt || 'unknown',
          mime_type: file.type,
          purpose,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            description,
            duration_seconds
          }
        })
        .select()
        .single();

      if (fileError) {
        console.error('❌ File record error:', fileError);
        // Don't throw here - file was uploaded successfully
        console.warn('⚠️ File uploaded but record creation failed:', fileError.message);
      } else {
        console.log('✅ File record saved:', fileRecord);
      }

      return {
        file_storage_id: fileRecord?.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        duration_seconds
      };

    } catch (err) {
      console.error('💥 File upload failed:', err);
      throw err;
    }
  };

  // Transcribe audio using OpenAI
  const transcribeAudio = async (fileUrlOrFile: string | File): Promise<string> => {
    try {
      console.log('🎤 Starting transcription...');
      
      let file: File;
      
      if (typeof fileUrlOrFile === 'string') {
        // Fetch the file from URL
        console.log('📥 Fetching file from URL:', fileUrlOrFile);
        const response = await fetch(fileUrlOrFile);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        file = new File([blob], `recording-${timestamp}.webm`, { type: blob.type });
      } else {
        // Use the file directly
        file = fileUrlOrFile;
      }
      
      console.log('🎤 Transcribing file:', file.name, file.type, file.size);
      
      // Use OpenAI service for transcription
      const { openAIService } = await import('../services/openai');
      const transcription = await openAIService.transcribeAudio(file);
      
      console.log('✅ Transcription completed:', transcription.substring(0, 100));
      
      // Store transcription in database
      if (user) {
        try {
          const fileUrl = typeof fileUrlOrFile === 'string' ? fileUrlOrFile : URL.createObjectURL(file);
          const timestamp = new Date().toISOString();
          
          const { data: transcriptionData, error: transcriptionError } = await supabase
            .from('transcriptions')
            .insert({
              file_storage_id: null, // Will be linked later if needed
              original_file_url: fileUrl,
              transcription_text: transcription,
              confidence_score: 0.95,
              language: 'en',
              word_count: transcription.split(' ').length,
              processing_status: 'completed',
              created_at: timestamp
            })
            .select()
            .single();
          
          if (transcriptionError) {
            console.error('❌ Failed to store transcription:', transcriptionError);
          } else {
            console.log('✅ Transcription stored in database with ID:', transcriptionData?.id);
          }
        } catch (dbError) {
          console.error('❌ Database error storing transcription:', dbError);
        }
      }
      
      return transcription;
    } catch (error) {
      console.error('❌ Transcription failed:', error);
      throw error;
    }
  };

  // Get media duration
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const element = file.type.startsWith('video/') 
        ? document.createElement('video')
        : document.createElement('audio');
      
      element.onloadedmetadata = () => {
        resolve(Math.round(element.duration));
        URL.revokeObjectURL(url);
      };
      
      element.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(url);
      };
      
      element.src = url;
    });
  };

  // Get interview materials for session
  const getInterviewMaterials = async (sessionId: string): Promise<InterviewMaterial[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('interview_materials')
        .select('*')
        .eq('interview_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return data || [];

    } catch (err) {
      console.error('Error loading interview materials:', err);
      return [];
    }
  };

  // Generate interview link with session token
  const generateInterviewLink = (sessionToken: string, password?: string): string => {
    // Use interviews subdomain for cleaner, more professional URLs
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5173'
      : 'https://interviews.solprojectos.com';
    return `${baseUrl}/i/${sessionToken}${password ? `?pwd=${password}` : ''}`;
  };

  // Legacy function for backwards compatibility (deprecated)
  const generateInterviewLinkLegacy = (projectId: string, stakeholderId: string, password?: string): string => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5173'
      : 'https://interviews.solprojectos.com';
    return `${baseUrl}/interview?project=${projectId}&stakeholder=${stakeholderId}${password ? `&pwd=${password}` : ''}`;
  };

  // Update interview session status
  const updateInterviewSessionStatus = async (
    stakeholderId: string, 
    status: InterviewSession['status']
  ): Promise<boolean> => {
    try {
      console.log('🔄 Updating interview session status:', stakeholderId, status);
      
      const updates: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'in_progress' && !updates.started_at) {
        updates.started_at = new Date().toISOString();
      }
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completion_percentage = 100;
        
        // Also update stakeholder status to completed
        await supabase
          .from('stakeholders')
          .update({ status: 'completed' })
          .eq('id', stakeholderId);
        
        console.log('✅ Updated stakeholder status to completed');
      }

      const { error } = await supabase
        .from('interview_sessions')
        .update(updates)
        .eq('stakeholder_id', stakeholderId);

      if (error) throw error;
      
      console.log('✅ Interview session status updated successfully');

      return true;

    } catch (err) {
      console.error('Error updating interview session:', err);
      return false;
    }
  };

  // Create a custom question for a project
  const createCustomQuestion = async (
    projectId: string,
    questionData: {
      text: string;
      category: string;
      target_roles: string[];
    }
  ): Promise<{ id: string } | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('questions')
        .insert({
          project_id: projectId,
          text: questionData.text,
          category: questionData.category,
          target_roles: questionData.target_roles
        })
        .select()
        .single();

      if (createError) throw createError;

      console.log('✅ Custom question created:', data);
      return data;

    } catch (err) {
      console.error('Error creating custom question:', err);
      setError(err instanceof Error ? err.message : 'Failed to create custom question');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all question assignments for a project
  const getProjectQuestionAssignments = async (projectId: string): Promise<QuestionAssignment[]> => {
    try {
      const { data, error } = await supabase
        .from('question_assignments')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching project question assignments:', error);
      return [];
    }
  };

  return {
    loading,
    error,
    getProjectInterviewSessions,
    createInterviewSession,
    getStakeholderQuestionAssignments,
    getProjectQuestionAssignments,
    assignQuestionsToStakeholder,
    createCustomQuestion,
    submitResponse,
    uploadFile,
    transcribeAudio,
    uploadInterviewMaterial,
    getInterviewMaterials,
    generateInterviewLink,
    generateInterviewLinkLegacy,
    updateInterviewSessionStatus
  };
};