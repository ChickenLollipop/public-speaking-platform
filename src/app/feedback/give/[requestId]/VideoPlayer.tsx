'use client';

import { useState, useEffect, forwardRef } from 'react';

interface VideoPlayerProps {
  requestId: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer({ requestId }, ref) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
      async function fetchSignedUrl() {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/feedback-requests/${requestId}/video-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSignedUrl(data.url);
        } else {
          setError(true);
        }
      }
      fetchSignedUrl();
    }, [requestId]);

    if (error) {
      return (
        <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
          <p className="text-white text-sm">Video unavailable</p>
        </div>
      );
    }

    if (!signedUrl) {
      return (
        <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
          <p className="text-white text-sm">Loading video...</p>
        </div>
      );
    }

    return (
      <video
        ref={ref}
        src={signedUrl}
        controls
        className="w-full rounded-lg bg-black aspect-video"
      />
    );
  }
);
