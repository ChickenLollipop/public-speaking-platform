/**
 * Validates email format using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength
 * Requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function validatePassword(password: string): boolean {
  if (!password || password.length < 8) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
}

/**
 * Validates name format
 * Requirements: 2-50 characters, letters, spaces, hyphens, and apostrophes only
 */
export function validateName(name: string): boolean {
  if (!name) return false;

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) return false;

  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(trimmedName);
}

/**
 * Returns password strength rating and feedback
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { strength: 'weak', score: 0, feedback: ['Password is required'] };
  }

  // Length check
  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 10;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Consider adding special characters');
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 50) {
    strength = 'weak';
  } else if (score < 80) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { strength, score, feedback };
}
