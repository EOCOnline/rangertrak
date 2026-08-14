import { Utility } from './utility';

// Utility is all static functions - no instance/TestBed needed.
describe('Utility', () => {

  describe('timeDiff', () => {
    it('computes days/hours/minutes/seconds between two timestamps', () => {
      const start = Date.UTC(2026, 0, 1, 0, 0, 0);
      const end = Date.UTC(2026, 0, 2, 3, 4, 5); // +1d 3h 4m 5s

      const diff = Utility.timeDiff(start, end);

      expect(diff.negative).toBeFalse();
      expect(diff.days).toBe(1);
      expect(diff.hours).toBe(3);
      expect(diff.minutes).toBe(4);
      expect(diff.seconds).toBe(5);
    });

    it('flags a negative interval when endTime precedes startTime', () => {
      const start = Date.UTC(2026, 0, 2, 0, 0, 0);
      const end = Date.UTC(2026, 0, 1, 18, 0, 0); // 6h before start (18:00 -> midnight)

      const diff = Utility.timeDiff(start, end);

      expect(diff.negative).toBeTrue();
      expect(diff.days).toBe(0);
      expect(diff.hours).toBe(6);
      expect(diff.minutes).toBe(0);
      expect(diff.seconds).toBe(0);
    });
  });

  describe('zeroFill', () => {
    it('left-pads a number to the requested width', () => {
      expect(Utility.zeroFill(5, 2)).toBe('05');
      expect(Utility.zeroFill(42, 4)).toBe('0042');
    });

    it('does not truncate a number already at or beyond the requested width', () => {
      expect(Utility.zeroFill(12345, 2)).toBe('12345');
    });
  });

  describe('isDark', () => {
    it('treats a light hex color as not dark (YIQ >= 128)', () => {
      expect(Utility.isDark('ffffff')).toBeTrue();
    });

    it('treats a dark hex color as dark (YIQ < 128)', () => {
      expect(Utility.isDark('000000')).toBeFalse();
    });
  });
});
