export interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { label: "One number (0–9)", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Returns the first unmet requirement's message, or null if all pass. */
export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return `Password must include: ${rule.label.toLowerCase()}.`;
    }
  }
  return null;
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
