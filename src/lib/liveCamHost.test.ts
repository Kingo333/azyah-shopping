import { describe, expect, it } from 'vitest';
import { isLiveActive, keepMounted, liveBadge } from './liveCamHost';

describe('isLiveActive', () => {
  it('is true while it starts, warms up or runs', () => {
    for (const s of ['starting', 'warming', 'running'] as const) expect(isLiveActive(s)).toBe(true);
  });
  it('is false otherwise', () => {
    for (const s of ['idle', 'ended', 'failed'] as const) expect(isLiveActive(s)).toBe(false);
  });
});

describe('keepMounted', () => {
  it('stays mounted while it is on screen', () => {
    expect(keepMounted(true, 'idle')).toBe(true);
  });
  it('stays mounted off screen only while it starts or runs', () => {
    expect(keepMounted(false, 'warming')).toBe(true);
    expect(keepMounted(false, 'running')).toBe(true);
    expect(keepMounted(false, 'idle')).toBe(false);
    expect(keepMounted(false, 'ended')).toBe(false);
    expect(keepMounted(false, 'failed')).toBe(false);
  });
});

describe('liveBadge', () => {
  it('shows loading while it starts, ready while it runs', () => {
    expect(liveBadge('starting')).toBe('loading');
    expect(liveBadge('warming')).toBe('loading');
    expect(liveBadge('running')).toBe('ready');
  });
  it('shows nothing when it is off', () => {
    for (const s of ['idle', 'ended', 'failed'] as const) expect(liveBadge(s)).toBeNull();
  });
});
