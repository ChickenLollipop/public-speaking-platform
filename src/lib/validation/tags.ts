export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const TAG_REGEX = /^[a-zA-Z0-9\s\-_]+$/;
const MIN_LENGTH = 1;
const MAX_LENGTH = 30;
const MAX_TAGS = 5;

/**
 * Validate a single tag name
 * Rules:
 * - 1-30 characters
 * - Only letters, numbers, spaces, hyphens, underscores
 * - Cannot be only whitespace
 */
export function validateTagName(tagName: string): ValidationResult {
  const trimmed = tagName.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Tag name is required',
    };
  }

  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
    return {
      valid: false,
      error: 'Tag name must be between 1 and 30 characters',
    };
  }

  if (!TAG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        'Tag name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { valid: true };
}

/**
 * Normalize a tag name by:
 * - Trimming leading/trailing whitespace
 * - Collapsing multiple spaces into single space
 */
export function normalizeTag(tagName: string): string {
  return tagName
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Validate an array of tags
 * Rules:
 * - Maximum 5 tags
 * - No duplicates
 * - Each tag name must be valid
 * - Duplicates checked after normalization
 */
export function validateTags(tags: string[]): ValidationResult {
  // Check maximum tags limit
  if (tags.length > MAX_TAGS) {
    return {
      valid: false,
      error: 'Maximum 5 tags allowed',
    };
  }

  // Validate each tag and normalize for duplicate checking
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const validation = validateTagName(tag);
    if (!validation.valid) {
      return validation;
    }

    const normalized = normalizeTag(tag);
    normalizedTags.push(normalized);
  }

  // Check for duplicates (case-sensitive after normalization)
  const uniqueTags = new Set(normalizedTags);
  if (uniqueTags.size !== normalizedTags.length) {
    return {
      valid: false,
      error: 'Duplicate tags are not allowed',
    };
  }

  return { valid: true };
}
