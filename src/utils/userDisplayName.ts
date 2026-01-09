/**
 * Centralized user display name utilities
 * Use these everywhere instead of inline fallback logic
 * 
 * Priority: name (Display Name) > username (Style Handle) > fallback
 */

interface UserLike {
  name?: string | null;
  username?: string | null;
}

/**
 * Get the display name for a user, with proper fallback chain
 * Priority: name > username > fallback
 */
export const getDisplayName = (
  user: UserLike | null | undefined,
  fallback: string = 'Azyah user'
): string => {
  if (!user) return fallback;
  return user.name || user.username || fallback;
};

/**
 * Get the first initial of a user's display name for avatars
 */
export const getDisplayNameInitial = (
  user: UserLike | null | undefined
): string => {
  return getDisplayName(user, 'A').charAt(0).toUpperCase();
};

/**
 * Format a username as a handle (with @ prefix)
 * Returns empty string if no username
 */
export const getHandleDisplay = (
  username: string | null | undefined
): string => {
  return username ? `@${username}` : '';
};

/**
 * Get username for URL construction (without @)
 */
export const getHandleForUrl = (
  user: UserLike | null | undefined
): string => {
  return user?.username || '';
};
