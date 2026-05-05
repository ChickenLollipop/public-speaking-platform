import { calculateDeliveryMetrics } from '@/lib/ai/delivery-metrics';

describe('Delivery metrics calculation', () => {
  it('should calculate pace (WPM)', () => {
    const transcript = 'This is a test transcript with exactly ten words here.';
    const durationSeconds = 60; // 1 minute

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.pace_wpm).toBe(10);
  });

  it('should detect filler words', () => {
    const transcript = 'Um, so like, you know, this is uh basically a test.';
    const durationSeconds = 10;

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.filler_word_count).toBe(5);
    expect(metrics.filler_words_list).toContain('um');
    expect(metrics.filler_words_list).toContain('so');
    expect(metrics.filler_words_list).toContain('like');
    expect(metrics.filler_words_list).toContain('you know');
    expect(metrics.filler_words_list).toContain('uh');
  });

  it('should handle empty transcript', () => {
    const transcript = '';
    const durationSeconds = 60;

    const metrics = calculateDeliveryMetrics(transcript, durationSeconds);

    expect(metrics.pace_wpm).toBe(0);
    expect(metrics.filler_word_count).toBe(0);
  });

  it('should calculate correct pace for longer speech', () => {
    const words = new Array(150).fill('word').join(' ');
    const durationSeconds = 60;

    const metrics = calculateDeliveryMetrics(words, durationSeconds);

    expect(metrics.pace_wpm).toBe(150);
  });
});
