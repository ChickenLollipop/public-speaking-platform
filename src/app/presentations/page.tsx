'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Presentation {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  duration?: number;
  createdAt: string;
  transcript?: string;
  aiAnalysis?: {
    overallScore: number;
  } | null;
}

type SortOption = 'newest' | 'oldest' | 'title' | 'score';
type FilterStatus = 'all' | 'READY' | 'PROCESSING' | 'FAILED';

export default function PresentationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [filteredPresentations, setFilteredPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch presentations
  useEffect(() => {
    if (!user) return;

    const fetchPresentations = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/presentations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPresentations(data.presentations || []);
        }
      } catch (error) {
        console.error('Failed to fetch presentations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresentations();
  }, [user]);

  // Apply filters and search
  useEffect(() => {
    let result = [...presentations];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Search by title or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'score':
          const scoreA = a.aiAnalysis?.overallScore ?? -1;
          const scoreB = b.aiAnalysis?.overallScore ?? -1;
          return scoreB - scoreA;
        default:
          return 0;
      }
    });

    setFilteredPresentations(result);
  }, [presentations, searchQuery, sortBy, filterStatus]);

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'READY':
        return 'success';
      case 'PROCESSING':
        return 'info';
      case 'FAILED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'READY':
        return 'Ready';
      case 'PROCESSING':
        return 'Processing';
      case 'FAILED':
        return 'Failed';
      default:
        return status;
    }
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading presentations...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Presentations</h1>
            <p className="text-gray-600 mt-1">
              {presentations.length} presentation{presentations.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <Button onClick={() => router.push('/practice')}>
            New Presentation
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <div className="space-y-4">
            {/* Search */}
            <div>
              <Input
                type="text"
                placeholder="Search presentations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="READY">Ready</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="score">Highest Score</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterStatus !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setSortBy('newest');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Presentations List */}
        {filteredPresentations.length === 0 ? (
          <Card className="text-center py-12">
            {searchQuery || filterStatus !== 'all' ? (
              <>
                <p className="text-gray-600 mb-4">No presentations match your filters.</p>
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  You haven't created any presentations yet.
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => router.push('/practice')}>
                    Create Your First Presentation
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPresentations.map((presentation) => (
              <Card
                key={presentation.id}
                hoverable
                onClick={() => router.push(`/presentations/${presentation.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  {/* Left Side - Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {presentation.title}
                      </h3>
                      <Badge
                        variant={getStatusVariant(presentation.status)}
                        size="sm"
                      >
                        {getStatusLabel(presentation.status)}
                      </Badge>
                    </div>

                    {presentation.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {presentation.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        <span className="font-medium">Type:</span>{' '}
                        {presentation.type.replace('_', ' ')}
                      </span>
                      <span>
                        <span className="font-medium">Duration:</span>{' '}
                        {formatDuration(presentation.duration)}
                      </span>
                      <span>
                        <span className="font-medium">Created:</span>{' '}
                        {formatDate(presentation.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right Side - Score */}
                  {presentation.aiAnalysis?.overallScore !== undefined && (
                    <div className="ml-6 text-center flex-shrink-0">
                      <div className="text-3xl font-bold text-blue-600">
                        {presentation.aiAnalysis.overallScore}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Score</div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {presentations.length > 0 && (
          <Card className="bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {presentations.length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {presentations.filter((p) => p.status === 'READY').length}
                </div>
                <div className="text-sm text-gray-600">Ready</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {presentations.filter((p) => p.status === 'PROCESSING').length}
                </div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {presentations.filter((p) => p.aiAnalysis?.overallScore).length
                    ? Math.round(
                        presentations
                          .filter((p) => p.aiAnalysis?.overallScore)
                          .reduce((sum, p) => sum + (p.aiAnalysis?.overallScore || 0), 0) /
                          presentations.filter((p) => p.aiAnalysis?.overallScore).length
                      )
                    : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
