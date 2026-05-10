'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer } from './VideoPlayer';
import { FeedbackForm } from './FeedbackForm';

type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface FeedbackRequestDetail {
  id: string;
  status: string;
  creditsOffered: number;
  presentation: {
    id: string;
    title: string;
    description: string | null;
    duration: number | null;
    videoUrl: string | null;
    user: { name: string; skillLevel: SkillLevel; goals: string[] };
  };
}

export default function SubmissionPage({
  params,
}: {
  params: { requestId: string };
}) {
  const router = useRouter();
  const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const { requestId } = params;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/feedback-requests/${requestId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          router.push('/feedback/give');
          return;
        }

        if (!res.ok) {
          router.push('/feedback/give');
          return;
        }

        const data = await res.json();
        setFeedbackRequest(data.feedbackRequest);
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [requestId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!feedbackRequest) return null;

  const { presentation } = feedbackRequest;
  const skillLevel =
    presentation.user.skillLevel.charAt(0).toUpperCase() +
    presentation.user.skillLevel.slice(1).toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold text-gray-900">Public Speaking Platform</span>
          <a href="/feedback/give" className="text-sm text-gray-600 hover:text-gray-900">
            ← Give Feedback
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left: video + info (60%) */}
          <div className="w-3/5 min-w-0">
            <VideoPlayer requestId={requestId} ref={videoRef} />
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{presentation.title}</h1>
              {presentation.description && (
                <p className="text-gray-600 mb-3">{presentation.description}</p>
              )}
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  By <span className="font-medium">{presentation.user.name}</span> · {skillLevel}
                </p>
                {presentation.user.goals.length > 0 && (
                  <p>Goals: {presentation.user.goals.join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: form (40%, sticky) */}
          <div className="w-2/5 flex-shrink-0 sticky top-8">
            <FeedbackForm
              requestId={requestId}
              durationSeconds={presentation.duration ?? 0}
              videoRef={videoRef}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
