import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'determinate' | 'indeterminate';
  color?: string;
  height?: number;
}

export function ProgressBar({
  value,
  variant = 'determinate',
  color = 'bg-blue-600',
  height = 8,
}: ProgressBarProps) {
  if (variant === 'indeterminate') {
    return (
      <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
        <div className={`h-full ${color} animate-pulse`} style={{ width: '50%' }}></div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      ></div>
    </div>
  );
}
