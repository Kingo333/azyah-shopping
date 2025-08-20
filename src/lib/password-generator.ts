/**
 * Generate a secure password with customizable options
 */
export interface PasswordOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilar?: boolean;
}

const DEFAULT_OPTIONS: Required<PasswordOptions> = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilar: true,
};

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Characters that look similar and might be confusing
const SIMILAR_CHARS = 'il1Lo0O';

export function generateSecurePassword(options: PasswordOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let charset = '';
  let requiredChars = '';
  
  if (opts.includeLowercase) {
    const chars = opts.excludeSimilar 
      ? LOWERCASE.split('').filter(char => !SIMILAR_CHARS.includes(char)).join('')
      : LOWERCASE;
    charset += chars;
    requiredChars += chars[Math.floor(Math.random() * chars.length)];
  }
  
  if (opts.includeUppercase) {
    const chars = opts.excludeSimilar 
      ? UPPERCASE.split('').filter(char => !SIMILAR_CHARS.includes(char)).join('')
      : UPPERCASE;
    charset += chars;
    requiredChars += chars[Math.floor(Math.random() * chars.length)];
  }
  
  if (opts.includeNumbers) {
    const chars = opts.excludeSimilar 
      ? NUMBERS.split('').filter(char => !SIMILAR_CHARS.includes(char)).join('')
      : NUMBERS;
    charset += chars;
    requiredChars += chars[Math.floor(Math.random() * chars.length)];
  }
  
  if (opts.includeSymbols) {
    charset += SYMBOLS;
    requiredChars += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }
  
  if (charset.length === 0) {
    throw new Error('At least one character type must be included');
  }
  
  // Generate remaining characters
  const remainingLength = opts.length - requiredChars.length;
  let password = requiredChars;
  
  for (let i = 0; i < remainingLength; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Generate multiple password suggestions
 */
export function generatePasswordSuggestions(count: number = 3, options: PasswordOptions = {}): string[] {
  const suggestions: string[] = [];
  const baseOptions = { ...DEFAULT_OPTIONS, ...options };
  
  for (let i = 0; i < count; i++) {
    // Vary the length slightly for different options
    const lengthVariation = i === 0 ? 0 : (i === 1 ? 2 : -2);
    const opts = { ...baseOptions, length: Math.max(12, baseOptions.length + lengthVariation) };
    suggestions.push(generateSecurePassword(opts));
  }
  
  return suggestions;
}