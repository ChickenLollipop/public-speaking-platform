'use client';

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4">Recording</h3>

      {/* Responsive 16:9 aspect ratio container */}
      <div className="relative w-full pt-[56.25%] bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        <video
          src={videoUrl}
          controls
          className="absolute top-0 left-0 w-full h-full"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video info */}
      <div className="mt-3 text-sm text-gray-600">
        <p>Use the controls to play, pause, or adjust the volume.</p>
      </div>
    </div>
  );
};
