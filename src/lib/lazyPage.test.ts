import { describe, expect, it, vi } from 'vitest';
import { loadWithReloadOnce } from './lazyPage';

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
}

describe('loadWithReloadOnce', () => {
  it('returns the module when it loads', async () => {
    const mod = { default: 'Page' };
    const storage = memoryStorage();
    expect(await loadWithReloadOnce(() => Promise.resolve(mod), { storage, reload: vi.fn() })).toBe(mod);
  });

  it('clears the reload marker after a successful load', async () => {
    const storage = memoryStorage();
    storage.setItem('azyah:chunk-reload', '1');
    await loadWithReloadOnce(() => Promise.resolve({ default: 'Page' }), { storage, reload: vi.fn() });
    expect(storage.getItem('azyah:chunk-reload')).toBeNull();
  });

  it('reloads the page once when a chunk fails (e.g. after a deploy)', async () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    const pending = loadWithReloadOnce(() => Promise.reject(new Error('Failed to fetch dynamically imported module')), { storage, reload });
    // The promise never settles because the page is reloading.
    await Promise.race([pending, new Promise((r) => setTimeout(r, 10))]);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem('azyah:chunk-reload')).toBe('1');
  });

  it('gives up and shows the error if it already reloaded once', async () => {
    const storage = memoryStorage();
    storage.setItem('azyah:chunk-reload', '1');
    const reload = vi.fn();
    await expect(loadWithReloadOnce(() => Promise.reject(new Error('boom')), { storage, reload })).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });
});
