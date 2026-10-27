// Expiring links for private event media (shopper photos and try-on results).
// Older results may be stored as a full address: our own private folders get a
// temporary link too (see privateMedia.ts); any other address passes through.
import { signPrivateMedia, type StorageLike } from './privateMedia';

export async function signEventMedia(
  storage: StorageLike,
  bucket: string,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const toSign: string[] = [];
  const fullAddresses: string[] = [];

  for (const path of paths) {
    if (!path) continue;
    if (/^https?:\/\//i.test(path)) fullAddresses.push(path);
    else toSign.push(path);
  }

  if (fullAddresses.length > 0) Object.assign(out, await signPrivateMedia(storage, fullAddresses, expiresIn));
  if (toSign.length === 0) return out;

  const { data, error } = await storage.from(bucket).createSignedUrls(toSign, expiresIn);
  if (error || !data) return out;
  for (const row of data) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
