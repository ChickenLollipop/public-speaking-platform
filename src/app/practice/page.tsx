'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  validateVideoFile,
  uploadVideoToS3,
  formatFileSize,
  formatDuration,
  UploadProgress,
} from '@/lib/utils/videoUpload';

export default function PracticePage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'VIDEO_UPLOAD' | 'TEXT_SCRIPT'>('VIDEO_UPLOAD');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'COMMUNITY_SHARED'>('PRIVATE');

  // Video upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage
  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Get video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (type === 'VIDEO_UPLOAD' && !selectedFile) {
      setError('Please select a video file');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create presentation record
      const createResponse = await fetch('/api/presentations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          type,
          visibility,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create presentation');
      }

      const { presentation } = await createResponse.json();

      // Step 2: If video upload, get presigned URL and upload
      if (type === 'VIDEO_UPLOAD' && selectedFile) {
        // Get upload URL
        const uploadUrlResponse = await fetch(
          `/api/presentations/${presentation.id}/upload-url`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!uploadUrlResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { url } = await uploadUrlResponse.json();

        // Upload video to S3
        const uploadResult = await uploadVideoToS3(
          selectedFile,
          url,
          setUploadProgress
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }

      // Step 3: Trigger AI analysis in the background
      // Don't wait for it to complete - user can view results on detail page
      fetch(`/api/presentations/${presentation.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => {
        console.error('Analysis trigger failed:', err);
        // Non-blocking - analysis can be triggered manually later
      });

      // Success! Redirect to presentation detail page
      router.push(`/presentations/${presentation.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            New Presentation
          </h1>
          <p className="text-gray-600">
            Upload a video or script to get AI-powered feedback on your public speaking
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <Input
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="e.g., Product Launch Pitch"
              required
              disabled={isSubmitting}
            />

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this presentation about?"
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Type Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Presentation Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType('VIDEO_UPLOAD')}
                  disabled={isSubmitting}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    type === 'VIDEO_UPLOAD'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-2">🎥</div>
                  <div className="font-semibold">Video Upload</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Upload a recorded video
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('TEXT_SCRIPT')}
                  disabled={isSubmitting}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    type === 'TEXT_SCRIPT'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold">Text Script</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Paste your script
                  </div>
                </button>
              </div>
            </div>

            {/* Video Upload */}
            {type === 'VIDEO_UPLOAD' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Video File <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div>
                      <div className="text-4xl mb-2">✅</div>
                      <div className="font-semibold text-gray-900">
                        {selectedFile.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatFileSize(selectedFile.size)}
                        {videoDuration && ` • ${formatDuration(videoDuration)}`}
                      </div>
                      {!isSubmitting && (
                        <div className="text-sm text-blue-600 mt-2">
                          Click to change file
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">📁</div>
                      <div className="font-semibold text-gray-900 mb-1">
                        Choose a video file
                      </div>
                      <div className="text-sm text-gray-600">
                        MP4, MOV, or WebM (max 500MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Text Script */}
            {type === 'TEXT_SCRIPT' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Script <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Paste your presentation script here..."
                  disabled={isSubmitting}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  AI will analyze your content and structure
                </p>
              </div>
            )}

            {/* Visibility */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'PRIVATE'}
                    onChange={() => setVisibility('PRIVATE')}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-gray-600">
                      Only you can see this presentation
                    </div>
                  </div>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'COMMUNITY_SHARED'}
                    onChange={() => setVisibility('COMMUNITY_SHARED')}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Community Shared</div>
                    <div className="text-sm text-gray-600">
                      Available for community feedback
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div>
                <div className="flex justify-between text-sm text-gray-700 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress.percentage}%</span>
                </div>
                <ProgressBar value={uploadProgress.percentage} />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                className="flex-1"
              >
                {isSubmitting
                  ? uploadProgress
                    ? 'Uploading...'
                    : 'Creating...'
                  : 'Create Presentation'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/dashboard')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
