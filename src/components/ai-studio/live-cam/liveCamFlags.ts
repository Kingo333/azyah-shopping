// Benchmark switch (review R3): `?livecam_legacy=1` in the URL, or localStorage
// "azyah.livecam.legacy" = "1", turns off the Gemini-details instruction and the
// garment photo clean-up, so a before/after test can run in one session.

export function isLiveCamLegacy(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  try {
    if (search && new URLSearchParams(search).get('livecam_legacy') === '1') return true;
    return storage?.getItem('azyah.livecam.legacy') === '1';
  } catch {
    return false;
  }
}
