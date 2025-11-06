import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Video, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const convertWebMToMP4 = async (
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  let lastProgress = 0;

  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  ffmpeg.on('progress', ({ progress }) => {
    const percent = Math.round(progress * 100);
    if (percent !== lastProgress) {
      lastProgress = percent;
      onProgress?.(percent);
    }
  });

  onProgress?.(5);

  const cdnSources = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
  ];

  let loaded = false;
  for (const baseURL of cdnSources) {
    if (loaded) break;
    try {
      await Promise.race([
        ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('CDN timeout after 45 seconds')), 45000)
        )
      ]);
      loaded = true;
    } catch (err) {
      console.warn(`Failed to load from ${baseURL}:`, err);
      continue;
    }
  }

  if (!loaded) {
    throw new Error('Could not load FFmpeg from any CDN');
  }

  onProgress?.(10);

  const inputData = await fetchFile(webmBlob);
  await ffmpeg.writeFile('input.webm', inputData);

  onProgress?.(15);

  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    'output.mp4'
  ]);

  onProgress?.(95);

  const data = await ffmpeg.readFile('output.mp4');
  const mp4Blob = new Blob([data], { type: 'video/mp4' });

  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');

  onProgress?.(100);
  return mp4Blob;
};

interface VideoRecord {
  id: string;
  project_id: string;
  title: string;
  video_url: string;
  projects?: {
    name: string;
  };
}

interface ConversionStatus {
  videoId: string;
  status: 'pending' | 'converting' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const VideoConverter: React.FC = () => {
  const [webmVideos, setWebmVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [conversionStatuses, setConversionStatuses] = useState<Record<string, ConversionStatus>>({});

  useEffect(() => {
    loadWebMVideos();
  }, []);

  const loadWebMVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('project_intro_videos')
        .select('id, project_id, title, video_url, projects(name)')
        .like('video_url', '%.webm%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebmVideos(data || []);
    } catch (err) {
      console.error('Error loading WebM videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertSingleVideo = async (video: VideoRecord) => {
    const updateStatus = (updates: Partial<ConversionStatus>) => {
      setConversionStatuses(prev => ({
        ...prev,
        [video.id]: { ...prev[video.id], videoId: video.id, ...updates } as ConversionStatus
      }));
    };

    updateStatus({ status: 'converting', progress: 0 });

    try {
      console.log(`🔄 Converting: ${video.title}`);

      // Download WebM
      const response = await fetch(video.video_url);
      if (!response.ok) throw new Error('Failed to download video');

      const webmBlob = await response.blob();

      // Convert to MP4
      const mp4Blob = await convertWebMToMP4(webmBlob, (progress) => {
        updateStatus({ progress });
      });

      // Upload MP4
      const fileName = `${video.project_id}/${Date.now()}-intro-video.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('project-intro-videos')
        .upload(fileName, mp4Blob, {
          contentType: 'video/mp4',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-intro-videos')
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from('project_intro_videos')
        .update({ video_url: publicUrl })
        .eq('id', video.id);

      if (updateError) throw updateError;

      // Delete old WebM
      const oldPath = video.video_url.split('/project-intro-videos/')[1];
      if (oldPath) {
        await supabase.storage
          .from('project-intro-videos')
          .remove([oldPath]);
      }

      updateStatus({ status: 'success', progress: 100 });
      console.log(`✅ Converted: ${video.title}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      updateStatus({ status: 'error', progress: 0, error: errorMsg });
      console.error(`❌ Failed to convert ${video.title}:`, err);
    }
  };

  const convertAllVideos = async () => {
    setConverting(true);

    for (const video of webmVideos) {
      await convertSingleVideo(video);
    }

    setConverting(false);
    setTimeout(() => loadWebMVideos(), 2000);
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <Loader className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Loading videos...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Video className="h-6 w-6" />
            WebM to MP4 Video Converter
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Convert existing WebM videos to MP4 for universal browser compatibility
          </p>
        </div>
        {webmVideos.length > 0 && (
          <Button
            onClick={convertAllVideos}
            disabled={converting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {converting ? 'Converting...' : `Convert All ${webmVideos.length} Videos`}
          </Button>
        )}
      </div>

      {webmVideos.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <h3 className="text-lg font-medium text-green-900 mb-1">All Videos Compatible!</h3>
          <p className="text-sm text-green-700">
            No WebM videos found. All videos are in MP4 format and work in all browsers.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">
                  {webmVideos.length} WebM {webmVideos.length === 1 ? 'video' : 'videos'} found
                </h4>
                <p className="text-sm text-yellow-800">
                  These videos don't work in Safari or iOS browsers. Convert them to MP4 for universal compatibility.
                  Conversion happens in your browser and may take 1-2 minutes per video.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {webmVideos.map((video) => {
              const status = conversionStatuses[video.id];
              return (
                <div
                  key={video.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{video.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Project: {video.projects?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {video.video_url}
                      </p>
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      {status?.status === 'converting' && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600 mb-1">
                            Converting... {status.progress}%
                          </div>
                          <div className="w-32 bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${status.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {status?.status === 'success' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Converted!</span>
                        </div>
                      )}

                      {status?.status === 'error' && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-red-600 mb-1">
                            <AlertCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Failed</span>
                          </div>
                          <p className="text-xs text-red-600">{status.error}</p>
                        </div>
                      )}

                      {!status && (
                        <Button
                          onClick={() => convertSingleVideo(video)}
                          disabled={converting}
                          size="sm"
                          variant="secondary"
                        >
                          Convert
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};
