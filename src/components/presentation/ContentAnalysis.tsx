import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ContentAnalysis as ContentAnalysisType } from '@/lib/types';

interface ContentAnalysisProps {
  analysis: ContentAnalysisType;
}

export const ContentAnalysis: React.FC<ContentAnalysisProps> = ({ analysis }) => {
  const getScoreStatus = (score: number): 'success' | 'warning' | 'danger' => {
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Content Analysis</h3>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Structure Score */}
        <Card className="text-center">
          <div className="text-sm text-gray-600 mb-2">Structure</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analysis.structure_score}
          </div>
          <Badge variant={getScoreStatus(analysis.structure_score)} size="sm">
            {getScoreLabel(analysis.structure_score)}
          </Badge>
        </Card>

        {/* Persuasiveness Score */}
        <Card className="text-center">
          <div className="text-sm text-gray-600 mb-2">Persuasiveness</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analysis.persuasiveness_score}
          </div>
          <Badge variant={getScoreStatus(analysis.persuasiveness_score)} size="sm">
            {getScoreLabel(analysis.persuasiveness_score)}
          </Badge>
        </Card>

        {/* Structure Elements */}
        <Card className="flex flex-col justify-center">
          <div className="text-sm text-gray-600 mb-3">Structure Elements</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Introduction</span>
              {analysis.has_intro ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-red-600">✗</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Conclusion</span>
              {analysis.has_conclusion ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-red-600">✗</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Clarity Feedback */}
      <Card className="mb-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          Overall Clarity
        </h4>
        <p className="text-gray-700 leading-relaxed">
          {analysis.clarity_feedback}
        </p>
      </Card>

      {/* Two column layout for what worked and improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Areas for Improvement */}
        {analysis.improvement_suggestions.length > 0 && (
          <Card className="bg-blue-50">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🎯</span>
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {analysis.improvement_suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Weak Transitions */}
        {analysis.weak_transitions.length > 0 && (
          <Card className="bg-yellow-50">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🔗</span>
              Transition Opportunities
            </h4>
            <ul className="space-y-2">
              {analysis.weak_transitions.map((transition, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  <span>{transition}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
};
