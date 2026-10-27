// Storage address helpers for the video function (no imports; Deno and Vitest).
// Logs and saved rows keep the permanent address; temporary links (with a
// token) are only handed to the user and to The New Black.

const STORAGE_URL = /^(https?:\/\/[^/]+)\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i;

export function stableStorageUrl(url: string): string {
  const match = url ? STORAGE_URL.exec(url) : null;
  if (!match) return url;
  return `${match[1]}/storage/v1/object/public/${match[2]}/${match[3]}`;
}

// How long links stay valid (seconds).
export const VIDEO_INPUT_LINK_SECONDS = 86400; // video jobs can run for a while
export const RESULT_LINK_SECONDS = 86400;
