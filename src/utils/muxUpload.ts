import { supabase } from '../lib/supabase';

export const triggerMuxUpload = async (videoId: string, projectId: string): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mux-upload-video`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId, projectId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Mux upload failed');
    }

    const result = await response.json();
    console.log('✅ Mux upload triggered:', result);
  } catch (error) {
    console.error('❌ Mux upload failed:', error);
    await supabase
      .from('project_intro_videos')
      .update({
        mux_status: 'error',
        processing_error: error instanceof Error ? error.message : 'Upload failed'
      })
      .eq('id', videoId);
  }
};

export const getMuxPlaybackUrl = (playbackId: string): string => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

export const getMuxThumbnailUrl = (playbackId: string): string => {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg`;
};
