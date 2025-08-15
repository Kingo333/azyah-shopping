
import { z } from "zod";

// Common weak passwords to block
const WEAK_PASSWORDS = [
  "password", "123456", "qwerty", "letmein", "111111", "abc123",
  "password123", "admin", "welcome", "monkey", "1234567", "password1"
];

// Check if password meets strength requirements
export const checkPasswordStrength = (email: string, password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    notCommon: !WEAK_PASSWORDS.includes(password.toLowerCase())
  };

  const characterTypes = [
    checks.hasLowercase,
    checks.hasUppercase, 
    checks.hasNumber,
    checks.hasSymbol
  ].filter(Boolean).length;

  const hasThreeTypes = characterTypes >= 3;

  return {
    ...checks,
    hasThreeTypes,
    isValid: checks.minLength && hasThreeTypes && checks.notCommon,
    score: Object.values(checks).filter(Boolean).length
  };
};

// Zod schema for credential validation
export const CredentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
}).refine(({ email, password }) => {
  const strength = checkPasswordStrength(email, password);
  return strength.isValid;
}, {
  message: "Password must be 8+ characters and include at least 3 of: lowercase, uppercase, numbers, symbols. Avoid common passwords.",
  path: ["password"]
});

export type PasswordStrength = ReturnType<typeof checkPasswordStrength>;
