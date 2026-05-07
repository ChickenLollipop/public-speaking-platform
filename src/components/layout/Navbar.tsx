'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { CreditBalance } from '@/components/CreditBalance';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Public Speaking Platform
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className="text-sm text-gray-700 hidden sm:inline">
                  {user.name}
                </span>
                <CreditBalance balance={user.creditBalance} variant="compact" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                >
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
