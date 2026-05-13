'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DeliveryMetrics } from '@/components/presentation/DeliveryMetrics';
import { ContentAnalysis } from '@/components/presentation/ContentAnalysis';
import { getVideoUrl } from '@/lib/s3/upload';

interface Presentation {
  id: string;
  title: string;
  description?: string;
  type: string;
  videoUrl?: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
  visibility: string;
  aiAnalysis?: {
    transcript: string;
    deliveryMetrics: any;
    contentAnalysis?: any;
    overallScore: number;
  };
}

export default function PresentationDetailPage() {
  const params = useParams();
  const router = useRouter();
  useAuth(); // Ensure auth context is loaded
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const presentationId = params.id as string;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchPresentation = async () => {
      try {
        const response = await fetch(`/api/presentations/${presentationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Presentation not found');
          } else if (response.status === 403) {
            setError('You do not have access to this presentation');
          } else {
            setError('Failed to load presentation');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setPresentation(data.presentation);
      } catch (err) {
        console.error('Error loading presentation:', err);
        setError('An error occurred while loading the presentation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresentation();
  }, [presentationId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/presentations/${presentationId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      // Refresh presentation data
      const refreshResponse = await fetch(`/api/presentations/${presentationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setPresentation(data.presentation);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <Badge variant="success">Ready</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600">Loading presentation...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !presentation) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {error || 'Presentation not found'}
              </h2>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const videoUrl = presentation.videoUrl ? getVideoUrl(presentation.videoUrl) : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {presentation.title}
            </h1>
            {presentation.description && (
              <p className="text-gray-600">{presentation.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              {getStatusBadge(presentation.status)}
              <span className="text-sm text-gray-500">
                Created {new Date(presentation.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!presentation.aiAnalysis && presentation.status !== 'PROCESSING' && presentation.status !== 'FAILED' && (
              <Button
                onClick={handleAnalyze}
                loading={isAnalyzing}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Back
            </Button>
          </div>
        </div>

        {/* Analysis Error */}
        {analysisError && (
          <Card>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{analysisError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAnalysisError(null)}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {/* Video Player */}
        {videoUrl && presentation.type !== 'TEXT_SCRIPT' && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Video</h2>
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                controls
                className="w-full max-h-[600px]"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </Card>
        )}

        {/* Processing Status */}
        {presentation.status === 'PROCESSING' && (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing Your Presentation
              </h3>
              <p className="text-gray-600">
                Our AI is analyzing your presentation. This may take a few minutes.
              </p>
              <div className="mt-6">
                <div className="animate-pulse flex justify-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animation-delay-200"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animation-delay-400"></div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* AI Analysis */}
        {presentation.aiAnalysis && (
          <>
            {/* Overall Score */}
            <Card>
              <div className="text-center py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Overall Score
                </h2>
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {presentation.aiAnalysis.overallScore}
                  <span className="text-2xl text-gray-500">/100</span>
                </div>
                <p className="text-gray-600">
                  {presentation.aiAnalysis.overallScore >= 80
                    ? 'Excellent presentation!'
                    : presentation.aiAnalysis.overallScore >= 60
                    ? 'Good job, with room for improvement'
                    : 'Keep practicing!'}
                </p>
              </div>
            </Card>

            {/* Delivery Metrics */}
            {presentation.aiAnalysis.deliveryMetrics && (
              <DeliveryMetrics metrics={presentation.aiAnalysis.deliveryMetrics} />
            )}

            {/* Content Analysis */}
            {presentation.aiAnalysis.contentAnalysis && (
              <ContentAnalysis analysis={presentation.aiAnalysis.contentAnalysis} />
            )}

            {/* Transcript */}
            {presentation.aiAnalysis.transcript && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Transcript
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {presentation.aiAnalysis.transcript}
                  </p>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Failed Status */}
        {presentation.status === 'FAILED' && (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing Failed
              </h3>
              <p className="text-gray-600 mb-4">
                We encountered an error while processing your presentation.
              </p>
              <Button onClick={() => router.push('/practice')}>
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Actions */}
        {presentation.status === 'READY' && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Next Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Request Feedback
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get detailed feedback from the community
                </p>
                <Button disabled className="w-full" size="sm">
                  Coming Soon
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Practice Again
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Record another version to track improvement
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  size="sm"
                  onClick={() => router.push('/practice')}
                >
                  New Practice
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
