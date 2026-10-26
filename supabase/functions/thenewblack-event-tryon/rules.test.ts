import { describe, expect, it } from 'vitest';
import { isEventOpen, resolvePersonPath, resultPath } from './rules';

const SUPA = 'https://abc.supabase.co';
const EVENT = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const own = `${EVENT}/${USER}/person_1.jpg`;

describe('resolvePersonPath', () => {
  it('accepts the caller\'s own bare storage path', () => {
    expect(resolvePersonPath({ person_image_path: own }, EVENT, USER, SUPA)).toBe(own);
  });

  it('accepts the caller\'s own public URL (old app versions)', () => {
    const url = `${SUPA}/storage/v1/object/public/event-user-photos/${own}`;
    expect(resolvePersonPath({ person_image_url: url }, EVENT, USER, SUPA)).toBe(own);
  });

  it('accepts the caller\'s own signed URL', () => {
    const url = `${SUPA}/storage/v1/object/sign/event-user-photos/${own}?token=abc`;
    expect(resolvePersonPath({ person_image_url: url }, EVENT, USER, SUPA)).toBe(own);
  });

  it('rejects another user\'s folder', () => {
    expect(resolvePersonPath({ person_image_path: `${EVENT}/${OTHER}/p.jpg` }, EVENT, USER, SUPA)).toBeNull();
  });

  it('rejects a photo from another event', () => {
    expect(resolvePersonPath({ person_image_path: `${OTHER}/${USER}/p.jpg` }, EVENT, USER, SUPA)).toBeNull();
  });

  it('rejects path traversal', () => {
    expect(resolvePersonPath({ person_image_path: `${EVENT}/${USER}/../${OTHER}/p.jpg` }, EVENT, USER, SUPA)).toBeNull();
  });

  it('rejects URLs from another host', () => {
    const url = `https://evil.example/storage/v1/object/public/event-user-photos/${own}`;
    expect(resolvePersonPath({ person_image_url: url }, EVENT, USER, SUPA)).toBeNull();
  });

  it('rejects URLs for another bucket', () => {
    const url = `${SUPA}/storage/v1/object/public/ai-tryon-uploads/${own}`;
    expect(resolvePersonPath({ person_image_url: url }, EVENT, USER, SUPA)).toBeNull();
  });

  it('returns null when nothing is given', () => {
    expect(resolvePersonPath({}, EVENT, USER, SUPA)).toBeNull();
  });
});

describe('isEventOpen', () => {
  const today = '2026-10-26';
  it('is open when active and today is inside the dates', () => {
    expect(isEventOpen({ status: 'active', event_date: '2026-10-01', end_date: '2026-10-31' }, today)).toBe(true);
  });
  it('is closed after the end date', () => {
    expect(isEventOpen({ status: 'active', event_date: '2026-10-01', end_date: '2026-10-25' }, today)).toBe(false);
  });
  it('is closed before the start date', () => {
    expect(isEventOpen({ status: 'active', event_date: '2026-10-27', end_date: '2026-10-31' }, today)).toBe(false);
  });
  it('is closed when not active', () => {
    expect(isEventOpen({ status: 'draft', event_date: '2026-10-01', end_date: '2026-10-31' }, today)).toBe(false);
  });
  it('treats a single-day event (no end date) as open on that day only', () => {
    expect(isEventOpen({ status: 'active', event_date: today, end_date: null }, today)).toBe(true);
    expect(isEventOpen({ status: 'active', event_date: '2026-10-25', end_date: null }, today)).toBe(false);
  });
});

describe('resultPath', () => {
  it('stores results under event, then user', () => {
    expect(resultPath(EVENT, USER, 'prod-1', 1700000000000)).toBe(`${EVENT}/${USER}/prod-1_1700000000000.png`);
  });
});
