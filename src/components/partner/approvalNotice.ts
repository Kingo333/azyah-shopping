export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/** What to tell a brand or retailer about its approval, or null to show nothing. */
export function approvalNotice(
  status: VerificationStatus | string | null | undefined,
): { title: string; body: string } | null {
  if (status === 'pending') {
    return {
      title: 'Your account is waiting for approval',
      body: "You can set up your products now. Shoppers will see them once we've approved your account.",
    };
  }
  if (status === 'rejected') {
    return {
      title: "Your account wasn't approved",
      body: "Shoppers can't see your products. Contact us if you think this is a mistake.",
    };
  }
  return null;
}
