import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { VideoAssignmentModal } from './VideoAssignmentModal';
import { triggerMuxUpload } from '../../utils/muxUpload';
import { Video, Upload, Link as LinkIcon, Play, Trash2, Edit, Check, X, Camera, Square, RotateCcw, UserPlus, Users, AlertCircle } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const convertVideoToBrowserMP4 = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  let lastProgress = 0;

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
          setTimeout(() => reject(new Error('CDN timeout')), 45000)
        )
      ]);
      loaded = true;
    } catch (err) {
      continue;
    }
  }

  if (!loaded) {
    throw new Error('Could not load video converter');
  }

  onProgress?.(10);

  const inputData = await fetchFile(videoFile);
  await ffmpeg.writeFile('input.video', inputData);

  onProgress?.(15);

  // Convert to browser-compatible MP4: H.264 baseline profile, AAC audio, faststart
  await ffmpeg.exec([
    '-i', 'input.video',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-level', '3.0',
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

  await ffmpeg.deleteFile('input.video');
  await ffmpeg.deleteFile('output.mp4');

  onProgress?.(100);
  return mp4Blob;
};

interface IntroVideo {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: 'upload' | 'external';
  duration_seconds: number | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface IntroVideoManagerProps {
  projectId: string;
}

export const IntroVideoManager: React.FC<IntroVideoManagerProps> = ({ projectId }) => {
  const [videos, setVideos] = useState<IntroVideo[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<IntroVideo | null>(null);
  const [videoType, setVideoType] = useState<'external' | 'upload' | 'record'>('external');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    await Promise.all([
      loadVideos(),
      loadStakeholders(),
      loadInterviewSessions(),
      loadAssignments()
    ]);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Try MP4 first (Safari), then WebM (Chrome/Firefox)
      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }
      }

      console.log('📹 Recording with format:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newTime >= 300) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Could not access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('project_intro_videos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, name, email')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setStakeholders(data || []);
    } catch (err) {
      console.error('Error loading stakeholders:', err);
    }
  };

  const loadInterviewSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select(`
          id,
          stakeholder_id,
          session_token,
          created_at,
          stakeholders (name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterviewSessions(data || []);
    } catch (err) {
      console.error('Error loading interview sessions:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('intro_video_assignments')
        .select(`
          id,
          video_id,
          stakeholder_id,
          interview_session_id,
          stakeholders (name),
          interview_sessions (session_token)
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!title.trim()) {
        setError('Please enter a title');
        return;
      }

      if (videoType === 'external' && !videoUrl.trim()) {
        setError('Please enter a video URL');
        return;
      }

      if (videoType === 'record' && !recordedBlob) {
        setError('Please record a video first');
        return;
      }

      if (videoType === 'upload' && !uploadedFile) {
        setError('Please select a video file');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let finalVideoUrl = videoUrl.trim();

      if (videoType === 'record' && recordedBlob) {
        console.log('🎬 Uploading recorded video...');

        // Determine file extension from MIME type
        const fileExtension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `${projectId}/${Date.now()}-intro-video.${fileExtension}`;

        console.log(`📦 Uploading as ${fileExtension} (${recordedBlob.type})`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-intro-videos')
          .upload(fileName, recordedBlob, {
            contentType: recordedBlob.type,
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-intro-videos')
          .getPublicUrl(fileName);

        finalVideoUrl = publicUrl;

        // Show format info
        if (fileExtension === 'webm') {
          console.warn('⚠️ Uploaded as WebM - may not work in Safari');
        } else {
          console.log('✅ Uploaded as MP4 - compatible with all browsers');
        }
      }

      if (videoType === 'upload' && uploadedFile) {
        // ALWAYS convert uploaded videos to ensure browser compatibility
        console.log('🔄 Converting uploaded video to browser-compatible MP4...');
        setConverting(true);
        setConversionProgress(0);

        try {
          const convertedBlob = await convertVideoToBrowserMP4(
            uploadedFile,
            (progress) => setConversionProgress(progress)
          );

          const fileName = `${projectId}/${Date.now()}-intro-video.mp4`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-intro-videos')
            .upload(fileName, convertedBlob, {
              contentType: 'video/mp4',
              cacheControl: '3600'
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('project-intro-videos')
            .getPublicUrl(fileName);

          finalVideoUrl = publicUrl;
          console.log('✅ Video converted and uploaded successfully');
        } catch (conversionError: any) {
          throw new Error(`Video conversion failed: ${conversionError.message}`);
        } finally {
          setConverting(false);
          setConversionProgress(0);
        }
      }

      const isUploadType = videoType === 'upload' || videoType === 'record';

      const { data: insertData, error } = await supabase
        .from('project_intro_videos')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          video_url: finalVideoUrl,
          video_type: videoType === 'record' ? 'upload' : videoType,
          duration_seconds: videoType === 'record' ? recordingTime : null,
          created_by: userData.user.id,
          is_active: videos.length === 0,
          mux_status: isUploadType ? 'pending' : 'ready'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger Mux upload for uploaded/recorded videos
      if (isUploadType && insertData) {
        console.log('🎬 Triggering Mux transcode...');
        triggerMuxUpload(insertData.id, projectId);
      }

      setTitle('');
      setDescription('');
      setVideoUrl('');
      setUploadedFile(null);
      setUploadPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      resetRecording();
      setShowAddModal(false);
      loadVideos();
    } catch (err: any) {
      console.error('Error adding video:', err);
      setError(err.message || 'Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (videoId: string, currentActive: boolean) => {
    try {
      if (!currentActive) {
        await supabase
          .from('project_intro_videos')
          .update({ is_active: false })
          .eq('project_id', projectId);
      }

      const { error } = await supabase
        .from('project_intro_videos')
        .update({ is_active: !currentActive })
        .eq('id', videoId);

      if (error) throw error;
      loadVideos();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const convertExistingVideo = async (video: IntroVideo) => {
    if (!confirm('Process this video with Mux for universal compatibility?\n\nMux will transcode it to all formats automatically.')) {
      return;
    }

    try {
      await supabase
        .from('project_intro_videos')
        .update({ mux_status: 'pending' })
        .eq('id', video.id);

      await triggerMuxUpload(video.id, projectId);

      alert('Mux processing started! This typically takes 30-60 seconds.\n\nThe page will refresh automatically when complete.');
      loadVideos();
    } catch (err: any) {
      console.error('❌ Mux error:', err);
      alert(`Failed to start processing: ${err.message}\n\nPlease ensure your Mux credentials are configured in Settings → Integrations.`);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { error } = await supabase
        .from('project_intro_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      loadVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
    }
  };

  const getEmbedUrl = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('/').pop()?.split('?')[0]
        : new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }

    return url;
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="h-5 w-5" />
              Introduction Videos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Add a welcome video that stakeholders see before starting their interview
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            icon={Upload}
            size="sm"
          >
            Add Video
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No introduction videos yet</p>
            <Button onClick={() => setShowAddModal(true)} size="sm" icon={Upload}>
              Add Your First Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const videoAssignments = assignments.filter(a => a.video_id === video.id);
              return (
                <Card key={video.id} className={video.is_active ? 'border-2 border-primary-500' : ''}>
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 w-32 h-20 bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
                      onClick={() => {
                        setSelectedVideo(video);
                        setShowPreviewModal(true);
                      }}
                    >
                      {video.video_type === 'external' ? (
                        <iframe
                          src={getEmbedUrl(video.video_url)}
                          className="w-full h-full pointer-events-none"
                          title={video.title}
                        />
                      ) : (
                        <video
                          src={video.video_url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                      {video.is_active && (
                        <div className="absolute top-1 right-1 bg-primary-600 text-white text-xs px-2 py-0.5 rounded">
                          Default
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{video.title}</h4>
                          {video.description && (
                            <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              {video.video_type === 'external' ? 'External Video' : 'Uploaded'}
                            </span>
                            <span>Added {new Date(video.created_at).toLocaleDateString()}</span>

                            {/* Show conversion status */}
                            {(video as any).mux_status === 'pending' && (
                              <span className="flex items-center gap-1 text-blue-600 font-semibold animate-pulse">
                                🔄 Processing with Mux...
                              </span>
                            )}
                            {(video as any).mux_status === 'processing' && (
                              <span className="flex items-center gap-1 text-blue-600 font-semibold animate-pulse">
                                🔄 Transcoding...
                              </span>
                            )}
                            {(video as any).mux_status === 'error' && (
                              <span className="flex items-center gap-1 text-red-600 font-semibold">
                                ❌ Processing failed
                              </span>
                            )}
                            {(video as any).mux_status === 'ready' && (video as any).mux_playback_id && (
                              <span className="flex items-center gap-1 text-green-600 font-semibold">
                                ✅ Ready (Mux)
                              </span>
                            )}
                          </div>
                          {videoAssignments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {videoAssignments.map((assignment: any) => (
                                <Badge key={assignment.id} variant="secondary">
                                  {assignment.stakeholder_id ? (
                                    <>
                                      <Users className="h-3 w-3 mr-1" />
                                      {assignment.stakeholders?.name || 'Stakeholder'}
                                    </>
                                  ) : (
                                    <>
                                      <Video className="h-3 w-3 mr-1" />
                                      Session
                                    </>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {video.video_url.includes('.webm') && (
                            <Button
                              onClick={() => convertExistingVideo(video)}
                              variant="primary"
                              size="sm"
                              disabled={converting && convertingVideoId === video.id}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {converting && convertingVideoId === video.id
                                ? `Converting ${conversionProgress}%`
                                : '🔄 Convert to MP4'}
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedVideo(video);
                              setShowAssignModal(true);
                            }}
                            variant="secondary"
                            size="sm"
                            icon={UserPlus}
                            disabled={converting}
                          >
                            Assign
                          </Button>
                          <Button
                            onClick={() => toggleActive(video.id, video.is_active)}
                            variant={video.is_active ? 'secondary' : 'primary'}
                            size="sm"
                            icon={video.is_active ? X : Check}
                            disabled={converting}
                          >
                            {video.is_active ? 'Remove Default' : 'Make Default'}
                          </Button>
                          <Button
                            onClick={() => deleteVideo(video.id)}
                            variant="secondary"
                            size="sm"
                            icon={Trash2}
                            disabled={converting}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setShowAddModal(false);
          setError(null);
          setTitle('');
          setDescription('');
          setVideoUrl('');
          resetRecording();
          setIsRecording(false);
        }}
        title="Add Introduction Video"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Card className="bg-red-50 border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </Card>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setVideoType('record');
                  resetRecording();
                }}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  videoType === 'record'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Camera className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium text-sm">Record</div>
                <div className="text-xs text-gray-600 mt-1">Use camera</div>
              </button>
              <button
                type="button"
                onClick={() => setVideoType('external')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  videoType === 'external'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LinkIcon className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium text-sm">Link</div>
                <div className="text-xs text-gray-600 mt-1">YouTube, Vimeo</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoType('upload');
                  resetRecording();
                }}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  videoType === 'upload'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium text-sm">Upload</div>
                <div className="text-xs text-gray-600 mt-1">Upload video file</div>
              </button>
            </div>

            {videoType === 'record' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">✅ Automatic Format Conversion</p>
                    <p className="mt-1 text-green-700">
                      Non-MP4 videos (WebM, MOV) will be automatically converted to MP4 for universal compatibility.
                      The conversion happens in the background and typically takes 10-30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {videoType === 'upload' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">✅ Automatic Format Conversion</p>
                    <p className="mt-1 text-green-700">
                      Upload any video format. Non-MP4 files will be automatically converted for universal playback.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Video Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Welcome to the Project"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Brief description of what's in the video..."
            />
          </div>

          {videoType === 'record' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">Automatic Video Conversion</h4>
                    <p className="text-sm text-blue-800">
                      Recorded videos will be automatically converted from WebM to MP4 format for maximum browser compatibility (Safari, Chrome, Firefox, Edge).
                      This may take a moment depending on video length.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {!recordedUrl ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={recordedUrl}
                    controls
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover"
                  />
                )}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="bg-black/75 text-white px-3 py-1 rounded text-xs">
                      {formatTime(300 - recordingTime)} remaining
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                {!isRecording && !recordedUrl && (
                  <Button
                    type="button"
                    onClick={startRecording}
                    icon={Camera}
                    variant="primary"
                  >
                    Start Recording
                  </Button>
                )}
                {isRecording && (
                  <Button
                    type="button"
                    onClick={stopRecording}
                    icon={Square}
                    variant="secondary"
                  >
                    Stop Recording
                  </Button>
                )}
                {recordedUrl && (
                  <>
                    <Button
                      type="button"
                      onClick={resetRecording}
                      icon={RotateCcw}
                      variant="secondary"
                    >
                      Record Again
                    </Button>
                  </>
                )}
              </div>

              {recordedUrl && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Video recorded successfully ({formatTime(recordingTime)})
                  </p>
                </div>
              )}
            </div>
          )}

          {videoType === 'external' && (
            <Input
              label="Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              required
              icon={LinkIcon}
            />
          )}

          {videoType === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 500 * 1024 * 1024) {
                      setError('File size must be less than 500MB');
                      return;
                    }
                    setUploadedFile(file);
                    setUploadPreviewUrl(URL.createObjectURL(file));
                    setError(null);
                  }
                }}
                className="hidden"
              />

              {!uploadedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Click to upload video</p>
                  <p className="text-xs text-gray-500">MP4, WebM, or other video formats (max 500MB, ~5 min at HD quality)</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={uploadPreviewUrl || undefined}
                      controls
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">✓ Video selected</p>
                      <p className="text-xs text-green-600">{uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      variant="secondary"
                      size="sm"
                      icon={X}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {converting && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {conversionProgress <= 10 ? 'Loading FFmpeg (first time may take 30 sec)...' : 'Converting video to MP4...'}
                </span>
                <span className="text-sm font-semibold text-blue-900">{conversionProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {conversionProgress <= 10
                  ? 'Downloading FFmpeg WebAssembly files (~32MB, cached for future use)...'
                  : 'Converting video... Please don\'t close this window.'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
              disabled={converting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || converting || isRecording || (videoType === 'record' && !recordedBlob) || (videoType === 'upload' && !uploadedFile)}
            >
              {converting
                ? `Converting... ${conversionProgress}%`
                : submitting
                ? 'Uploading...'
                : 'Add Video'}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedVideo && (
        <>
          <VideoAssignmentModal
            isOpen={showAssignModal}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedVideo(null);
            }}
            video={selectedVideo}
            projectId={projectId}
            stakeholders={stakeholders}
            interviewSessions={interviewSessions}
            onAssignmentCreated={loadAssignments}
          />

          <Modal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedVideo(null);
            }}
            title={selectedVideo.title}
          >
            <div className="space-y-4">
              {selectedVideo.description && (
                <p className="text-gray-600">{selectedVideo.description}</p>
              )}

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {selectedVideo.video_type === 'external' ? (
                  <iframe
                    src={getEmbedUrl(selectedVideo.video_url)}
                    className="absolute inset-0 w-full h-full"
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    autoPlay
                    playsInline
                    crossOrigin="anonymous"
                    preload="metadata"
                    className="absolute inset-0 w-full h-full"
                    onError={(e: any) => {
                      console.error('❌ Video playback error:', {
                        url: selectedVideo.video_url,
                        error: e.target.error,
                        code: e.target.error?.code,
                        message: e.target.error?.message
                      });
                      setError(`Video playback failed: ${e.target.error?.message || 'Unknown error'}. ${
                        selectedVideo.video_url.includes('.webm')
                          ? 'WebM format may not be supported in your browser. Try Safari for better compatibility or use MP4 format.'
                          : 'Check that the video URL is accessible and has proper CORS headers.'
                      }`);
                    }}
                    onLoadedMetadata={() => {
                      console.log('✅ Video loaded successfully');
                      setError(null);
                    }}
                  >
                    <source src={selectedVideo.video_url} type={
                      selectedVideo.video_url.includes('.webm') ? 'video/webm' :
                      selectedVideo.video_url.includes('.mp4') ? 'video/mp4' :
                      selectedVideo.video_url.includes('.mov') ? 'video/quicktime' :
                      'video/mp4'
                    } />
                    Your browser does not support the video tag. Try a different browser or contact support.
                  </video>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  {selectedVideo.video_type === 'external' ? 'External Video' : 'Uploaded Video'}
                </span>
                {selectedVideo.duration_seconds && (
                  <span>Duration: {Math.floor(selectedVideo.duration_seconds / 60)}:{(selectedVideo.duration_seconds % 60).toString().padStart(2, '0')}</span>
                )}
              </div>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};