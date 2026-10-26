import { describe, expect, it } from 'vitest';
import { approvalNotice } from './approvalNotice';

describe('approvalNotice', () => {
  it('explains a pending account', () => {
    expect(approvalNotice('pending')).toEqual({
      title: 'Your account is waiting for approval',
      body: "You can set up your products now. Shoppers will see them once we've approved your account.",
    });
  });

  it('explains a rejected account', () => {
    expect(approvalNotice('rejected')?.title).toBe("Your account wasn't approved");
  });

  it('shows nothing once approved', () => {
    expect(approvalNotice('approved')).toBeNull();
  });

  it('shows nothing when the status is unknown (before the database change)', () => {
    expect(approvalNotice(undefined)).toBeNull();
    expect(approvalNotice(null)).toBeNull();
  });
});
