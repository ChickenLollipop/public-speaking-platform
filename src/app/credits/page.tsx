'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  relatedId?: string | null;
  balanceAfter: number;
  createdAt: string;
}

type FilterType = 'all' | 'earned' | 'spent';

export default function CreditHistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [total, setTotal] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch credit history
  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/credits/history?limit=100', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch credit history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let result = [...transactions];

    if (filter === 'earned') {
      result = result.filter((t) => t.amount > 0);
    } else if (filter === 'spent') {
      result = result.filter((t) => t.amount < 0);
    }

    setFilteredTransactions(result);
  }, [transactions, filter]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get transaction type label
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      INITIAL_BONUS: 'Initial Bonus',
      FEEDBACK_GIVEN: 'Feedback Given',
      FEEDBACK_RECEIVED: 'Feedback Received',
      AI_ANALYSIS: 'AI Analysis',
      TRANSCRIPTION: 'Transcription',
      PARTNER_SESSION: 'Partner Session',
      REFUND: 'Refund',
    };
    return labels[type] || type;
  };

  // Get transaction type icon
  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      INITIAL_BONUS: '🎁',
      FEEDBACK_GIVEN: '💬',
      FEEDBACK_RECEIVED: '📝',
      AI_ANALYSIS: '🤖',
      TRANSCRIPTION: '📄',
      PARTNER_SESSION: '👥',
      REFUND: '↩️',
    };
    return icons[type] || '💳';
  };

  // Calculate statistics
  const stats = {
    totalEarned: transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0),
    totalSpent: Math.abs(
      transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    ),
    transactionCount: transactions.length,
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading credit history...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Credit History</h1>
          <p className="text-gray-600 mt-1">
            View all your credit transactions and balance changes
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Current Balance</p>
              <p className="text-4xl font-bold">{user?.creditBalance || 0}</p>
              <p className="text-blue-100 text-sm mt-1">credits</p>
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Total Earned</p>
              <p className="text-3xl font-bold text-green-600">
                +{stats.totalEarned}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-red-600">
                -{stats.totalSpent}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Transactions</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.transactionCount}
              </p>
            </div>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('earned')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'earned'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Earned
              </button>
              <button
                onClick={() => setFilter('spent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'spent'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Spent
              </button>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card className="text-center py-12">
            {filter === 'all' ? (
              <>
                <p className="text-gray-600 mb-4">No credit transactions yet.</p>
                <p className="text-sm text-gray-500">
                  Start by giving feedback or analyzing presentations to earn credits!
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  No {filter} transactions found.
                </p>
                <button
                  onClick={() => setFilter('all')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Show All Transactions
                </button>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  {/* Left Side - Type & Details */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl">{getTypeIcon(transaction.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {getTypeLabel(transaction.type)}
                        </h3>
                        {transaction.amount > 0 ? (
                          <Badge variant="success" size="sm">
                            Earned
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            Spent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Right Side - Amount & Balance */}
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        transaction.amount > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Balance: {transaction.balanceAfter}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load More (if needed) */}
        {total > transactions.length && (
          <Card className="text-center py-4">
            <p className="text-sm text-gray-600 mb-3">
              Showing {transactions.length} of {total} transactions
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Load More
            </button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
