// Temporary links for private photos.
// The database keeps each file's permanent address
// (".../storage/v1/object/public/<bucket>/<path>"). For private folders that
// address doesn't open, so the app swaps it for a temporary link when it shows
// the picture. Never save a temporary link: use stableStorageUrl() first.

type SignedUrlRow = { path: string | null; signedUrl: string };
export type StorageLike = {
  from(bucket: string): {
    createSignedUrls(paths: string[], expiresIn: number): Promise<{ data: SignedUrlRow[] | null; error: unknown }>;
  };
};

// Folders that only their owner can open (see the private photos design).
export const PRIVATE_MEDIA_BUCKETS: ReadonlySet<string> = new Set([
  'ai-tryon-uploads',
  'ai-tryon-results',
  'ai-tryon-videos',
  'tnb-video-inputs',
  'search-images',
  'wardrobe',
  'event-user-photos',
  'event-tryon-results',
  'event-tryon-renders',
  'event-photos',
  'live-cam-snapshots',
]);

const STORAGE_URL = /^(https?:\/\/[^/]+)\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i;

function decodeSegments(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');
}

export function parseStorageRef(url: string): { bucket: string; path: string } | null {
  const match = url ? STORAGE_URL.exec(url) : null;
  if (!match) return null;
  return { bucket: match[2], path: decodeSegments(match[3]) };
}

export function stableStorageUrl(url: string): string {
  const match = url ? STORAGE_URL.exec(url) : null;
  if (!match) return url;
  return `${match[1]}/storage/v1/object/public/${match[2]}/${match[3]}`;
}

export async function signPrivateMedia(
  storage: StorageLike,
  urls: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const byBucket = new Map<string, { url: string; path: string }[]>();

  for (const url of urls) {
    if (!url) continue;
    out[url] = url;
    const ref = parseStorageRef(url);
    if (!ref || !PRIVATE_MEDIA_BUCKETS.has(ref.bucket)) continue;
    const list = byBucket.get(ref.bucket) ?? [];
    list.push({ url, path: ref.path });
    byBucket.set(ref.bucket, list);
  }

  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, items]) => {
      const paths = Array.from(new Set(items.map((item) => item.path)));
      try {
        const { data, error } = await storage.from(bucket).createSignedUrls(paths, expiresIn);
        if (error || !data) return;
        const signed = new Map<string, string>();
        for (const row of data) if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
        for (const item of items) {
          const link = signed.get(item.path);
          if (link) out[item.url] = link;
        }
      } catch {
        // keep the original addresses
      }
    }),
  );
  return out;
}
