// Account deletion: turn the list of a user's stored files into removal
// batches (one folder per batch, at most `batchSize` files). No imports, so it
// runs in Deno and in Vitest.

export type StoredFile = { bucket_id: string; name: string };
export type RemovalBatch = { bucket: string; paths: string[] };

export function planStorageRemoval(files: StoredFile[], batchSize = 100): RemovalBatch[] {
  const byBucket = new Map<string, string[]>();
  for (const file of files) {
    if (!file?.bucket_id || !file?.name) continue;
    const paths = byBucket.get(file.bucket_id) ?? [];
    if (!paths.includes(file.name)) paths.push(file.name);
    byBucket.set(file.bucket_id, paths);
  }

  const batches: RemovalBatch[] = [];
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += batchSize) {
      batches.push({ bucket, paths: paths.slice(i, i + batchSize) });
    }
  }
  return batches;
}
