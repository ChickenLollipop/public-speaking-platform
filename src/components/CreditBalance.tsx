'use client';

interface CreditBalanceProps {
  balance: number;
  variant?: 'default' | 'compact';
}

export function CreditBalance({ balance, variant = 'default' }: CreditBalanceProps) {
  const getStatusColor = () => {
    if (balance > 10) return 'text-green-600';
    if (balance > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusMessage = () => {
    if (balance > 10) return 'Good balance';
    if (balance > 0) return 'Low credits - give feedback to earn more';
    return 'Out of credits - give feedback to earn more';
  };

  if (variant === 'compact') {
    return (
      <div className="text-sm">
        <span className="text-gray-600">Credits: </span>
        <span className={`font-semibold ${getStatusColor()}`}>
          {balance}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Credit Balance</p>
          <p className={`text-3xl font-bold ${getStatusColor()}`}>{balance}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{getStatusMessage()}</p>
        </div>
      </div>
    </div>
  );
}
