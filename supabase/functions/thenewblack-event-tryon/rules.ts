// Pure rules for the event try-on function (no imports, unit-tested with Vitest).

const PHOTO_BUCKET = 'event-user-photos';

/**
 * Returns the storage path of the caller's own event photo, or null.
 * Accepts a bare path, or a public / signed Storage URL from this project
 * (older app versions send the public URL). The path must sit in
 * `${eventId}/${userId}/` so nobody can try on someone else's photo.
 */
export function resolvePersonPath(
  input: { person_image_path?: string; person_image_url?: string },
  eventId: string,
  userId: string,
  supabaseUrl: string,
): string | null {
  let path = input.person_image_path ?? null;

  if (!path && input.person_image_url) {
    let url: URL;
    try {
      url = new URL(input.person_image_url);
    } catch {
      return null;
    }
    if (url.origin !== new URL(supabaseUrl).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match || match[1] !== PHOTO_BUCKET) return null;
    path = decodeURIComponent(match[2]);
  }

  if (!path) return null;
  if (path.split('/').some((part) => part === '..' || part === '.' || part === '')) return null;
  return path.startsWith(`${eventId}/${userId}/`) ? path : null;
}

/** True when the event is active and today (YYYY-MM-DD) is within its dates. */
export function isEventOpen(
  event: { status: string; event_date: string | null; end_date: string | null },
  todayIso: string,
): boolean {
  if (event.status !== 'active') return false;
  if (event.event_date && todayIso < event.event_date) return false;
  const last = event.end_date ?? event.event_date;
  if (last && todayIso > last) return false;
  return true;
}

/** Where a result image is stored: one folder per event, then per user. */
export function resultPath(eventId: string, userId: string, productId: string, now: number): string {
  return `${eventId}/${userId}/${productId}_${now}.png`;
}
