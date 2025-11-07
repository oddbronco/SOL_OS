export const getMuxPlaybackToken = async (playbackId: string): Promise<string | null> => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mux-playback-token`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playbackId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to get Mux playback token:', error);
      return null;
    }

    const result = await response.json();
    return result.token;
  } catch (error) {
    console.error('Error fetching Mux playback token:', error);
    return null;
  }
};

export const getMuxPlaybackUrl = (playbackId: string, token?: string): string => {
  const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  return token ? `${baseUrl}?token=${token}` : baseUrl;
};
