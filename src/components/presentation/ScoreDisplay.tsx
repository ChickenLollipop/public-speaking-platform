import React from 'react';

interface ScoreDisplayProps {
  score: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  // Determine color based on score
  const getColorClass = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColorClass = (score: number): string => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusText = (score: number): string => {
    if (score >= 70) return 'Great Work!';
    if (score >= 50) return 'Good Progress';
    return 'Needs Improvement';
  };

  // Calculate circumference for circular progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Circular Progress Display */}
      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-48 h-48">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${getColorClass(score)}`}
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold ${getColorClass(score)}`}>
            {score}
          </div>
          <div className="text-gray-500 text-sm mt-1">out of 100</div>
        </div>
      </div>

      {/* Status badge */}
      <div className={`mt-6 px-6 py-2 rounded-full ${getBgColorClass(score)}`}>
        <span className={`font-semibold ${getColorClass(score)}`}>
          {getStatusText(score)}
        </span>
      </div>
    </div>
  );
};
