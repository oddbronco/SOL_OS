import { config } from '../config/environment';

export const getMuxPlaybackToken = async (playbackId: string): Promise<string | null> => {
  try {
    console.log('🔑 Fetching Mux playback token for:', playbackId);
    const apiUrl = `${config.supabase.url}/functions/v1/generate-mux-playback-token`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playbackId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to get Mux playback token:', error);
      return null;
    }

    const result = await response.json();

    if (!result.token) {
      console.warn('⚠️ No token returned:', result.message || 'Unknown reason');
      console.warn('💡 Hint: Configure Mux signing keys in System Settings');
    } else {
      console.log('✅ Got Mux playback token (expires:', new Date(result.expiresAt * 1000).toLocaleString(), ')');
    }

    return result.token;
  } catch (error) {
    console.error('❌ Error fetching Mux playback token:', error);
    return null;
  }
};

export const getMuxPlaybackUrl = (playbackId: string, token?: string): string => {
  const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  return token ? `${baseUrl}?token=${token}` : baseUrl;
};
