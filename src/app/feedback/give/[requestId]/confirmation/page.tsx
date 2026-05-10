import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ credits?: string }>;
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const creditsEarned = parseInt(resolvedSearchParams.credits ?? '0', 10) || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Feedback submitted!</h1>
        <p className="text-gray-600 mb-6">
          Thanks for helping the community improve their speaking skills.
        </p>

        <div className="bg-indigo-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-indigo-700 uppercase tracking-wide font-medium mb-1">
            Credits earned
          </p>
          <p className="text-4xl font-bold text-indigo-600">{creditsEarned}</p>
          <p className="text-sm text-indigo-600 mt-2">
            Your final amount may increase up to 2× if the recipient rates your feedback highly.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/feedback/give"
            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition text-center"
          >
            Give More Feedback
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
