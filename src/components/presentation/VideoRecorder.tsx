'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useVideoRecorder } from '@/lib/hooks/useVideoRecorder';
import { Button } from '@/components/ui/Button';

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  onRecordingComplete,
  onCancel
}) => {
  const {
    state,
    stream,
    videoBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording
  } = useVideoRecorder();

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Set up live video stream
  useEffect(() => {
    if (stream && liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Set up preview video
  useEffect(() => {
    if (videoBlob && previewVideoRef.current) {
      const url = URL.createObjectURL(videoBlob);
      previewVideoRef.current.src = url;

      // Cleanup function that revokes the URL when videoBlob changes or component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    // If videoBlob is cleared, ensure we don't leak any previous URL
    return () => {
      if (previewVideoRef.current?.src) {
        const currentSrc = previewVideoRef.current.src;
        if (currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc);
        }
      }
    };
  }, [videoBlob]);

  // Recording timer
  useEffect(() => {
    if (state === 'recording') {
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [state]);

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (previewVideoRef.current) {
      if (isPlaying) {
        previewVideoRef.current.pause();
      } else {
        previewVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle video ended event
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  // Handle keyboard events for video controls
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      togglePlayPause();
    }
  };

  // Handle accept recording
  const handleAccept = () => {
    if (videoBlob) {
      onRecordingComplete(videoBlob);
    }
  };

  // Handle re-record
  const handleReRecord = () => {
    resetRecording();
    setRecordingTime(0);
    setIsPlaying(false);
  };

  // Handle cancel
  const handleCancel = () => {
    resetRecording();
    onCancel();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Recording Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Idle state */}
      {state === 'idle' && (
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Record Your Presentation
          </h2>
          <p className="text-gray-600 mb-8">
            Click the button below to start recording your presentation. Make sure your camera and microphone are connected.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={startRecording} size="lg">
              Start Recording
            </Button>
            <Button onClick={handleCancel} variant="secondary" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Recording state */}
      {state === 'recording' && (
        <div>
          <div className="relative bg-black rounded-lg overflow-hidden mb-6">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video"
              aria-label="Live camera feed during recording"
              title="Live camera feed during recording"
            />

            {/* Recording indicator */}
            <div className="absolute top-4 left-4 flex items-center bg-red-600 text-white px-3 py-2 rounded-full">
              <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse" />
              <span className="font-semibold">REC</span>
            </div>

            {/* Timer */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg font-mono text-lg">
              {formatTime(recordingTime)}
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-4">Recording in progress...</p>
            <Button onClick={stopRecording} variant="danger" size="lg">
              Stop Recording
            </Button>
          </div>
        </div>
      )}

      {/* Preview state */}
      {state === 'preview' && videoBlob && (
        <div>
          <div className="relative bg-black rounded-lg overflow-hidden mb-6">
            <video
              ref={previewVideoRef}
              controls={false}
              playsInline
              className="w-full aspect-video"
              onEnded={handleVideoEnded}
              aria-label="Preview of recorded presentation video"
              title="Preview of recorded presentation video"
            />

            {/* Custom play/pause button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={togglePlayPause}
                onKeyDown={handleKeyDown}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
              >
                {isPlaying ? (
                  <svg
                    className="w-8 h-8 text-gray-900"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-gray-900 ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Video controls bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  onKeyDown={handleKeyDown}
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 rounded"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Review Your Recording
            </h3>
            <p className="text-gray-600 mb-6">
              Watch your presentation and decide if you want to keep it or record again.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={handleAccept} size="lg">
                Accept Recording
              </Button>
              <Button onClick={handleReRecord} variant="secondary" size="lg">
                Re-record
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="lg">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
