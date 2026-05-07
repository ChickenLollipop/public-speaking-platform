import React from 'react';

interface ProgressBarProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  max = 100,
  indeterminate = false,
  className = '',
  showLabel = false,
  size = 'md',
  color = 'blue'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        {indeterminate ? (
          <div
            className={`${sizeStyles[size]} ${colorStyles[color]} rounded-full`}
            style={{
              width: '30%',
              animation: 'indeterminate 1.5s ease-in-out infinite'
            }}
          />
        ) : (
          <div
            className={`${sizeStyles[size]} ${colorStyles[color]} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        )}
      </div>
      {showLabel && !indeterminate && (
        <div className="mt-1 text-sm text-gray-600 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};
