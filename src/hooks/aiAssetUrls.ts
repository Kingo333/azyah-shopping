// AI Studio gallery: save permanent addresses, show temporary links.
import { stableStorageUrl } from '@/lib/privateMedia';
import type { AiAsset } from './useAiAssets';

export function assetUrlForStorage(url: string): string {
  return stableStorageUrl(url);
}

export async function withDisplayUrls(
  assets: AiAsset[],
  sign: (urls: string[]) => Promise<Record<string, string>>,
): Promise<AiAsset[]> {
  let links: Record<string, string> = {};
  try {
    links = await sign(assets.map((a) => a.asset_url).filter(Boolean));
  } catch {
    return assets;
  }
  return assets.map((a) => (links[a.asset_url] ? { ...a, asset_url: links[a.asset_url] } : a));
}
