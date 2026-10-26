import { lazy, type ComponentType } from 'react';

// Pages load on demand. After a new deploy, an open tab may ask for a chunk
// that no longer exists; reload once to pick up the new version instead of
// showing a blank screen. A second failure shows the error.

const RELOAD_KEY = 'azyah:chunk-reload';

type Deps = {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  reload: () => void;
};

export async function loadWithReloadOnce<T>(factory: () => Promise<T>, deps: Deps): Promise<T> {
  try {
    const mod = await factory();
    try { deps.storage?.removeItem(RELOAD_KEY); } catch { /* storage blocked */ }
    return mod;
  } catch (error) {
    let alreadyReloaded = false;
    try { alreadyReloaded = deps.storage?.getItem(RELOAD_KEY) === '1'; } catch { alreadyReloaded = true; }
    if (alreadyReloaded) throw error;
    try { deps.storage?.setItem(RELOAD_KEY, '1'); } catch { /* storage blocked */ }
    deps.reload();
    return new Promise<T>(() => {}); // the page is reloading
  }
}

function browserDeps(): Deps {
  let storage: Deps['storage'] = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  return { storage, reload: () => window.location.reload() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => loadWithReloadOnce(factory, browserDeps()));
}
