import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DeliveryMetrics as DeliveryMetricsType } from '@/lib/types';

interface DeliveryMetricsProps {
  metrics: DeliveryMetricsType;
}

interface MetricCardData {
  label: string;
  value: string | number;
  icon: string;
  status: 'success' | 'warning' | 'danger';
  statusText: string;
}

export const DeliveryMetrics: React.FC<DeliveryMetricsProps> = ({ metrics }) => {
  const getMetricStatus = (metricType: string, value: number): { status: 'success' | 'warning' | 'danger'; statusText: string } => {
    switch (metricType) {
      case 'pace':
        if (value >= 130 && value <= 160) return { status: 'success', statusText: 'Good' };
        if ((value >= 110 && value < 130) || (value > 160 && value <= 180)) return { status: 'warning', statusText: 'OK' };
        return { status: 'danger', statusText: 'Needs Work' };

      case 'filler_words':
        if (value <= 3) return { status: 'success', statusText: 'Excellent' };
        if (value <= 8) return { status: 'warning', statusText: 'Fair' };
        return { status: 'danger', statusText: 'Too Many' };

      case 'volume':
        // avg_volume is in dB (negative values), -12 to -20 is good range
        if (value >= -20 && value <= -12) return { status: 'success', statusText: 'Good' };
        if (value >= -25 && value < -20) return { status: 'warning', statusText: 'Low' };
        return { status: 'danger', statusText: 'Too Quiet' };

      case 'pauses':
        if (value >= 4 && value <= 8) return { status: 'success', statusText: 'Good' };
        if (value >= 2 && value < 4) return { status: 'warning', statusText: 'Few' };
        return { status: 'danger', statusText: 'Needs Work' };

      case 'eye_contact':
        if (value >= 70) return { status: 'success', statusText: 'Good' };
        if (value >= 50) return { status: 'warning', statusText: 'Fair' };
        return { status: 'danger', statusText: 'Needs Work' };

      default:
        return { status: 'warning', statusText: 'OK' };
    }
  };

  const paceStatus = getMetricStatus('pace', metrics.pace_wpm);
  const fillerStatus = getMetricStatus('filler_words', metrics.filler_word_count);
  const volumeStatus = getMetricStatus('volume', metrics.avg_volume);
  const pausesStatus = getMetricStatus('pauses', metrics.pause_count);
  const eyeContactStatus = getMetricStatus('eye_contact', metrics.eye_contact_score);

  const metricCards: MetricCardData[] = [
    {
      label: 'Speaking Pace',
      value: `${metrics.pace_wpm} WPM`,
      icon: '⚡',
      status: paceStatus.status,
      statusText: paceStatus.statusText,
    },
    {
      label: 'Filler Words',
      value: metrics.filler_word_count,
      icon: '🗣️',
      status: fillerStatus.status,
      statusText: fillerStatus.statusText,
    },
    {
      label: 'Volume',
      value: `${metrics.avg_volume} dB`,
      icon: '🔊',
      status: volumeStatus.status,
      statusText: volumeStatus.statusText,
    },
    {
      label: 'Pauses',
      value: metrics.pause_count,
      icon: '⏸️',
      status: pausesStatus.status,
      statusText: pausesStatus.statusText,
    },
    {
      label: 'Eye Contact',
      value: `${metrics.eye_contact_score}/100`,
      icon: '👁️',
      status: eyeContactStatus.status,
      statusText: eyeContactStatus.statusText,
    },
  ];

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Delivery Metrics</h3>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{metric.icon}</div>
              <Badge variant={metric.status} size="sm">
                {metric.statusText}
              </Badge>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-gray-600">
                {metric.label}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filler words detail */}
      {metrics.filler_words_list.length > 0 && (
        <Card className="bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Filler Words Detected:
          </div>
          <div className="flex flex-wrap gap-2">
            {metrics.filler_words_list.map((word, index) => (
              <Badge key={index} variant="neutral" size="sm">
                {word}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
