// Storage address helpers for the try-on functions (no imports; Deno and Vitest).
// The same file is copied into thenewblack-picture and thenewblack-picture-free
// (a test keeps the copies identical).
// Logs and saved rows keep the permanent address; temporary links (with a
// token) are only handed to the user and to The New Black.

const STORAGE_URL = /^(https?:\/\/[^/]+)\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i;

// Folders that only their owner can open.
const PRIVATE_BUCKETS = new Set([
  'ai-tryon-uploads',
  'ai-tryon-results',
  'ai-tryon-videos',
  'tnb-video-inputs',
  'search-images',
  'wardrobe',
]);

// How long links stay valid (seconds).
export const PICTURE_INPUT_LINK_SECONDS = 3600;
export const VIDEO_INPUT_LINK_SECONDS = 86400; // video jobs can run for a while
export const RESULT_LINK_SECONDS = 86400;

export function stableStorageUrl(url: string): string {
  const match = url ? STORAGE_URL.exec(url) : null;
  if (!match) return url;
  return `${match[1]}/storage/v1/object/public/${match[2]}/${match[3]}`;
}

function decodeSegments(path: string): string {
  return path.split('/').map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }).join('/');
}

// The caller's own file in a private folder (first folder = their user id).
export function ownPrivateRef(url: string, userId: string): { bucket: string; path: string } | null {
  const match = url && userId ? STORAGE_URL.exec(url) : null;
  if (!match || !PRIVATE_BUCKETS.has(match[2])) return null;
  const path = decodeSegments(match[3]);
  return path.split('/')[0] === userId ? { bucket: match[2], path } : null;
}

type SigningClient = {
  storage: {
    from(bucket: string): {
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

// Older app versions send the permanent address (which no longer opens once
// the folder is private) or a temporary link that may have expired. For the
// caller's own photo, make a fresh temporary link with the server key; any
// other address is returned unchanged (someone else's photo is never signed).
export async function freshOwnLink(url: string, userId: string, client: SigningClient, expiresIn: number): Promise<string> {
  const ref = ownPrivateRef(url, userId);
  if (!ref) return url;
  try {
    const { data } = await client.storage.from(ref.bucket).createSignedUrl(ref.path, expiresIn);
    return data?.signedUrl || url;
  } catch {
    return url;
  }
}
