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

export type CleanupResult = { listed: boolean; complete: boolean; removed: number; rounds: number };

// The file list comes back at most ~1000 rows at a time, so list, remove,
// and repeat until nothing is left. Stops when a round removes nothing (files
// that can't be removed would otherwise loop forever) or after `maxRounds`.
// `list` returns null when it can't be read.
export async function removeAllUserFiles(
  list: () => Promise<StoredFile[] | null>,
  remove: (bucket: string, paths: string[]) => Promise<boolean>,
  maxRounds = 20,
): Promise<CleanupResult> {
  let removed = 0;
  for (let round = 1; round <= maxRounds; round++) {
    const files = await list();
    if (files === null) return { listed: round > 1, complete: false, removed, rounds: round };
    if (files.length === 0) return { listed: true, complete: true, removed, rounds: round };

    let removedThisRound = 0;
    for (const batch of planStorageRemoval(files)) {
      if (await remove(batch.bucket, batch.paths)) removedThisRound += batch.paths.length;
    }
    removed += removedThisRound;
    if (removedThisRound === 0) return { listed: true, complete: false, removed, rounds: round };
  }
  return { listed: true, complete: false, removed, rounds: maxRounds };
}
