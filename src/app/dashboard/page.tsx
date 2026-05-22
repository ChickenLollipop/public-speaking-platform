'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PresentationCard } from '@/components/presentation/PresentationCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreditBalance } from '@/components/CreditBalance';
import { getPresentationsFromStorage } from '@/lib/storage/localStorage';
import { Presentation } from '@/lib/types';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load presentations from storage
  useEffect(() => {
    if (user) {
      const allPresentations = getPresentationsFromStorage();
      const userPresentations = allPresentations.filter(
        (p) => p.userId === user.id
      );
      // Sort by most recent first
      userPresentations.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPresentations(userPresentations);
    }
  }, [user]);

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
          <CreditBalance balance={user.creditBalance} />
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            hoverable
            onClick={() => router.push('/practice')}
            className="cursor-pointer text-center py-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              New Practice
            </h3>
            <p className="text-gray-600 text-sm">
              Record or upload a presentation to get AI feedback
            </p>
          </Card>

          <Card
            hoverable
            onClick={() => router.push('/feedback/give')}
            className="cursor-pointer text-center py-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Give Feedback
            </h3>
            <p className="text-gray-600 text-sm">
              Help others and earn credits
            </p>
          </Card>

          <Card
            hoverable
            onClick={() => router.push('/credits')}
            className="cursor-pointer text-center py-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Credit History
            </h3>
            <p className="text-gray-600 text-sm">
              View your transaction history
            </p>
          </Card>
        </div>

        {/* Presentations List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Recent Presentations
            </h3>
            {presentations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/presentations')}
              >
                View All →
              </Button>
            )}
          </div>

          {presentations.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-600 mb-4">
                No presentations yet. Start practicing!
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push('/practice')}>
                  Create Your First Presentation
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presentations.slice(0, 6).map((presentation) => (
                <PresentationCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
