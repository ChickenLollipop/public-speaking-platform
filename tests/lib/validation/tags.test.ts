import {
  validateTagName,
  normalizeTag,
  validateTags,
  ValidationResult,
} from '../../../src/lib/validation/tags';

describe('Tag Validation', () => {
  describe('validateTagName', () => {
    it('should accept valid tag names', () => {
      const validNames = [
        'typescript',
        'web-dev',
        'machine_learning',
        'Data Science',
        'React 18',
        'AI',
        'a',
        'test-tag_name 123',
      ];

      validNames.forEach((name) => {
        const result = validateTagName(name);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty tag names', () => {
      const result = validateTagName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tag name is required');
    });

    it('should reject tag names with only whitespace', () => {
      const result = validateTagName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tag name is required');
    });

    it('should reject tag names longer than 30 characters', () => {
      const longName = 'a'.repeat(31);
      const result = validateTagName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'Tag name must be between 1 and 30 characters'
      );
    });

    it('should reject tag names with invalid characters', () => {
      const invalidNames = ['tag@name', 'tag#name', 'tag!name', 'tag$name'];

      invalidNames.forEach((name) => {
        const result = validateTagName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(
          'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
        );
      });
    });
  });

  describe('normalizeTag', () => {
    it('should trim whitespace from tag names', () => {
      expect(normalizeTag('  typescript  ')).toBe('typescript');
      expect(normalizeTag('\ttesting\n')).toBe('testing');
    });

    it('should collapse multiple spaces into single space', () => {
      expect(normalizeTag('web   dev')).toBe('web dev');
      expect(normalizeTag('machine    learning')).toBe('machine learning');
    });

    it('should handle combined whitespace and collapse', () => {
      expect(normalizeTag('  web   dev  ')).toBe('web dev');
    });

    it('should return single character tags unchanged', () => {
      expect(normalizeTag('a')).toBe('a');
    });
  });

  describe('validateTags', () => {
    it('should accept valid tag arrays', () => {
      const validTags = [
        ['typescript', 'web-dev'],
        ['react', 'vue', 'angular'],
        ['a'],
        [],
      ];

      validTags.forEach((tags) => {
        const result = validateTags(tags);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should accept up to 5 tags', () => {
      const result = validateTags([
        'tag1',
        'tag2',
        'tag3',
        'tag4',
        'tag5',
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject more than 5 tags', () => {
      const result = validateTags([
        'tag1',
        'tag2',
        'tag3',
        'tag4',
        'tag5',
        'tag6',
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maximum 5 tags allowed');
    });

    it('should reject duplicate tags', () => {
      const result = validateTags(['typescript', 'web-dev', 'typescript']);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Duplicate tags are not allowed');
    });

    it('should reject duplicate tags after normalization', () => {
      const result = validateTags(['typescript', '  typescript  ']);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Duplicate tags are not allowed');
    });

    it('should validate each tag name in the array', () => {
      const result = validateTags(['typescript', 'tag@name']);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    });

    it('should reject arrays with invalid tag names', () => {
      const result = validateTags(['valid-tag', '', 'another-tag']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tag name is required');
    });
  });
});
