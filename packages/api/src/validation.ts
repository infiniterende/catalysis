export const PASSWORD_MIN = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (!EMAIL.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Enter your password.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Enter your name.';
  return null;
}

/** Reels may be at most this long. */
export const REEL_MAX_SECONDS = 60;
