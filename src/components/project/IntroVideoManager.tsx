import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Video, Upload, Link as LinkIcon, Play, Trash2, Edit, Check, X, Camera, Square, RotateCcw } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadVideos();
  }, [projectId]);

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access camera. Please check permissions.');
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

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let finalVideoUrl = videoUrl.trim();

      if (videoType === 'record' && recordedBlob) {
        const fileName = `${projectId}/${Date.now()}-intro-video.webm`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-intro-videos')
          .upload(fileName, recordedBlob, {
            contentType: 'video/webm',
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-intro-videos')
          .getPublicUrl(fileName);

        finalVideoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('project_intro_videos')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          video_url: finalVideoUrl,
          video_type: videoType === 'record' ? 'upload' : videoType,
          duration_seconds: videoType === 'record' ? recordingTime : null,
          created_by: userData.user.id,
          is_active: videos.length === 0
        });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setVideoUrl('');
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
            {videos.map((video) => (
              <Card key={video.id} className={video.is_active ? 'border-2 border-primary-500' : ''}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-32 h-20 bg-gray-100 rounded-lg overflow-hidden relative group">
                    {video.video_type === 'external' ? (
                      <iframe
                        src={getEmbedUrl(video.video_url)}
                        className="w-full h-full pointer-events-none"
                        title={video.title}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {video.is_active && (
                      <div className="absolute top-1 right-1 bg-primary-600 text-white text-xs px-2 py-0.5 rounded">
                        Active
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
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => toggleActive(video.id, video.is_active)}
                          variant={video.is_active ? 'secondary' : 'primary'}
                          size="sm"
                          icon={video.is_active ? X : Check}
                        >
                          {video.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => deleteVideo(video.id)}
                          variant="secondary"
                          size="sm"
                          icon={Trash2}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
                onClick={() => setVideoType('upload')}
                disabled
                className="p-4 border-2 rounded-lg text-center opacity-50 cursor-not-allowed border-gray-200"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium text-sm">Upload</div>
                <div className="text-xs text-gray-600 mt-1">Coming soon</div>
              </button>
            </div>
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
                    className="w-full h-full object-cover"
                  />
                )}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
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
            <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Video upload functionality coming soon</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || videoType === 'upload' || isRecording || (videoType === 'record' && !recordedBlob)}
            >
              {submitting ? 'Uploading...' : 'Add Video'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};