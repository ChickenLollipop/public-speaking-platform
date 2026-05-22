'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CreditBalance } from '@/components/CreditBalance';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/presentations', label: 'Presentations' },
    { href: '/practice', label: 'Practice' },
    { href: '/feedback/give', label: 'Give Feedback' },
    { href: '/credits', label: 'Credits' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Public Speaking Platform
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => router.push(link.href)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
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
