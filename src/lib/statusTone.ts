// Design v3 status colors (spec 4.1, B7): ok = live/approved, wait = pending,
// bad = rejected, everything else neutral. The words always come from the
// caller (e.g. productStatusLabel), so status is never color-only.

export type StatusTone = 'ok' | 'wait' | 'bad' | 'neutral';

const OK = new Set(['active', 'approved', 'published', 'live']);
const WAIT = new Set(['draft', 'pending', 'pending_review']);
const BAD = new Set(['rejected', 'declined']);

export function statusTone(status: string): StatusTone {
  if (OK.has(status)) return 'ok';
  if (WAIT.has(status)) return 'wait';
  if (BAD.has(status)) return 'bad';
  return 'neutral';
}
