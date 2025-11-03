import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Video, Upload, Link as LinkIcon, Play, Trash2, Edit, Check, X } from 'lucide-react';

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
  const [videoType, setVideoType] = useState<'external' | 'upload'>('external');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, [projectId]);

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
      if (!title.trim() || !videoUrl.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_intro_videos')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          video_url: videoUrl.trim(),
          video_type: videoType,
          created_by: userData.user.id,
          is_active: videos.length === 0
        });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setVideoUrl('');
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
          setShowAddModal(false);
          setError(null);
          setTitle('');
          setDescription('');
          setVideoUrl('');
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
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setVideoType('external')}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                  videoType === 'external'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <LinkIcon className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium">External Link</div>
                <div className="text-xs text-gray-600 mt-1">YouTube, Vimeo, etc.</div>
              </button>
              <button
                type="button"
                onClick={() => setVideoType('upload')}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-colors ${
                  videoType === 'upload'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-700" />
                <div className="font-medium">Upload Video</div>
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

          {videoType === 'external' ? (
            <Input
              label="Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              required
              icon={LinkIcon}
            />
          ) : (
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
              disabled={submitting || (videoType === 'upload')}
            >
              {submitting ? 'Adding...' : 'Add Video'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};