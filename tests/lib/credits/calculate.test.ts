import {
  calculateAIAnalysisCost,
  calculateFeedbackRequestCost,
  calculateFeedbackEarnings,
} from '@/lib/credits/calculate';

describe('Credit calculations', () => {
  describe('calculateAIAnalysisCost', () => {
    it('should calculate cost for basic AI (always 0)', () => {
      const cost = calculateAIAnalysisCost(300, 'basic');
      expect(cost).toBe(0);
    });

    it('should calculate cost for full AI (1 credit per 5 minutes)', () => {
      expect(calculateAIAnalysisCost(180, 'full')).toBe(1); // 3 min
      expect(calculateAIAnalysisCost(300, 'full')).toBe(1); // 5 min
      expect(calculateAIAnalysisCost(360, 'full')).toBe(2); // 6 min
      expect(calculateAIAnalysisCost(720, 'full')).toBe(3); // 12 min
    });

    it('should round up partial minutes', () => {
      expect(calculateAIAnalysisCost(301, 'full')).toBe(2); // 5 min 1 sec
    });
  });

  describe('calculateFeedbackRequestCost', () => {
    it('should calculate cost as 1 credit per minute', () => {
      expect(calculateFeedbackRequestCost(300)).toBe(5); // 5 min
      expect(calculateFeedbackRequestCost(720)).toBe(12); // 12 min
    });

    it('should round up partial minutes', () => {
      expect(calculateFeedbackRequestCost(301)).toBe(6); // 5 min 1 sec
    });
  });

  describe('calculateFeedbackEarnings', () => {
    it('should calculate base earnings for short video', () => {
      const earnings = calculateFeedbackEarnings(240, 150, null);
      expect(earnings.base).toBe(3); // <5 min
      expect(earnings.final).toBe(3);
    });

    it('should calculate base earnings for medium video', () => {
      const earnings = calculateFeedbackEarnings(420, 150, null);
      expect(earnings.base).toBe(5); // 5-10 min
      expect(earnings.final).toBe(5);
    });

    it('should calculate base earnings for long video', () => {
      const earnings = calculateFeedbackEarnings(720, 150, null);
      expect(earnings.base).toBe(8); // 10-20 min
      expect(earnings.final).toBe(8);
    });

    it('should apply 2.0x multiplier for 5-star detailed feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 250, 5);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(2.0);
      expect(earnings.final).toBe(10);
    });

    it('should apply 1.5x multiplier for 4-star feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 4);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(1.5);
      expect(earnings.final).toBe(7.5);
    });

    it('should apply 1.0x multiplier for 3-star feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 3);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(1.0);
      expect(earnings.final).toBe(5);
    });

    it('should apply 0.5x multiplier for low-rated feedback', () => {
      const earnings = calculateFeedbackEarnings(300, 150, 2);
      expect(earnings.base).toBe(5);
      expect(earnings.multiplier).toBe(0.5);
      expect(earnings.final).toBe(2.5);
    });
  });
});
