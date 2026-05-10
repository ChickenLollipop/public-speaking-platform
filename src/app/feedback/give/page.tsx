'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface FeedbackRequestItem {
  id: string;
  creditsOffered: number;
  createdAt: string;
  presentation: {
    title: string;
    duration: number | null;
    description: string | null;
    user: { name: string; skillLevel: SkillLevel };
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'Unknown';
  return `${Math.round(seconds / 60)} min`;
}

export default function GiveFeedbackPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FeedbackRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<{ [id: string]: string }>({});
  const [fetchError, setFetchError] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [sort, setSort] = useState<string>('credits_desc');

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setFetchError('');
      const params = new URLSearchParams();
      if (length) params.set('length', length);
      if (sort) params.set('sort', sort);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/feedback-requests?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.status === 401) {
          router.push('/');
          return;
        }

        if (!res.ok) {
          setFetchError('Failed to load feedback requests. Please try again.');
          return;
        }

        const data = await res.json();
        setRequests(data.feedbackRequests ?? []);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [length, sort, router]);

  async function handleClaim(requestId: string) {
    setClaimingId(requestId);
    setClaimError((prev) => ({ ...prev, [requestId]: '' }));

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/feedback-requests/${requestId}/claim`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      router.push(`/feedback/give/${requestId}`);
      return;
    }

    const data = await res.json();
    setClaimError((prev) => ({
      ...prev,
      [requestId]: data.error ?? 'Failed to claim request',
    }));
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setClaimingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/dashboard" className="text-xl font-semibold text-gray-900">
            Public Speaking Platform
          </a>
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Give Feedback</h1>
          <p className="text-gray-600 mt-1">
            Help others improve their presentations and earn credits.
          </p>
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{fetchError}</p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length
            </label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="short">Short (&lt;5 min)</option>
              <option value="medium">Medium (5–10 min)</option>
              <option value="long">Long (10+ min)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="credits_desc">Most Credits</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No feedback requests right now — check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                    {req.presentation.title}
                  </h3>
                  <span className="text-xl font-bold text-indigo-600 whitespace-nowrap">
                    {req.creditsOffered} credits
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-4 space-y-1">
                  <p>Duration: {formatDuration(req.presentation.duration)}</p>
                  <p>
                    By {req.presentation.user.name} ·{' '}
                    {req.presentation.user.skillLevel.charAt(0) +
                      req.presentation.user.skillLevel.slice(1).toLowerCase()}
                  </p>
                  {req.presentation.description && (
                    <p className="text-gray-600 line-clamp-2">{req.presentation.description}</p>
                  )}
                </div>
                {claimError[req.id] && (
                  <p className="text-sm text-red-600 mb-3">{claimError[req.id]}</p>
                )}
                <button
                  onClick={() => handleClaim(req.id)}
                  disabled={claimingId !== null}
                  className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {claimingId === req.id ? 'Claiming...' : 'Claim & Give Feedback'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
