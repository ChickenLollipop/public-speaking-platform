'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TimestampComment {
  time: number;
  comment: string;
}

interface FeedbackFormProps {
  requestId: string;
  durationSeconds: number;
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl leading-none ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ requestId, durationSeconds }: FeedbackFormProps) {
  const router = useRouter();
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [contentRating, setContentRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [timestampComments, setTimestampComments] = useState<TimestampComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const wordCount = writtenFeedback.trim().split(/\s+/).filter(Boolean).length;
  const isValid = deliveryRating > 0 && contentRating > 0 && overallRating > 0 && wordCount >= 50;

  const minutes = durationSeconds / 60;
  let baseCredits = 3;
  if (minutes >= 5 && minutes < 10) baseCredits = 5;
  else if (minutes >= 10 && minutes < 20) baseCredits = 8;
  else if (minutes >= 20) baseCredits = 12;

  function addTimestampComment() {
    if (!newComment.trim()) return;
    const videoEl = document.querySelector('video') as HTMLVideoElement | null;
    const currentTime = Math.floor(videoEl?.currentTime ?? 0);
    setTimestampComments((prev) => [...prev, { time: currentTime, comment: newComment.trim() }]);
    setNewComment('');
  }

  function removeTimestampComment(index: number) {
    setTimestampComments((prev) => prev.filter((_, i) => i !== index));
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    const res = await fetch(`/api/feedback-requests/${requestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        deliveryRating,
        contentRating,
        overallRating,
        writtenFeedback,
        timestampComments,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/feedback/give/${requestId}/confirmation?credits=${data.creditsEarned}`);
      return;
    }

    const data = await res.json();
    setError(data.error ?? 'Failed to submit feedback');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
          Ratings
        </h3>
        <div className="divide-y divide-gray-100">
          <StarRating label="Delivery" value={deliveryRating} onChange={setDeliveryRating} />
          <StarRating label="Content" value={contentRating} onChange={setContentRating} />
          <StarRating label="Overall" value={overallRating} onChange={setOverallRating} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Written Feedback
          </h3>
          <span className={`text-sm ${wordCount >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
            {wordCount} / 50 words
          </span>
        </div>
        <textarea
          value={writtenFeedback}
          onChange={(e) => setWrittenFeedback(e.target.value)}
          placeholder="Write your feedback here (minimum 50 words)..."
          rows={6}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Timestamp Comments (optional)
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTimestampComment();
              }
            }}
            placeholder="Comment at current video time..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={addTimestampComment}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition whitespace-nowrap"
          >
            + Add Timestamp
          </button>
        </div>
        {timestampComments.length > 0 && (
          <ul className="space-y-2">
            {timestampComments.map((tc, i) => (
              <li key={i} className="flex items-start gap-2 bg-gray-50 rounded-md px-3 py-2 text-sm">
                <span className="font-mono text-indigo-600 whitespace-nowrap">
                  {formatTime(tc.time)}
                </span>
                <span className="flex-1 text-gray-700">{tc.comment}</span>
                <button
                  type="button"
                  onClick={() => removeTimestampComment(i)}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-lg shadow p-5">
        <p className="text-sm text-gray-600 mb-4">
          You&apos;ll earn{' '}
          <span className="font-semibold text-indigo-600">{baseCredits} credits</span> for this
          feedback. Your final amount may increase up to 2× if rated highly.
        </p>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
        {!isValid && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            {deliveryRating === 0 || contentRating === 0 || overallRating === 0
              ? 'Please rate all three categories'
              : `${50 - wordCount} more words needed`}
          </p>
        )}
      </div>
    </form>
  );
}
