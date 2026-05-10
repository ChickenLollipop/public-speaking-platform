'use client';

import Link from 'next/link';
import { Presentation } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface PresentationCardProps {
  presentation: Presentation;
}

export function PresentationCard({ presentation }: PresentationCardProps) {
  const getStatusVariant = (status: Presentation['status']) => {
    switch (status) {
      case 'analyzed':
        return 'success';
      case 'analyzing':
        return 'info';
      case 'failed':
        return 'danger';
      case 'draft':
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: Presentation['status']) => {
    switch (status) {
      case 'analyzed':
        return 'Ready';
      case 'analyzing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'draft':
      default:
        return 'Draft';
    }
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Link href={`/presentation/${presentation.id}`}>
      <Card hover className="h-full">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex-1">
              {presentation.title}
            </h3>
            <Badge variant={getStatusVariant(presentation.status)} size="sm">
              {getStatusLabel(presentation.status)}
            </Badge>
          </div>

          {presentation.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {presentation.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-auto">
            <div className="flex items-center">
              <span className="font-medium">Date:</span>
              <span className="ml-1">{formatDate(presentation.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Duration:</span>
              <span className="ml-1">{formatDuration(presentation.duration)}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Type:</span>
              <span className="ml-1 capitalize">{presentation.type}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
