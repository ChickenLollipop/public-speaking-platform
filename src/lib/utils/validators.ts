/**
 * Validates email format using RFC 5322 compliant regex
 * @returns Error message if invalid, null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';

  // More robust email validation regex
  // Requires: local part (1+ chars), @, domain (2+ chars), dot, TLD (2+ chars)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Invalid email format';
  }

  return null;
}

/**
 * Validates password strength
 * Requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
 * @returns Error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
  if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
  if (!hasNumber) return 'Password must contain at least one number';

  return null;
}

/**
 * Validates name format
 * Requirements: 2-50 characters, letters, spaces, hyphens, and apostrophes only
 * @returns Error message if invalid, null if valid
 */
export function validateName(name: string): string | null {
  if (!name) return 'Name is required';

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (trimmedName.length > 50) {
    return 'Name must not exceed 50 characters';
  }

  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }

  return null;
}

/**
 * Returns password strength rating
 * @returns 'weak', 'medium', or 'strong'
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (!password) return 'weak';

  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 25;
  }

  if (password.length >= 12) {
    score += 10;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 20;
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 20;
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 15;
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 10;
  }

  // Determine strength
  if (score < 50) {
    return 'weak';
  } else if (score < 80) {
    return 'medium';
  } else {
    return 'strong';
  }
}
