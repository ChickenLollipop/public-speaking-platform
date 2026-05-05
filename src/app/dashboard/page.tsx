import { CreditBalance } from '@/components/CreditBalance';

export default function DashboardPage() {
  // TODO: Fetch user and presentations from API
  const mockUser = {
    name: 'Test User',
    creditBalance: 50,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Public Speaking Platform</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{mockUser.name}</span>
              <a
                href="/api/auth/logout"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
          <CreditBalance balance={mockUser.creditBalance} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="/practice"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              New Practice
            </h3>
            <p className="text-gray-600">
              Record or upload a presentation to get AI feedback
            </p>
          </a>

          <a
            href="/feedback/give"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Give Feedback
            </h3>
            <p className="text-gray-600">
              Help others and earn credits
            </p>
          </a>

          <a
            href="/credits"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Credit History
            </h3>
            <p className="text-gray-600">
              View your transaction history
            </p>
          </a>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Presentations
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-600">
              No presentations yet. Start practicing!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
