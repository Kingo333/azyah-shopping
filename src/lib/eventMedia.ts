// Expiring links for private event media (shopper photos and try-on results).
// Older results may be stored as a full provider URL; those pass through.

type SignedUrlRow = { path: string | null; signedUrl: string };
type StorageLike = {
  from(bucket: string): {
    createSignedUrls(paths: string[], expiresIn: number): Promise<{ data: SignedUrlRow[] | null; error: unknown }>;
  };
};

export async function signEventMedia(
  storage: StorageLike,
  bucket: string,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const toSign: string[] = [];

  for (const path of paths) {
    if (!path) continue;
    if (/^https?:\/\//i.test(path)) out[path] = path;
    else toSign.push(path);
  }
  if (toSign.length === 0) return out;

  const { data, error } = await storage.from(bucket).createSignedUrls(toSign, expiresIn);
  if (error || !data) return out;
  for (const row of data) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
