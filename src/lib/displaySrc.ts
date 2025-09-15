// Display source logic with URL-specific optimizations
import { isAsosUrl } from './urlGuards';
import { upgradeAsosImageUrl, buildAsosSrcSet } from '../utils/asosImageUtils';

export function displaySrc(u: string): string {
  if (isAsosUrl(u)) return upgradeAsosImageUrl(u, 800);
  return u; // leave Supabase + others alone
}

export function displaySrcSet(u: string): string | undefined {
  if (isAsosUrl(u)) return buildAsosSrcSet(u);
  return undefined; // no srcset for Supabase
}