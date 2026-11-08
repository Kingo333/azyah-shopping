// Sales mode: pure helpers for sales-demo-login (shared with the vitest suite).

/** Wrong codes allowed per device (hashed IP) in the window before it is locked out. */
export const MAX_FAILS_PER_IP = 5;
/** Wrong codes allowed from everyone together in the window (stops guessing from many IPs). */
export const MAX_FAILS_TOTAL = 40;
export const WINDOW_MS = 15 * 60 * 1000;
/** How long a sales-mode sign-in is meant to last on the device. */
export const SALES_HOURS = 12;

export interface Attempt {
  ip_hash: string;
  ok: boolean;
  created_at: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares the typed code with the configured one without leaking how much matched. */
export async function codesMatch(typed: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256Hex(typed.trim()), sha256Hex(expected.trim())]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 'locked' when this device or everyone together has too many wrong codes in the last window. */
export function lockState(attempts: Attempt[], ipHash: string, now: number): 'open' | 'locked' {
  const since = now - WINDOW_MS;
  const fails = attempts.filter((a) => !a.ok && Date.parse(a.created_at) >= since);
  if (fails.length >= MAX_FAILS_TOTAL) return 'locked';
  if (fails.filter((a) => a.ip_hash === ipHash).length >= MAX_FAILS_PER_IP) return 'locked';
  return 'open';
}

/** The caller's IP as the edge platform reports it (first X-Forwarded-For hop). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? 'unknown';
}
