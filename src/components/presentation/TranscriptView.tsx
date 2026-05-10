'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface TranscriptViewProps {
  transcript: string;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ transcript }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Split transcript into sentences for better readability
  const formatTranscript = (text: string): string => {
    // Add line breaks after sentence-ending punctuation
    return text
      .replace(/\. /g, '.\n\n')
      .replace(/\? /g, '?\n\n')
      .replace(/! /g, '!\n\n');
  };

  const formattedTranscript = formatTranscript(transcript);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Transcript</h3>
        <button
          onClick={toggleExpanded}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {isExpanded && (
        <Card className="bg-gray-50">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">📝</span>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Full Transcript
              </h4>
              <p className="text-xs text-gray-500">
                {transcript.split(/\s+/).length} words
              </p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {formattedTranscript}
            </p>
          </div>
        </Card>
      )}

      {!isExpanded && (
        <Card className="bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm text-gray-600">
                  {transcript.split(/\s+/).length} words transcribed
                </p>
              </div>
            </div>
            <button
              onClick={toggleExpanded}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              View Full Transcript →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};
