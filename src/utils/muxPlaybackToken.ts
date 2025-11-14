import { config } from '../config/environment';

export const getMuxPlaybackToken = async (playbackId: string): Promise<string | null> => {
  try {
    console.log('🔑 Fetching Mux playback token for:', playbackId);
    const apiUrl = `${config.supabase.url}/functions/v1/generate-mux-playback-token`;
    console.log('📡 API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.supabase.anonKey}`,
      },
      body: JSON.stringify({ playbackId }),
    });

    console.log('📊 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get Mux playback token:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      try {
        const error = JSON.parse(errorText);
        console.error('❌ Error details:', error);
      } catch (e) {
        console.error('❌ Raw error response:', errorText);
      }

      return null;
    }

    const result = await response.json();
    console.log('📦 Token result:', result);

    if (!result.token) {
      console.warn('⚠️ No token returned:', result.message || 'Unknown reason');
      console.warn('💡 Hint: Configure Mux signing keys in System Settings');
      console.log('🔍 Playing without signed URL (video may not work if playback restrictions are enabled)');
    } else {
      console.log('✅ Got Mux playback token (expires:', new Date(result.expiresAt * 1000).toLocaleString(), ')');
    }

    return result.token;
  } catch (error) {
    console.error('❌ Error fetching Mux playback token:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
};

export const getMuxPlaybackUrl = (playbackId: string, token?: string): string => {
  const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  return token ? `${baseUrl}?token=${token}` : baseUrl;
};
